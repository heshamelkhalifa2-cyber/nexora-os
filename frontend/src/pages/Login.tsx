import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      navigate('/orders');
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <button style={styles.langBtn} onClick={toggleLang}>
        {lang === 'ar' ? 'EN' : 'AR'}
      </button>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{t('login.title')}</h1>
        <p style={styles.subtitle}>{mode === 'login' ? t('login.signin') : t('login.signup')}</p>

        <input
          style={styles.input}
          type="email"
          placeholder={t('login.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? t('login.loading') : mode === 'login' ? t('login.submit.login') : t('login.submit.register')}
        </button>

        <button
          type="button"
          style={styles.linkButton}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? t('login.toggle.toRegister') : t('login.toggle.toLogin')}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  langBtn: {
    position: 'absolute',
    top: 20,
    insetInlineEnd: 20,
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #4f46e5',
    background: '#fff',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  card: {
    background: '#fff',
    padding: 32,
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    width: 340,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  title: { margin: 0, textAlign: 'center', color: '#1a1a2e' },
  subtitle: { margin: 0, textAlign: 'center', color: '#666', marginBottom: 8 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  button: {
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
  },
  linkButton: { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 13 },
  error: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
};
