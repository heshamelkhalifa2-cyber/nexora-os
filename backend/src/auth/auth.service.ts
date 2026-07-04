import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { Role } from '../common/roles.decorator';

// MVP: tenant واحد ثابت. لاحقًا يُستبدل بمنطق onboarding متعدد الشركات.
const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

@Injectable()
export class AuthService {
  constructor(private db: DbService, private jwt: JwtService) {}

  // أول مستخدم في الشركة فقط يُسجَّل تلقائيًا كـ admin (Bootstrap).
  // أي مستخدم إضافي يجب أن يُنشأ عبر /auth/staff من قِبل admin موجود — يمنع أي شخص من صنع حساب admin لنفسه.
  async register(email: string, password: string) {
    const anyUser = await this.db.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [
      DEFAULT_TENANT_ID,
    ]);
    if (anyUser.rowCount && anyUser.rowCount > 0) {
      throw new BadRequestException(
        'يوجد مستخدمون مسجّلون بالفعل لهذه الشركة. يرجى التواصل مع الأدمن لإنشاء حسابك عبر /auth/staff',
      );
    }
    return this.createUser(DEFAULT_TENANT_ID, email, password, 'company_admin');
  }

  // إنشاء موظف بدور محدد — يُستدعى فقط من Admin (محمي بـ Roles guard في الـ Controller)
  async createStaff(tenantId: string, email: string, password: string, role: Role) {
    return this.createUser(tenantId, email, password, role);
  }

  // قائمة الموظفين بالشركة — Admin فقط
  async listStaff(tenantId: string) {
    const res = await this.db.query(
      'SELECT id, email, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId],
    );
    return res.rows;
  }

  async login(email: string, password: string) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1 AND tenant_id = $2', [
      email,
      DEFAULT_TENANT_ID,
    ]);
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    return this.buildToken(user);
  }

  private async createUser(tenantId: string, email: string, password: string, role: Role) {
    const existing = await this.db.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [
      email,
      tenantId,
    ]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new BadRequestException('هذا البريد مسجل مسبقًا');
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await this.db.query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, tenant_id, role`,
      [tenantId, email, hash, role],
    );
    const user = result.rows[0];
    return this.buildToken(user);
  }

  private buildToken(user: any) {
    const payload = { sub: user.id, tenantId: user.tenant_id, email: user.email, role: user.role };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
    };
  }
}
