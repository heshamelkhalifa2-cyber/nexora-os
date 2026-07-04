-- Migration 007: بيانات إضافية للطلب لازمة لإيصال التوصيل الحراري (Thermal Receipt)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
