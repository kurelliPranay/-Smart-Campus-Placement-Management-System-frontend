import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const demoAccounts = [
  { label: 'Student', icon: '🎓', email: 'student@college.edu', password: 'Student@123' },
  { label: 'Company', icon: '🏢', email: 'info@techspark.com', password: 'Company@123' },
  { label: 'Admin', icon: '🛡️', email: 'admin@smartcampus.edu', password: 'Admin@123' }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
    const target = user.role === 'STUDENT' ? '/student' : user.role === 'ADMIN' ? '/admin' : '/company';
    navigate(target, { replace: true });
    }
  }, [navigate, user]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const useDemoAccount = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const currentUser = await login(form.email, form.password);
      if (currentUser.role === 'STUDENT') navigate('/student');
      else if (currentUser.role === 'ADMIN') navigate('/admin');
      else navigate('/company');
    } catch (err) {
      setError(err.response
        ? err.response.data?.message || 'Login failed. Please check your credentials.'
        : 'Cannot reach the backend API. Check the VITE_API_BASE_URL setting and make sure the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6" /></svg>
        </div>
        <h1 id="login-title">CampusConnect</h1>
        <p className="login-subtitle">Sign in to continue to your placement dashboard.</p>

        <div className="demo-account-area">
          <span className="demo-account-label">Quick Demo Accounts:</span>
          <div className="demo-account-buttons">
            {demoAccounts.map((account) => (
              <button key={account.label} type="button" className="demo-account-button" onClick={() => useDemoAccount(account)}>
                <span aria-hidden="true">{account.icon}</span> {account.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email Address</label>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
              <input id="login-email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="student@campus.com" autoComplete="username" required />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
              <input id="login-password" name="password" value={form.password} onChange={handleChange} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required />
              <button type="button" className="password-visibility" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Sign In to Portal'} {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>
        <p className="login-register">Don’t have a student account? <Link to="/register">Register here</Link></p>
      </section>
    </main>
  );
}
