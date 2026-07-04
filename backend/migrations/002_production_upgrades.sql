-- Migration 002: Production upgrades
-- RBAC roles + Users<->Orders / Users<->Drivers relations + indexes للأداء

-- 1) قيد صريح على أدوار المستخدمين (RBAC) — يمنع إدخال دور غير معروف من قاعدة البيانات نفسها
ALTER TABLE users
  ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'supervisor', 'agent', 'driver'));

-- 2) ربط الطلب بالمستخدم اللي أنشأه (غالبًا Agent) — يسمح لاحقًا بتقارير أداء الموظفين
ALTER TABLE orders
  ADD COLUMN created_by UUID REFERENCES users(id);

-- 3) ربط السائق بحساب مستخدم فعلي (لتفعيل دور Driver في RBAC: سائق يسجّل دخول
--    ويشوف/يسلّم طلباته فقط عبر هذا الربط)
ALTER TABLE drivers
  ADD COLUMN user_id UUID REFERENCES users(id);

-- 4) قيد صريح على حالة الطلب (Status Workflow) — طبقة حماية إضافية غير معتمدة فقط على الكود
ALTER TABLE orders
  ADD CONSTRAINT chk_orders_status CHECK (
    status IN ('pending', 'confirmed', 'payment_failed', 'inventory_failed', 'out_for_delivery', 'delivered')
  );

-- 5) فهارس إضافية للأداء (Pagination + Filtering + Search)
-- بحث/فلترة الطلبات حسب الحالة ضمن نفس الشركة (أكثر استعلام متكرر في لوحة التشغيل)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);

-- ترتيب الطلبات بالأحدث أولًا ضمن نفس الشركة (Pagination)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);

-- بحث نصي باسم العميل (ILIKE) — trigram index يسرّع البحث الجزئي بدل Full Table Scan
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_orders_customer_name_trgm ON orders USING gin (customer_name gin_trgm_ops);

-- بحث اسم المنتج بنفس الطريقة
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- تقارير أداء الموظفين لاحقًا (Analytics)
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- ربط السائق بالمستخدم (للتحقق السريع عند تسجيل دخول Driver)
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id) WHERE user_id IS NOT NULL;
