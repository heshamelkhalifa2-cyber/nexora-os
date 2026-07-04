-- Migration 003: توسيع RBAC من 4 أدوار مبسطة لـ 10 أدوار حسب مواصفة Nexora OS الأصلية

-- 1) إزالة القيد القديم قبل تعديل القيم
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

-- 2) ترحيل المستخدمين الحاليين للأسماء الجديدة (بدون فقدان أي صلاحية فعلية كانت متاحة لهم)
UPDATE users SET role = 'company_admin' WHERE role = 'admin';
UPDATE users SET role = 'manager'       WHERE role = 'supervisor';
UPDATE users SET role = 'cashier'       WHERE role = 'agent';
-- 'driver' يبقى زي ما هو، مفيش تغيير باسمه

-- 3) القيد الجديد بكل الأدوار العشرة
ALTER TABLE users
  ADD CONSTRAINT chk_users_role CHECK (role IN (
    'super_admin',
    'company_admin',
    'manager',
    'cashier',
    'warehouse_staff',
    'driver',
    'groomer',
    'pos_operator',
    'order_taker',
    'reports_viewer'
  ));
