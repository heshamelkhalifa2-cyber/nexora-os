import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { assertTransitionAllowed, OrderStatus } from './order-status';

interface OrderItemInput {
  product_id: string;
  quantity: number;
}

interface ListFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
}

@Injectable()
export class OrdersService {
  constructor(private db: DbService, private warehousesService: WarehousesService) {}

  async findAll(tenantId: string, filters: ListFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [tenantId];
    let where = 'WHERE tenant_id = $1';

    if (filters.status) {
      params.push(filters.status);
      where += ` AND status = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      where += ` AND customer_name ILIKE $${params.length}`;
    }
    if (filters.from_date) {
      params.push(filters.from_date);
      where += ` AND created_at >= $${params.length}`;
    }
    if (filters.to_date) {
      params.push(filters.to_date);
      where += ` AND created_at <= $${params.length}`;
    }

    const countRes = await this.db.query(`SELECT COUNT(*) FROM orders ${where}`, params);
    const total = Number(countRes.rows[0].count);

    params.push(limit, offset);
    const res = await this.db.query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { data: res.rows, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, orderId: string) {
    const order = await this.db.query('SELECT * FROM orders WHERE id = $1 AND tenant_id = $2', [
      orderId,
      tenantId,
    ]);
    if (order.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    const items = await this.db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    return { ...order.rows[0], items: items.rows };
  }

  // === 1. Customer Order === (warehouse_id = من وين هيتنفذ الطلب، لازم يتحدد وقت الإنشاء)
  async createOrder(
    tenantId: string,
    createdByUserId: string,
    customerName: string,
    warehouseId: string,
    items: OrderItemInput[],
    customerPhone?: string,
    customerAddress?: string,
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('الطلب يجب أن يحتوي منتجًا واحدًا على الأقل');
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      const warehouseCheck = await client.query(
        'SELECT id FROM warehouses WHERE id = $1 AND tenant_id = $2',
        [warehouseId, tenantId],
      );
      if (warehouseCheck.rowCount === 0) {
        throw new BadRequestException('موقع التنفيذ المحدد غير موجود');
      }

      let total = 0;
      const resolvedItems: any[] = [];

      for (const item of items) {
        const productRes = await client.query(
          'SELECT * FROM products WHERE id = $1 AND tenant_id = $2',
          [item.product_id, tenantId],
        );
        if (productRes.rowCount === 0) {
          throw new BadRequestException(`المنتج ${item.product_id} غير موجود`);
        }
        const product = productRes.rows[0];
        const lineTotal = Number(product.price) * item.quantity;
        total += lineTotal;
        resolvedItems.push({
          product_id: product.id,
          name: product.name,
          nameEn: product.name_en || product.name,
          quantity: item.quantity,
          unit_price: product.price,
        });
      }

      const orderRes = await client.query(
        `INSERT INTO orders (tenant_id, customer_name, customer_phone, customer_address, status, total, created_by, warehouse_id)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) RETURNING *`,
        [tenantId, customerName, customerPhone || null, customerAddress || null, total, createdByUserId, warehouseId],
      );
      const order = orderRes.rows[0];

      for (const ri of resolvedItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name_snapshot, product_name_snapshot_en, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, ri.product_id, ri.name, ri.nameEn, ri.quantity, ri.unit_price],
        );
      }

      await client.query('COMMIT');
      return this.findOne(tenantId, order.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // === 2. Payment + 3. Inventory (خطوة واحدة ذرّية) — الخصم من موقع التنفيذ المحدد بالطلب فقط ===
  async pay(tenantId: string, createdByUserId: string, orderId: string, paymentMethod: 'cash' | 'paid') {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [orderId, tenantId],
      );
      if (orderRes.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
      const order = orderRes.rows[0];
      assertTransitionAllowed(order.status as OrderStatus, 'confirmed');

      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

      // محاولة خصم المخزون من موقع التنفيذ المحدد فقط — لو الموقع ده تحديدًا ما عندهوش رصيد كافٍ، الطلب يفشل
      // (حتى لو موقع تاني عنده رصيد — القاعدة الأصلية بتربط الطلب بموقع تنفيذ واحد محدد)
      for (const item of itemsRes.rows) {
        const stockRes = await client.query(
          `UPDATE product_stock SET quantity = quantity - $1, updated_at = now()
           WHERE product_id = $2 AND warehouse_id = $3 AND quantity >= $1
           RETURNING quantity`,
          [item.quantity, item.product_id, order.warehouse_id],
        );
        if (stockRes.rowCount === 0) {
          await client.query(
            `UPDATE orders SET status = 'inventory_failed', updated_at = now() WHERE id = $1`,
            [orderId],
          );
          await client.query('COMMIT');
          throw new BadRequestException(
            `لا يوجد مخزون كافٍ للمنتج "${item.product_name_snapshot}" في موقع التنفيذ المحدد — تم إلغاء الطلب`,
          );
        }
        await this.warehousesService.logLedgerEntry(client, {
          tenantId,
          productId: item.product_id,
          warehouseId: order.warehouse_id,
          changeQuantity: -item.quantity,
          balanceAfter: stockRes.rows[0].quantity,
          reason: 'sale',
          referenceType: 'order',
          referenceId: orderId,
          createdBy: createdByUserId,
        });
      }

      const updated = await client.query(
        `UPDATE orders SET status = 'confirmed', payment_method = $1, updated_at = now()
         WHERE id = $2 RETURNING *`,
        [paymentMethod, orderId],
      );

      await client.query('COMMIT');
      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // === Picking: بدء التجهيز ===
  async startPicking(tenantId: string, orderId: string, pickerId: string) {
    const order = await this.db.query('SELECT * FROM orders WHERE id = $1 AND tenant_id = $2', [
      orderId,
      tenantId,
    ]);
    if (order.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    assertTransitionAllowed(order.rows[0].status as OrderStatus, 'picking_started');

    const updated = await this.db.query(
      `UPDATE orders SET status = 'picking_started', picker_id = $1, picking_started_at = now(), updated_at = now()
       WHERE id = $2 RETURNING *`,
      [pickerId, orderId],
    );
    return updated.rows[0];
  }

  // === Packing: إنهاء التجهيز (Scan إلزامي — هذا الاستدعاء نفسه يمثّل الـ Scan) ===
  // القاعدة الصارمة: لا يمكن الوصول لهذه الحالة إلا من picking_started (مفروضة عبر state machine)،
  // وبالتالي لا يمكن تجاوزها للانتقال لـ out_for_delivery بدون المرور من هنا أولًا.
  async completePacking(tenantId: string, orderId: string, packerId: string) {
    const order = await this.db.query('SELECT * FROM orders WHERE id = $1 AND tenant_id = $2', [
      orderId,
      tenantId,
    ]);
    if (order.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    assertTransitionAllowed(order.rows[0].status as OrderStatus, 'packed');

    const updated = await this.db.query(
      `UPDATE orders SET status = 'packed', packer_id = $1, packed_at = now(), updated_at = now()
       WHERE id = $2 RETURNING *`,
      [packerId, orderId],
    );
    return updated.rows[0];
  }

  // === 4. Delivery: تعيين سائق === (لازم يكون الطلب "packed" أولًا — قاعدة صارمة)
  async assignDriver(tenantId: string, orderId: string, driverId: string) {
    const order = await this.db.query('SELECT * FROM orders WHERE id = $1 AND tenant_id = $2', [
      orderId,
      tenantId,
    ]);
    if (order.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    assertTransitionAllowed(order.rows[0].status as OrderStatus, 'out_for_delivery');

    const driver = await this.db.query('SELECT * FROM drivers WHERE id = $1 AND tenant_id = $2', [
      driverId,
      tenantId,
    ]);
    if (driver.rowCount === 0) throw new NotFoundException('السائق غير موجود');
    if (driver.rows[0].status !== 'available') {
      throw new BadRequestException('هذا السائق غير متاح حاليًا');
    }

    await this.db.query(`UPDATE drivers SET status = 'busy' WHERE id = $1`, [driverId]);
    const updated = await this.db.query(
      `UPDATE orders SET status = 'out_for_delivery', driver_id = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [driverId, orderId],
    );
    return updated.rows[0];
  }

  // === 5. Completion ===
  async markDelivered(tenantId: string, orderId: string, requestingDriverUserId?: string) {
    const order = await this.db.query('SELECT * FROM orders WHERE id = $1 AND tenant_id = $2', [
      orderId,
      tenantId,
    ]);
    if (order.rowCount === 0) throw new NotFoundException('الطلب غير موجود');
    assertTransitionAllowed(order.rows[0].status as OrderStatus, 'delivered');

    if (requestingDriverUserId) {
      const driverRes = await this.db.query(
        'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [order.rows[0].driver_id, tenantId, requestingDriverUserId],
      );
      if (driverRes.rowCount === 0) {
        throw new ForbiddenException('لا يمكنك تسليم طلب غير معيّن لك');
      }
    }

    if (order.rows[0].driver_id) {
      await this.db.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [
        order.rows[0].driver_id,
      ]);
    }
    const updated = await this.db.query(
      `UPDATE orders SET status = 'delivered', updated_at = now() WHERE id = $1 RETURNING *`,
      [orderId],
    );
    return updated.rows[0];
  }
}
