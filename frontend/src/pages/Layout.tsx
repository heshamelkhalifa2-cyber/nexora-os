import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navItem = (to: string, icon: string, labelKey: Parameters<typeof t>[0]) => (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.navItem,
        background: isActive ? 'var(--color-primary)' : 'transparent',
        color: isActive ? '#fff' : 'var(--color-text)',
      })}
    >
      {icon} {t(labelKey)}
    </NavLink>
  );

  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin';

  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.topRow}>
          <h2 style={styles.logo}>Nexora OS</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button style={styles.iconBtn} onClick={toggleLang} title="Toggle language">
              {lang === 'ar' ? 'EN' : 'AR'}
            </button>
          </div>
        </div>
        <nav style={styles.nav}>
          {navItem('/products', '📦', 'nav.products')}
          {navItem('/orders', '🛒', 'nav.orders')}
          {navItem('/warehouses', '🏢', 'nav.warehouses')}
          {navItem('/drivers', '🚚', 'nav.drivers')}
          {isAdmin && navItem('/staff', '👥', 'nav.staff')}
          {isAdmin && navItem('/settings', '⚙️', 'nav.settings')}
        </nav>
        <div style={styles.userBox}>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.email}</div>
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
    background: 'var(--color-card)',
    borderInlineEnd: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
  },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  logo: { color: 'var(--color-primary)', margin: '8px 0', fontSize: 18 },
  iconBtn: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--color-primary)',
    background: 'var(--color-card)',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  navItem: { padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
  userBox: { borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  logoutBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--color-border-strong)',
    background: 'var(--color-card)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: 12,
  },
  content: { flex: 1, padding: 24 },
};
