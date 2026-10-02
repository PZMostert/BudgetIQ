import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const timer = setTimeout(async () => {
      await refreshProfile();
      navigate('/dashboard');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Sora:wght@700&display=swap" rel="stylesheet" />
      <div style={{
        textAlign: 'center',
        background: 'rgba(30,41,59,0.8)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '400px',
        width: '100%',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          color: '#f1f5f9', fontSize: '1.8rem', marginBottom: '0.5rem',
        }}>You're Pro!</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
          Your BudgetIQ Pro subscription is active. Redirecting you back...
        </p>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(16,185,129,0.3)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}