import { useState } from 'react';
import { useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Sprout, ShoppingBasket, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FormError } from '../components/ui.jsx';
import { errorMessage } from '../utils/format.js';
import AuthAside from './AuthAside.jsx';

const DEMO = [
  { email: 'farmer@demo.com', label: 'Farmer', icon: Sprout },
  { email: 'buyer@demo.com', label: 'Buyer', icon: ShoppingBasket },
  { email: 'admin@demo.com', label: 'Admin', icon: ShieldCheck },
];

export default function Login() {
  const { login, user, sessionExpired } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function doLogin(credentials) {
    setError('');
    setSubmitting(true);
    try {
      const u = await login(credentials);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <AuthAside />
      <main className="auth-main">
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(form);
          }}
        >
          <div>
            <h1>Welcome back</h1>
            <p className="muted" style={{ marginTop: 6 }}>Log in to manage your farm and orders.</p>
          </div>

          {sessionExpired && <div className="alert tone-amber">Your session expired. Please log in again.</div>}
          <FormError>{error}</FormError>

          <label className="field">
            <span>Email</span>
            <div className="input-group">
              <Mail size={17} />
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="input-group">
              <Lock size={17} />
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </label>

          <button type="submit" className="btn btn-lg btn-block" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <><LogIn size={18} /> Log in</>}
          </button>

          <div className="divider">or explore with a demo account</div>
          <div className="demo-accounts">
            {DEMO.map(({ email, label, icon: Icon }) => (
              <button type="button" key={email} disabled={submitting} onClick={() => doLogin({ email, password: 'demo1234' })}>
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>

          <p className="muted" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
            New to AgriConnect? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
