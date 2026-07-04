import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class WarehousesService {
  constructor(private db: DbService) {}

  async findAll(tenantId: string) {
    const res = await this.db.query(
      'SELECT * FROM warehouses WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId],
    );
    return res.rows;
  }

  async create(tenantId: string, name: string, type: string) {
    const res = await this.db.query(
      `INSERT INTO warehouses (tenant_id, name, type) VALUES ($1, $2, $3) RETURNING *`,
      [tenantId, name, type],
    );
    return res.rows[0];
  }

  // دالة مشتركة يستخدمها Products و Orders لتسجيل أي حركة مخزون — تُستدعى دائمًا جوا نفس الـ transaction
  // بتاع العملية الأصلية (client بدل this.db) عشان تفشل مع فشل العملية لو حصل خطأ
  async logLedgerEntry(
    client: any,
    params: {
      tenantId: string;
      productId: string;
      warehouseId: string;
      changeQuantity: number;
      balanceAfter: number;
      reason: 'initial' | 'adjustment' | 'sale' | 'transfer_in' | 'transfer_out';
      referenceType?: string;
      referenceId?: string;
      createdBy?: string;
    },
  ) {
    await client.query(
      `INSERT INTO stock_ledger
        (tenant_id, product_id, warehouse_id, change_quantity, balance_after, reason, reference_type, reference_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.tenantId,
        params.productId,
        params.warehouseId,
        params.changeQuantity,
        params.balanceAfter,
        params.reason,
        params.referenceType || null,
        params.referenceId || null,
        params.createdBy || null,
      ],
    );
  }
}
