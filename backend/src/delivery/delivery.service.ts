import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class DeliveryService {
  constructor(private db: DbService) {}

  async findDrivers(tenantId: string) {
    const res = await this.db.query('SELECT * FROM drivers WHERE tenant_id = $1 ORDER BY name', [
      tenantId,
    ]);
    return res.rows;
  }

  async createDriver(tenantId: string, name: string) {
    const res = await this.db.query(
      `INSERT INTO drivers (tenant_id, name, status) VALUES ($1, $2, 'available') RETURNING *`,
      [tenantId, name],
    );
    return res.rows[0];
  }
}
