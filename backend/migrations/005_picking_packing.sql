-- Migration 005: مراحل Picking → Packing مع Packing Attribution
-- إضافة حالتين جديدتين للطلب + تسجيل مين بدأ التجهيز ومين أنهاه

-- 1) إزالة القيد القديم على الحالة
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;

-- 2) القيد الجديد بالحالات الإضافية
ALTER TABLE orders
  ADD CONSTRAINT chk_orders_status CHECK (status IN (
    'pending',
    'confirmed',
    'payment_failed',
    'inventory_failed',
    'picking_started',
    'packed',
    'out_for_delivery',
    'delivered'
  ));

-- 3) أعمدة Packing Attribution — مين بدأ التجهيز ومين أنهاه، ومتى بالظبط
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picker_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picking_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packer_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_picker ON orders(picker_id);
CREATE INDEX IF NOT EXISTS idx_orders_packer ON orders(packer_id);
