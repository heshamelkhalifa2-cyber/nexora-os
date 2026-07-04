import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class SettingsService {
  constructor(private db: DbService) {}

  async get(tenantId: string) {
    const res = await this.db.query('SELECT * FROM tenant_settings WHERE tenant_id = $1', [tenantId]);
    if (res.rowCount === 0) {
      // fallback دفاعي — لو الشركة اتعملت قبل ما جدول الإعدادات يتضاف
      const created = await this.db.query(
        'INSERT INTO tenant_settings (tenant_id) VALUES ($1) RETURNING *',
        [tenantId],
      );
      return created.rows[0];
    }
    return res.rows[0];
  }

  async update(tenantId: string, updates: Record<string, any>) {
    const fields = Object.keys(updates).filter((k) => updates[k] !== undefined);
    if (fields.length === 0) return this.get(tenantId);

    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => updates[f]);

    const res = await this.db.query(
      `UPDATE tenant_settings SET ${setClauses}, updated_at = now() WHERE tenant_id = $1 RETURNING *`,
      [tenantId, ...values],
    );
    return res.rows[0];
  }
}
