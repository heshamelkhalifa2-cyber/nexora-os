import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WarehousesService } from '../warehouses/warehouses.service';

@Injectable()
export class ProductsService {
  constructor(private db: DbService, private warehousesService: WarehousesService) {}

  // القائمة بترجع إجمالي المخزون (SUM عبر كل المواقع) — التفاصيل لكل موقع عبر findStockBreakdown
  async findAll(tenantId: string, page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [tenantId];
    let where = 'WHERE p.tenant_id = $1';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND p.name ILIKE $${params.length}`;
    }

    const countRes = await this.db.query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = Number(countRes.rows[0].count);

    params.push(limit, offset);
    const res = await this.db.query(
      `SELECT p.*, COALESCE(SUM(ps.quantity), 0) AS total_stock
       FROM products p
       LEFT JOIN product_stock ps ON ps.product_id = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { data: res.rows, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  // تفاصيل المخزون لمنتج واحد مقسّمة حسب كل موقع
  async findStockBreakdown(tenantId: string, productId: string) {
    const product = await this.db.query('SELECT id FROM products WHERE id = $1 AND tenant_id = $2', [
      productId,
      tenantId,
    ]);
    if (product.rowCount === 0) throw new NotFoundException('المنتج غير موجود');

    const res = await this.db.query(
      `SELECT w.id AS warehouse_id, w.name AS warehouse_name, w.type AS warehouse_type,
              COALESCE(ps.quantity, 0) AS quantity
       FROM warehouses w
       LEFT JOIN product_stock ps ON ps.warehouse_id = w.id AND ps.product_id = $1
       WHERE w.tenant_id = $2
       ORDER BY w.created_at ASC`,
      [productId, tenantId],
    );
    return res.rows;
  }

  async create(
    tenantId: string,
    createdByUserId: string,
    name: string,
    price: number,
    initialStock?: number,
    warehouseId?: string,
    nameEn?: string,
  ) {
    if (initialStock && initialStock > 0 && !warehouseId) {
      throw new BadRequestException('لازم تحدد الموقع (warehouse_id) لو حددت مخزون ابتدائي');
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      const productRes = await client.query(
        `INSERT INTO products (tenant_id, name, name_en, price) VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, name, nameEn || name, price],
      );
      const product = productRes.rows[0];

      if (warehouseId && initialStock && initialStock > 0) {
        const warehouseCheck = await client.query(
          'SELECT id FROM warehouses WHERE id = $1 AND tenant_id = $2',
          [warehouseId, tenantId],
        );
        if (warehouseCheck.rowCount === 0) throw new BadRequestException('الموقع المحدد غير موجود');

        await client.query(
          `INSERT INTO product_stock (tenant_id, product_id, warehouse_id, quantity) VALUES ($1, $2, $3, $4)`,
          [tenantId, product.id, warehouseId, initialStock],
        );
        await this.warehousesService.logLedgerEntry(client, {
          tenantId,
          productId: product.id,
          warehouseId,
          changeQuantity: initialStock,
          balanceAfter: initialStock,
          reason: 'initial',
          createdBy: createdByUserId,
        });
      }

      await client.query('COMMIT');
      return { ...product, total_stock: initialStock || 0 };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // تعديل مخزون منتج في موقع محدد لرقم نهائي (Absolute) — بيسجّل الفرق بالـ Ledger كـ adjustment
  async updateStock(
    tenantId: string,
    createdByUserId: string,
    productId: string,
    warehouseId: string,
    newQuantity: number,
  ) {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
        [productId, tenantId],
      );
      if (productCheck.rowCount === 0) throw new NotFoundException('المنتج غير موجود');

      const warehouseCheck = await client.query(
        'SELECT id FROM warehouses WHERE id = $1 AND tenant_id = $2',
        [warehouseId, tenantId],
      );
      if (warehouseCheck.rowCount === 0) throw new NotFoundException('الموقع غير موجود');

      const existing = await client.query(
        'SELECT quantity FROM product_stock WHERE product_id = $1 AND warehouse_id = $2 FOR UPDATE',
        [productId, warehouseId],
      );
      const oldQuantity = existing.rowCount ? existing.rows[0].quantity : 0;
      const changeQuantity = newQuantity - oldQuantity;

      await client.query(
        `INSERT INTO product_stock (tenant_id, product_id, warehouse_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET quantity = $4, updated_at = now()`,
        [tenantId, productId, warehouseId, newQuantity],
      );

      if (changeQuantity !== 0) {
        await this.warehousesService.logLedgerEntry(client, {
          tenantId,
          productId,
          warehouseId,
          changeQuantity,
          balanceAfter: newQuantity,
          reason: 'adjustment',
          createdBy: createdByUserId,
        });
      }

      await client.query('COMMIT');
      return { product_id: productId, warehouse_id: warehouseId, quantity: newQuantity };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // نقل كمية من موقع لموقع تاني — عملية ذرّية (الاتنين ينجحوا مع بعض أو يفشلوا مع بعض)
  async transferStock(
    tenantId: string,
    createdByUserId: string,
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
  ) {
    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('موقع المصدر والوجهة لا يمكن أن يكونا نفس الموقع');
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
        [productId, tenantId],
      );
      if (productCheck.rowCount === 0) throw new NotFoundException('المنتج غير موجود');

      // خصم من المصدر — بشرط وجود رصيد كافٍ
      const fromRes = await client.query(
        `UPDATE product_stock SET quantity = quantity - $1, updated_at = now()
         WHERE product_id = $2 AND warehouse_id = $3 AND quantity >= $1
         RETURNING quantity`,
        [quantity, productId, fromWarehouseId],
      );
      if (fromRes.rowCount === 0) {
        throw new BadRequestException('لا يوجد رصيد كافٍ في موقع المصدر لإتمام النقل');
      }
      await this.warehousesService.logLedgerEntry(client, {
        tenantId,
        productId,
        warehouseId: fromWarehouseId,
        changeQuantity: -quantity,
        balanceAfter: fromRes.rows[0].quantity,
        reason: 'transfer_out',
        createdBy: createdByUserId,
      });

      // إضافة للوجهة (upsert لو أول مرة يوصلها المنتج ده)
      const toRes = await client.query(
        `INSERT INTO product_stock (tenant_id, product_id, warehouse_id, quantity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET quantity = product_stock.quantity + $4, updated_at = now()
         RETURNING quantity`,
        [tenantId, productId, toWarehouseId, quantity],
      );
      await this.warehousesService.logLedgerEntry(client, {
        tenantId,
        productId,
        warehouseId: toWarehouseId,
        changeQuantity: quantity,
        balanceAfter: toRes.rows[0].quantity,
        reason: 'transfer_in',
        createdBy: createdByUserId,
      });

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
