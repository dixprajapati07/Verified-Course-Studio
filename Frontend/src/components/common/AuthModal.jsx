import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, Mail, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiLogin, apiRegister, saveAuthToken } from '../../services/api';

export default function AuthModal({ isOpen, onClose, onNavigate }) {
  const { addToast, setAuthSession } = useApp();
  const [authMode, setAuthMode] = useState('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setAuthMode('register');
    setEmail('');
    setPassword('');
    setNotice(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setNotice({ type: 'error', message: 'Enter a valid email address.' });
      return;
    }

    if (password.length < 8) {
      setNotice({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const response = authMode === 'register'
        ? await apiRegister({ email: normalizedEmail, password })
        : await apiLogin({ email: normalizedEmail, password });

      if (!response.session?.access_token) {
        throw new Error('Authentication succeeded without a session.');
      }

      saveAuthToken(response.session.access_token);
      setAuthSession(response.session);
      onClose();
      addToast(authMode === 'register' ? 'Account created successfully.' : 'Login successful.', 'success');
      if (onNavigate) onNavigate('/');
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.message || 'Authentication failed. Check your email and password.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ zIndex: 9999 }}
    >
      <div className="modal-box animate-slide-up" style={{
        maxWidth: '440px',
        padding: '2.25rem 2rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 26, height: 26, borderRadius: '5px', background: 'var(--text-primary)', color: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>V</div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>VERIFIED COURSE STUDIO</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close authentication"><X size={15} /></button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            {authMode === 'register' ? 'New workspace' : 'Member access'}
          </p>
          <h2 className="heading-editorial" style={{ fontSize: '1.8rem', lineHeight: 1.15, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
            {authMode === 'register' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {authMode === 'register' ? 'Sign up with your email and password to save your courses.' : 'Verify your email and password to continue.'}
          </p>
        </div>

        {notice && (
          <div role="alert" aria-live="polite" style={{ display: 'flex', gap: '0.65rem', padding: '0.8rem 1rem', background: 'var(--status-failed-bg)', border: '1px solid var(--status-failed-border)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <AlertCircle size={15} color="var(--status-failed)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{notice.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }} htmlFor="auth-email">
            Email address
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={15} color="var(--text-muted)" />
              <input id="auth-email" type="email" autoComplete="email" placeholder="name@domain.com" value={email} onChange={(event) => setEmail(event.target.value)} className="input-text" style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem 0.75rem' }} required autoFocus />
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }} htmlFor="auth-password">
            Password
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LockKeyhole size={15} color="var(--text-muted)" />
              <input id="auth-password" type="password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} className="input-text" style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem 0.75rem' }} required minLength={8} />
            </div>
          </label>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.7rem', justifyContent: 'center', fontSize: '0.85rem', gap: '0.45rem', marginTop: '0.25rem' }}>
            {loading ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}
            <span>{loading ? 'Please wait...' : authMode === 'register' ? 'Sign up' : 'Login'}</span>
          </button>
        </form>

        <button type="button" className="btn-ghost" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setNotice(null); }} style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          {authMode === 'login' ? 'Need an account? Sign up' : 'Already registered? Login'}
        </button>
      </div>
    </div>
  );
}
