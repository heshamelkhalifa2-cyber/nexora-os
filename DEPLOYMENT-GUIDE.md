# Nexora OS — Deployment Guide (VPS حقيقي)

نشر كامل النظام (Frontend + Backend + Database) بأمر واحد فعليًا، مع HTTPS تلقائي مجاني (Let's Encrypt عبر Caddy).

---

## 1. المتطلبات قبل البدء

- **VPS** بأرخص خيار كافٍ للبداية (مثال: DigitalOcean Droplet أو Hetzner Cloud — أقل خطة، 1-2GB RAM كافية للمرحلة الحالية).
- **دومين** مُوجَّه لـ IP السيرفر (A record) — لو معندكش دومين بعد، تقدر تنشر بـ HTTP عادي بدون دومين (مذكور بالأسفل).
- **Docker + Docker Compose** مثبتين على السيرفر:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- **منافذ مفتوحة** على الـ Firewall: `80` و`443` (HTTP/HTTPS)، و`22` (SSH). **لا تفتح** منفذ `5432` (قاعدة البيانات) للإنترنت — الإعداد الحالي أصلًا ما بيعرضهاش.

---

## 2. رفع الكود للسيرفر

```bash
# على جهازك، أو مباشرة عبر git clone على السيرفر لو الكود على GitHub
scp -r nexora-mvp/ user@your-server-ip:/opt/nexora-os
ssh user@your-server-ip
cd /opt/nexora-os
```

---

## 3. إعداد متغيرات البيئة

```bash
cp .env.example .env
nano .env   # أو أي محرر تفضّله
```

عدّل القيم دي **إلزاميًا**:
```
JWT_SECRET=<شغّل: openssl rand -hex 32 وحط الناتج هنا>
DB_PASSWORD=<كلمة مرور قوية عشوائية>
DOMAIN=nexora.yourdomain.com
```

⚠️ **لو معندكش دومين جاهز الآن:** احذف سطر `DOMAIN` بالكامل من `.env` أو سيبه فاضي — Caddy هيشتغل تلقائيًا بـ HTTP عادي على المنفذ 80 بدون HTTPS. تقدر تضيف الدومين لاحقًا وتعيد التشغيل، وقتها الـ HTTPS هيتفعّل تلقائيًا بدون أي تعديل كود.

---

## 4. التشغيل

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

أول مرة هتاخد شوية وقت (بناء الصور + تحميل PostgreSQL/Caddy/Node). راقب اللوج:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

انتظر لحد ما تشوف:
- `postgres` → `database system is ready to accept connections`
- `backend` → `Nexora backend running on http://localhost:3000`
- `frontend` (Caddy) → `serving initial configuration`

---

## 5. التحقق من نجاح النشر

```bash
# لو معاك دومين:
curl -I https://nexora.yourdomain.com

# لو من غير دومين (HTTP على IP السيرفر مباشرة):
curl -I http://your-server-ip
```
يجب أن ترجع `HTTP/2 200` أو `HTTP/1.1 200`.

افتح المتصفح على الدومين (أو IP السيرفر) — يجب أن تظهر شاشة تسجيل الدخول.

**أول مستخدم تسجّله = Admin تلقائيًا** (Bootstrap، زي ما هو متفق عليه بالكود).

---

## 6. عمليات تشغيلية أساسية بعد النشر

| المهمة | الأمر |
|---|---|
| إيقاف النظام | `docker compose -f docker-compose.prod.yml down` |
| إعادة التشغيل بعد تعديل كود | `docker compose -f docker-compose.prod.yml up -d --build` |
| متابعة اللوج المباشر | `docker compose -f docker-compose.prod.yml logs -f backend` |
| نسخة احتياطية من قاعدة البيانات | `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres nexora_mvp > backup_$(date +%F).sql` |
| استعادة نسخة احتياطية | `cat backup.sql \| docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres nexora_mvp` |
| الدخول لقاعدة البيانات مباشرة (تشخيص) | `docker compose -f docker-compose.prod.yml exec postgres psql -U postgres nexora_mvp` |

---

## 7. مشاكل شائعة وحلولها

| المشكلة | السبب المحتمل | الحل |
|---|---|---|
| Caddy مش عامل HTTPS | الدومين لسا ما propagate عالإنترنت | انتظر 5-30 دقيقة بعد ضبط DNS، تأكد بـ `dig nexora.yourdomain.com` |
| `502 Bad Gateway` | الباك اند لسا بيقلع أو فيه خطأ بالاتصال بقاعدة البيانات | `docker compose -f docker-compose.prod.yml logs backend` |
| فشل تسجيل الدخول بعد أول نشر | قاعدة البيانات فاضية (لسا ما اتعمل bootstrap admin) | افتح شاشة "تسجيل" مش "دخول" — أول تسجيل يصير admin تلقائيًا |
| تغييرات الكود مش ظاهرة | نسيت `--build` بعد تعديل الكود | `docker compose -f docker-compose.prod.yml up -d --build` |
| قاعدة البيانات مش بتتصفر عند إعادة التشغيل | ده طبيعي ومطلوب — البيانات بتتخزن بـ `nexora_pg_data` volume دائم | لو فعلاً حبيت تصفّرها: `docker compose -f docker-compose.prod.yml down -v` (⚠️ يمسح كل البيانات) |

---

## 8. الخطوة اللي بعد كدا (اختياري، مش جزء من هذا النشر)

الإعداد الحالي كافٍ ومناسب للمرحلة الحالية (عميل واحد أو قليل، حمل بسيط). لو حبيت لاحقًا:
- **نسخ احتياطي تلقائي مجدول** (cron يشغّل أمر `pg_dump` يوميًا ويرفعه لمكان خارجي).
- **مراقبة بسيطة** (مثال: [UptimeRobot](https://uptimerobot.com) مجاني، يبعتلك تنبيه لو السيرفر وقع).
- هذول خارج نطاق "التكامل والنشر" الحالي — تقدر تطلبهم كخطوة منفصلة لما تحتاجهم فعليًا.
