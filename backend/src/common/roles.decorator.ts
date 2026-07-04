import { SetMetadata } from '@nestjs/common';

// القائمة الكاملة حسب مواصفة Nexora OS الأصلية (Roles & Permissions)
// ملاحظة: super_admin مخصص لفريق Nexora Tech نفسه (إدارة كل الشركات مستقبلاً) —
// حاليًا بنظام tenant واحد، بيتصرف بنفس صلاحيات company_admin.
export type Role =
  | 'super_admin'
  | 'company_admin'
  | 'manager'
  | 'cashier'
  | 'warehouse_staff'
  | 'driver'
  | 'groomer'
  | 'pos_operator'
  | 'order_taker'
  | 'reports_viewer';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
