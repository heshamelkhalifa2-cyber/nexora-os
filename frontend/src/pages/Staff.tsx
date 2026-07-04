import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from './Layout';

interface Staff {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const ADMIN_ROLES = ['company_admin', 'super_admin'];
const ROLE_ORDER = [
  'order_taker',
  'cashier',
  'pos_operator',
  'warehouse_staff',
  'driver',
  'groomer',
  'reports_viewer',
  'manager',
  'company_admin',
  'super_admin',
];

export default function Staff() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('order_taker');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await api.get('/auth/staff');
    setStaff(res.data);
  };

  useEffect(() => {
    if (user?.role && ADMIN_ROLES.includes(user.role)) load();
  }, [user]);

  if (!user?.role || !ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/orders" replace />;
  }

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/staff', { email, password, role });
      setSuccess(`✓ ${email}`);
      setEmail('');
      setPassword('');
      setRole('order_taker');
      load();
    } catch (err: any) {
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' — ') : message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1>{t('staff.title')}</h1>
      <p style={{ color: '#666', marginTop: -8 }}>{t('staff.subtitle')}</p>

      <form onSubmit={addStaff} style={styles.card}>
        <h3 style={{ marginTop: 0 }}>{t('staff.add')}</h3>
        <div style={styles.row}>
          <input
            style={styles.input}
            type="email"
            placeholder={t('staff.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder={t('staff.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}` as any)}
              </option>
            ))}
          </select>
          <button style={styles.button} disabled={loading}>
            {loading ? t('common.loading') : t('staff.createBtn')}
          </button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
      </form>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t('staff.table.email')}</th>
            <th style={styles.th}>{t('staff.table.role')}</th>
            <th style={styles.th}>{t('staff.table.createdAt')}</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td style={styles.td}>{s.email}</td>
              <td style={styles.td}>
                <span style={{ fontWeight: 600 }}>{t(`role.${s.role}` as any)}</span>
              </td>
              <td style={styles.td}>{new Date(s.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td style={styles.td} colSpan={3}>
                {t('staff.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Layout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', padding: 16, borderRadius: 10, marginBottom: 20, marginTop: 16 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 160 },
  button: { padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: 13, marginTop: 10 },
  success: { color: '#16a34a', fontSize: 13, marginTop: 10 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden' },
  th: { textAlign: 'start', padding: 12, background: '#f4f5f7', fontSize: 13, color: '#555' },
  td: { padding: 12, borderTop: '1px solid #eee', fontSize: 14 },
};
