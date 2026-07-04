-- Migration 008: نظام الإعدادات (Company + Operational + Printing Settings)

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),

  -- Company Settings
  company_name VARCHAR(255),
  default_language VARCHAR(2) NOT NULL DEFAULT 'ar' CHECK (default_language IN ('ar', 'en')),
  default_theme VARCHAR(10) NOT NULL DEFAULT 'light' CHECK (default_theme IN ('light', 'dark')),
  currency VARCHAR(10) NOT NULL DEFAULT 'KWD',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kuwait',

  -- Operational Settings
  auto_assign_drivers BOOLEAN NOT NULL DEFAULT false,
  sla_minutes INT NOT NULL DEFAULT 30,

  -- Printing Settings
  default_receipt_width INT NOT NULL DEFAULT 80 CHECK (default_receipt_width IN (40, 80)),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إعدادات افتراضية للشركة الموجودة حاليًا
INSERT INTO tenant_settings (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
