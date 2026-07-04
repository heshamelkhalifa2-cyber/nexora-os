# Nexora OS — MVP (Working Scaffold)

تطبيق تجريبي شغّال بالكامل يطبّق الخطة المتفق عليها: Foundation → Auth → Inventory → Orders → Payment → Delivery → Invoice.

## البنية
```
nexora-mvp/
  backend/    → NestJS + PostgreSQL (raw SQL عبر pg، بدون ORM ثقيل)
  frontend/   → React + Vite + TypeScript
```

## ✅ تم اختباره فعليًا (End-to-End)
- تسجيل مستخدم ودخول (JWT)
- إضافة منتج وتعديل المخزون
- إنشاء طلب → حساب الإجمالي تلقائيًا
- الدفع (Cash / Paid) → خصم المخزون بشكل ذرّي (Atomic Transaction)
- حالة `inventory_failed` عند نقص المخزون (بدون التأثير على المخزون الفعلي)
- تعيين سائق → توصيل → تسليم
- توليد فاتورة PDF فعلية

## التشغيل محليًا

### 1. قاعدة البيانات
```bash
# تأكد من تشغيل PostgreSQL، ثم:
createdb nexora_mvp
psql -d nexora_mvp -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql -d nexora_mvp -f backend/prisma-free-schema.sql
psql -d nexora_mvp -c "INSERT INTO tenants (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Store');"
```

### 2. Backend
```bash
cd backend
npm install
npm run build
npm start
# يعمل على http://localhost:3000
```
متغيرات بيئة اختيارية (افتراضيًا تعمل مع الإعدادات القياسية):
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=nexora_mvp
JWT_SECRET=غيّرها-في-الإنتاج
PORT=3000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# يعمل على http://localhost:5173 (متصل تلقائيًا بالـ backend عبر Vite proxy)
```

## ملاحظة معمارية مهمة
هذا الكود يطبّق مبادئ "First Production Slice" من المراجعة الهندسية السابقة:
- `tenant_id` موجود في كل جدول من اليوم الأول (رغم وجود tenant واحد فقط حاليًا) — يسمح بتفعيل RLS لاحقًا دون Migration مؤلم.
- الموديولات (`auth`, `products`, `orders`, `delivery`, `invoice`) منفصلة بحدود واضحة داخل نفس الـ Backend — يسهّل فصل أي موديول لاحقًا كخدمة مستقلة عند الحاجة الفعلية.
- عملية الدفع + خصم المخزون تتم داخل Transaction واحدة ذرّية لمنع بيع نفس القطعة مرتين.
- لا يوجد Kafka/Kubernetes/RLS مفعّل — بحسب توصية المراجعة الهندسية لمرحلة الـ MVP.

## الخطوة التالية المقترحة
- إضافة Docker Compose لتشغيل Backend + Frontend + PostgreSQL بأمر واحد.
- ربط بوابة دفع حقيقية بدل "Cash / تم الدفع" اليدوي.
- تطبيق سيناريوهات إضافية من الخطة الأصلية (Packing Attribution، إشعارات) بعد التحقق من نجاح هذا المسار الأساسي.
