import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Sprout, ShoppingBasket } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FormError } from '../components/ui.jsx';
import { errorMessage } from '../utils/format.js';
import AuthAside from './AuthAside.jsx';

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = [
  ['Too short', 'var(--red)'],
  ['Weak', 'var(--red)'],
  ['Fair', 'var(--accent-amber)'],
  ['Good', 'var(--brand-500)'],
  ['Strong', 'var(--brand-600)'],
];

export default function Register() {
  const { register, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'farmer' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const pwScore = form.password ? (form.password.length < 8 ? 0 : strength(form.password)) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setSubmitting(true);
    try {
      const u = await register({ ...form, phone: form.phone || undefined });
      toast.success('Account created. Welcome to AgriConnect!');
      navigate(u.role === 'farmer' ? '/farm' : '/marketplace');
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <AuthAside />
      <main className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h1>Create your account</h1>
            <p className="muted" style={{ marginTop: 6 }}>Free for farmers and buyers.</p>
          </div>
          <FormError>{error}</FormError>

          <div className="field">
            <span>I am a</span>
            <div className="segmented">
              <label>
                <input type="radio" name="role" value="farmer" checked={form.role === 'farmer'} onChange={set('role')} />
                <strong><Sprout size={17} /> Farmer</strong>
                <small>Grow, get advice & sell</small>
              </label>
              <label>
                <input type="radio" name="role" value="buyer" checked={form.role === 'buyer'} onChange={set('role')} />
                <strong><ShoppingBasket size={17} /> Buyer</strong>
                <small>Buy fresh produce</small>
              </label>
            </div>
          </div>

          <label className="field">
            <span>Full name</span>
            <div className="input-group">
              <User size={17} />
              <input className="input" required maxLength={120} autoComplete="name" value={form.name} onChange={set('name')} placeholder="Ravi Kumar" />
            </div>
          </label>
          <label className="field">
            <span>Email</span>
            <div className="input-group">
              <Mail size={17} />
              <input className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </div>
          </label>
          <label className="field">
            <span>Phone <span className="subtle">(optional)</span></span>
            <div className="input-group">
              <Phone size={17} />
              <input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="input-group">
              <Lock size={17} />
              <input className="input" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" />
            </div>
            {pwScore !== null && (
              <div className="row" style={{ gap: '0.5rem', marginTop: 4 }}>
                <div className="progress grow">
                  <div style={{ width: `${Math.max(pwScore, 0.5) * 25}%`, background: STRENGTH[pwScore][1] }} />
                </div>
                <small style={{ color: STRENGTH[pwScore][1], fontWeight: 600, fontSize: '0.75rem' }}>{STRENGTH[pwScore][0]}</small>
              </div>
            )}
          </label>

          <button type="submit" className="btn btn-lg btn-block" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Create account'}
          </button>
          <p className="muted" style={{ textAlign: 'center', fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
