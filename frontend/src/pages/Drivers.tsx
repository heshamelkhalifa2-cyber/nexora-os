import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Layout from './Layout';
import { useLanguage } from '../context/LanguageContext';

interface Driver {
  id: string;
  name: string;
  status: string;
}

export default function Drivers() {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [name, setName] = useState('');

  const load = async () => {
    const res = await api.get('/drivers');
    setDrivers(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const addDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/drivers', { name });
    setName('');
    load();
  };

  return (
    <Layout>
      <h1>{t('drivers.title')}</h1>
      <form onSubmit={addDriver} style={styles.form}>
        <input style={styles.input} placeholder={t('drivers.name')} value={name} onChange={(e) => setName(e.target.value)} required />
        <button style={styles.button}>{t('drivers.add')}</button>
      </form>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t('drivers.table.name')}</th>
            <th style={styles.th}>{t('drivers.table.status')}</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id}>
              <td style={styles.td}>{d.name}</td>
              <td style={styles.td}>
                <span style={{ color: d.status === 'available' ? '#16a34a' : '#dc2626' }}>
                  {d.status === 'available' ? t('drivers.status.available') : t('drivers.status.busy')}
                </span>
              </td>
            </tr>
          ))}
          {drivers.length === 0 && (
            <tr>
              <td style={styles.td} colSpan={2}>
                {t('drivers.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', gap: 8, marginBottom: 20, background: '#fff', padding: 16, borderRadius: 10 },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', flex: 1 },
  button: { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'start', padding: 12, background: '#f4f5f7', fontSize: 13, color: '#555' },
  td: { padding: 12, borderTop: '1px solid #eee', fontSize: 14 },
};
