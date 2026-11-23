import { useState } from 'react';
import { Mail, Calendar, Shield, LogOut } from 'lucide-react';
import { updateMe } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { PageHeader, Avatar, StatusBadge, FormError, Field } from '../components/ui.jsx';
import { formatDate, errorMessage } from '../utils/format.js';
import AlertSettings from './AlertSettings.jsx';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty = form.name.trim() !== user.name || form.phone.trim() !== (user.phone || '');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await updateMe({ name: form.name.trim(), phone: form.phone.trim() || undefined });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      setError(errorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your account details and preferences." />
      <div className="grid-main-side">
        <div className="stack-lg">
        <form className="card" onSubmit={submit}>
          <div className="card-header"><h3>Personal details</h3></div>
          <div className="card-body stack">
            <FormError>{error}</FormError>
            <div className="form-grid">
              <Field label="Full name">
                <input className="input" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Email" className="span-2" hint="Email can't be changed">
                <input className="input" value={user.email} disabled />
              </Field>
            </div>
            <div className="form-actions">
              <button className="btn" disabled={saving || !dirty}>{saving ? <span className="spinner" /> : 'Save changes'}</button>
            </div>
          </div>
        </form>
        <AlertSettings />
        </div>

        <div className="stack-lg">
          <div className="card card-pad stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{ transform: 'scale(1.6)', margin: '0.75rem 0' }}><Avatar name={user.name} /></div>
            <div>
              <h2>{user.name}</h2>
              <div style={{ marginTop: 6 }}><StatusBadge kind="role" value={user.role} dot={false} /></div>
            </div>
            <div className="stack-sm" style={{ width: '100%', textAlign: 'left' }}>
              <span className="row muted" style={{ gap: 8, fontSize: '0.88rem' }}><Mail size={15} /> {user.email}</span>
              <span className="row muted" style={{ gap: 8, fontSize: '0.88rem' }}><Calendar size={15} /> Member since {formatDate(user.created_at)}</span>
              <span className="row muted" style={{ gap: 8, fontSize: '0.88rem' }}><Shield size={15} /> Secured with JWT + bcrypt</span>
            </div>
          </div>
          <div className="card card-pad stack">
            <h3>Preferences</h3>
            <div className="row-between">
              <span>Dark mode</span>
              <button className={`chip ${theme === 'dark' ? 'active' : ''}`} onClick={toggle}>{theme === 'dark' ? 'On' : 'Off'}</button>
            </div>
            <button className="btn btn-danger-soft btn-block" onClick={logout}><LogOut size={16} /> Log out</button>
          </div>
        </div>
      </div>
    </>
  );
}
