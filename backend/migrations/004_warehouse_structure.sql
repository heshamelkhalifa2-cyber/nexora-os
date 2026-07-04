-- Migration 004: هيكلة المخزون الكاملة
-- من "رقم مخزون واحد لكل منتج" إلى "رقم منفصل لكل منتج في كل موقع" + سجل حركات كامل (Ledger)

-- 1) جدول المواقع (Main Warehouse / Fulfillment Center / Branches)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('main_warehouse', 'fulfillment_center', 'branch')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) رصيد كل منتج في كل موقع (بدل عمود stock_quantity الواحد على المنتج)
CREATE TABLE IF NOT EXISTS product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- 3) سجل حركات المخزون (Append-Only Ledger) — كل حركة = سطر جديد، مفيش تعديل ولا حذف
CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  change_quantity INT NOT NULL,       -- موجب = إضافة، سالب = خصم
  balance_after INT NOT NULL,          -- الرصيد بعد الحركة (للتدقيق والمراجعة)
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('initial', 'adjustment', 'sale', 'transfer_in', 'transfer_out')),
  reference_type VARCHAR(30),          -- مثال: 'order'
  reference_id UUID,                   -- مثال: order_id لما السبب يكون sale
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) ربط الطلب بموقع التنفيذ (من وين هيتخصم المخزون)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- 5) الترحيل: إنشاء مستودع رئيسي افتراضي لكل شركة، ونقل الأرصدة القديمة له
INSERT INTO warehouses (tenant_id, name, type)
SELECT DISTINCT tenant_id, 'المستودع الرئيسي', 'main_warehouse'
FROM products
ON CONFLICT DO NOTHING;

INSERT INTO product_stock (tenant_id, product_id, warehouse_id, quantity)
SELECT p.tenant_id, p.id, w.id, p.stock_quantity
FROM products p
JOIN warehouses w ON w.tenant_id = p.tenant_id AND w.type = 'main_warehouse'
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- تسجيل الأرصدة القديمة كأول حركة بالسجل (initial) — عشان الـ Ledger يبدأ متسق من نقطة معروفة
INSERT INTO stock_ledger (tenant_id, product_id, warehouse_id, change_quantity, balance_after, reason)
SELECT p.tenant_id, p.id, w.id, p.stock_quantity, p.stock_quantity, 'initial'
FROM products p
JOIN warehouses w ON w.tenant_id = p.tenant_id AND w.type = 'main_warehouse';

-- 6) حذف العمود القديم بعد الترحيل الكامل
ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity;

-- 7) فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_product ON product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_warehouse ON product_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_warehouse ON stock_ledger(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_tenant_created ON stock_ledger(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse ON orders(warehouse_id);
