import { useState } from 'react';
import { supabase } from '../lib/supabase';

const BudgetIQLogo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" rx="80" fill="#0f0f0f"/>
    <g opacity="0.07">
      <line x1="0" y1="80" x2="400" y2="80" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="0" y1="160" x2="400" y2="160" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="0" y1="240" x2="400" y2="240" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="0" y1="320" x2="400" y2="320" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="80" y1="0" x2="80" y2="400" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="160" y1="0" x2="160" y2="400" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="240" y1="0" x2="240" y2="400" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="320" y1="0" x2="320" y2="400" stroke="#f59e0b" strokeWidth="1"/>
    </g>
    <rect x="53" y="250" width="48" height="90" rx="6" fill="#f59e0b" opacity="0.3"/>
    <rect x="117" y="190" width="48" height="150" rx="6" fill="#f59e0b" opacity="0.5"/>
    <rect x="181" y="140" width="48" height="200" rx="6" fill="#f59e0b" opacity="0.75"/>
    <rect x="245" y="100" width="48" height="240" rx="6" fill="#f59e0b"/>
    <rect x="309" y="160" width="48" height="180" rx="6" fill="#f59e0b" opacity="0.5"/>
    <polyline points="77,245 141,185 205,135 269,95 333,155"
      fill="none" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="77" cy="245" r="5" fill="#fcd34d"/>
    <circle cx="141" cy="185" r="5" fill="#fcd34d"/>
    <circle cx="205" cy="135" r="5" fill="#fcd34d"/>
    <circle cx="269" cy="95" r="7" fill="#fcd34d" stroke="#0f0f0f" strokeWidth="2"/>
    <circle cx="333" cy="155" r="5" fill="#fcd34d"/>
    <rect width="400" height="400" rx="80" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4"/>
    <rect x="18" y="18" width="52" height="26" rx="6" fill="#f59e0b" opacity="0.15"/>
    <text x="44" y="35" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="700" fill="#fcd34d" letterSpacing="1">IQ</text>
  </svg>
);

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Check your email for a confirmation link!');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030712',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      padding: '1rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .login-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .login-input:focus { border-color: #f59e0b; }
        .login-input::placeholder { color: #334155; }
      `}</style>

      {/* Decorative glows matching landing page */}
      <div style={{
        position: 'fixed', top: '-15%', right: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', left: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <BudgetIQLogo size={52} />
          </div>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 700,
            color: '#f59e0b', margin: 0, letterSpacing: '-0.3px',
          }}>BudgetIQ</h1>
          <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '1.5rem',
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '0.5rem',
                borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
                transition: 'all 0.2s',
                background: mode === m ? '#f59e0b' : 'transparent',
                color: mode === m ? '#0f0f0f' : '#475569',
                fontFamily: 'inherit',
              }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>
              Email
            </label>
            <input
              className="login-input"
              type="email"
              autoComplete="off"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 500 }}>
              Password
            </label>
            <input
              className="login-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem',
            color: '#fca5a5', fontSize: '0.85rem',
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem',
            color: '#fcd34d', fontSize: '0.85rem',
          }}>{success}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '0.875rem',
            background: loading ? 'rgba(245,158,11,0.4)' : '#f59e0b',
            border: 'none', borderRadius: '10px',
            color: loading ? '#94a3b8' : '#0f0f0f',
            fontSize: '0.95rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#fbbf24'; }}
          onMouseOut={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f59e0b'; }}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Your data is encrypted and private · Built in South Africa 🇿🇦
        </p>
      </div>
    </div>
  );
}