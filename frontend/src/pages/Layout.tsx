import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const navigate = useNavigate();

  const navItem = (to: string, icon: string, labelKey: Parameters<typeof t>[0]) => (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.navItem,
        background: isActive ? '#4f46e5' : 'transparent',
        color: isActive ? '#fff' : '#333',
      })}
    >
      {icon} {t(labelKey)}
    </NavLink>
  );

  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.topRow}>
          <h2 style={styles.logo}>Nexora OS</h2>
          <button style={styles.langBtn} onClick={toggleLang} title="Toggle language">
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
        </div>
        <nav style={styles.nav}>
          {navItem('/products', '📦', 'nav.products')}
          {navItem('/orders', '🛒', 'nav.orders')}
          {navItem('/warehouses', '🏢', 'nav.warehouses')}
          {navItem('/drivers', '🚚', 'nav.drivers')}
          {(user?.role === 'company_admin' || user?.role === 'super_admin') &&
            navItem('/staff', '👥', 'nav.staff')}
        </nav>
        <div style={styles.userBox}>
          <div style={{ fontSize: 13, color: '#666' }}>{user?.email}</div>
          <button
            style={styles.logoutBtn}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>
      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220,
    background: '#fff',
    borderInlineEnd: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
  },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  logo: { color: '#4f46e5', margin: '8px 0' },
  langBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #4f46e5',
    background: '#fff',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  navItem: { padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
  userBox: { borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  logoutBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  },
  content: { flex: 1, padding: 24 },
};
