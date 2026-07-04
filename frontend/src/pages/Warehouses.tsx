import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Warehouse {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export default function Warehouses() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('branch');
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get('/warehouses');
    setWarehouses(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const addWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/warehouses', { name, type });
      setName('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  return (
    <Layout>
      <h1>{t('warehouses.title')}</h1>
      <p style={{ color: '#666', marginTop: -8 }}>{t('warehouses.subtitle')}</p>

      <form onSubmit={addWarehouse} style={styles.form}>
        <input style={styles.input} placeholder={t('warehouses.name')} value={name} onChange={(e) => setName(e.target.value)} required />
        <select style={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="main_warehouse">{t('warehouses.type.main_warehouse')}</option>
          <option value="fulfillment_center">{t('warehouses.type.fulfillment_center')}</option>
          <option value="branch">{t('warehouses.type.branch')}</option>
        </select>
        <button style={styles.button}>{t('warehouses.add')}</button>
      </form>
      {error && <div style={styles.error}>{error}</div>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t('warehouses.table.name')}</th>
            <th style={styles.th}>{t('warehouses.table.type')}</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((w) => (
            <tr key={w.id}>
              <td style={styles.td}>{w.name}</td>
              <td style={styles.td}>
                <span style={{ fontWeight: 600 }}>{t(`warehouses.type.${w.type}` as any)}</span>
              </td>
            </tr>
          ))}
          {warehouses.length === 0 && (
            <tr>
              <td style={styles.td} colSpan={2}>
                {t('warehouses.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', gap: 8, marginBottom: 12, background: '#fff', padding: 16, borderRadius: 10 },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', flex: 1 },
  button: { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'start', padding: 12, background: '#f4f5f7', fontSize: 13, color: '#555' },
  td: { padding: 12, borderTop: '1px solid #eee', fontSize: 14 },
};
