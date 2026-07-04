import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Settings {
  company_name: string | null;
  default_language: string;
  default_theme: string;
  currency: string;
  timezone: string;
  auto_assign_drivers: boolean;
  sla_minutes: number;
  default_receipt_width: number;
}

export default function Settings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get('/settings');
    setSettings(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
  };

  const save = async () => {
    if (!settings) return;
    setError('');
    try {
      await api.patch('/settings', settings);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  if (!settings) return <Layout><p>{t('common.loading')}</p></Layout>;

  return (
    <Layout>
      <h1>{t('settings.title')}</h1>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('settings.companySection')}</h3>
        <div style={styles.grid}>
          <label style={styles.label}>
            {t('settings.companyName')}
            <input
              style={styles.input}
              value={settings.company_name || ''}
              onChange={(e) => update({ company_name: e.target.value })}
            />
          </label>
          <label style={styles.label}>
            {t('settings.defaultLanguage')}
            <select
              style={styles.input}
              value={settings.default_language}
              onChange={(e) => update({ default_language: e.target.value })}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <label style={styles.label}>
            {t('settings.defaultTheme')}
            <select
              style={styles.input}
              value={settings.default_theme}
              onChange={(e) => update({ default_theme: e.target.value })}
            >
              <option value="light">{t('settings.theme.light')}</option>
              <option value="dark">{t('settings.theme.dark')}</option>
            </select>
          </label>
          <label style={styles.label}>
            {t('settings.currency')}
            <input style={styles.input} value={settings.currency} onChange={(e) => update({ currency: e.target.value })} />
          </label>
          <label style={styles.label}>
            {t('settings.timezone')}
            <input style={styles.input} value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })} />
          </label>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('settings.operationalSection')}</h3>
        <div style={styles.grid}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.auto_assign_drivers}
              onChange={(e) => update({ auto_assign_drivers: e.target.checked })}
            />
            {t('settings.autoAssignDrivers')}
          </label>
          <label style={styles.label}>
            {t('settings.slaMinutes')}
            <input
              style={styles.input}
              type="number"
              min={5}
              max={240}
              value={settings.sla_minutes}
              onChange={(e) => update({ sla_minutes: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('settings.printingSection')}</h3>
        <div style={styles.grid}>
          <label style={styles.label}>
            {t('settings.defaultReceiptWidth')}
            <select
              style={styles.input}
              value={settings.default_receipt_width}
              onChange={(e) => update({ default_receipt_width: Number(e.target.value) })}
            >
              <option value={80}>80mm</option>
              <option value={40}>40mm</option>
            </select>
          </label>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {saved && <div style={styles.success}>{t('settings.saved')}</div>}

      <button style={styles.button} onClick={save}>
        {t('settings.save')}
      </button>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: 'var(--color-card)', padding: 20, borderRadius: 10, marginBottom: 16, maxWidth: 700 },
  sectionTitle: { marginTop: 0, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  input: {
    padding: '8px 10px',
    borderRadius: 6,
    background: 'var(--color-card)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border-strong)',
  },
  button: { padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  success: { color: '#16a34a', fontSize: 13, marginBottom: 10 },
};
