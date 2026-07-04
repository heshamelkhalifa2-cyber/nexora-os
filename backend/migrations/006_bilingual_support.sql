-- Migration 006: دعم اللغتين (AR/EN) — أساسًا للفواتير ثنائية اللغة الإلزامية

-- اسم المنتج بالإنجليزي (بجانب name الموجود أصلاً، اللي هيُعتبر النسخة العربية)
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- عند إنشاء الطلب، بناخد نسخة (Snapshot) من الاسمين وقت البيع — نفس منطق product_name_snapshot الموجود
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name_snapshot_en VARCHAR(255);

-- تعبئة القيم القديمة: لو مفيش اسم إنجليزي متسجل، نخليه نفس العربي مؤقتًا (بدل ما يفضل فاضي بالفاتورة)
UPDATE products SET name_en = name WHERE name_en IS NULL;
UPDATE order_items SET product_name_snapshot_en = product_name_snapshot WHERE product_name_snapshot_en IS NULL;
