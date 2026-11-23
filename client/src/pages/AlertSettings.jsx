import { useState } from 'react';
import { MessageSquare, PhoneCall, Send } from 'lucide-react';
import { updateMe, sendTestAlert } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../utils/format.js';

const WHAT = {
  farmer: {
    sms: 'New orders, buyer cancellations and field report updates',
    voice: 'Phone call for urgent alerts',
  },
  buyer: {
    sms: 'Order confirmations, shipping and delivery updates',
    voice: 'Phone call for urgent alerts',
  },
  admin: {
    sms: 'High-severity field reports',
    voice: 'Phone call the moment a critical field report is filed',
  },
};

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="switch"
      data-on={checked}
    >
      <span />
    </button>
  );
}

export default function AlertSettings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const what = WHAT[user.role] || WHAT.farmer;
  const hasPhone = Boolean(user.phone);

  async function toggle(key, value) {
    setBusy(key);
    try {
      const updated = await updateMe({ [key]: value });
      setUser(updated);
      toast.success(`${key === 'smsAlerts' ? 'SMS' : 'Voice'} alerts ${value ? 'on' : 'off'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update alert settings'));
    } finally {
      setBusy(null);
    }
  }

  async function test(channel) {
    setBusy(`test-${channel}`);
    try {
      const alert = await sendTestAlert(channel);
      toast.success(
        alert.status === 'simulated'
          ? `Test ${channel === 'voice' ? 'call' : 'SMS'} simulated to ${alert.to_number} (no SMS gateway configured)`
          : alert.status === 'sent'
            ? `Test ${channel === 'voice' ? 'call' : 'SMS'} sent to ${alert.to_number}`
            : `Delivery failed: ${alert.error}`
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send test alert'));
    } finally {
      setBusy(null);
    }
  }

  const rows = [
    { key: 'smsAlerts', field: 'sms_alerts', channel: 'sms', icon: MessageSquare, title: 'SMS alerts', desc: what.sms, tone: 'tone-blue' },
    { key: 'voiceAlerts', field: 'voice_alerts', channel: 'voice', icon: PhoneCall, title: 'Voice call alerts', desc: what.voice, tone: 'tone-violet' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3>SMS & voice alerts</h3>
      </div>
      <div className="card-body stack">
        {!hasPhone && (
          <div className="alert tone-amber">Add a mobile number in your personal details to turn on alerts.</div>
        )}
        {rows.map(({ key, field, channel, icon: Icon, title, desc, tone }) => (
          <div key={key} className="row" style={{ alignItems: 'flex-start' }}>
            <div className={`stat-icon ${tone}`} style={{ width: 38, height: 38 }}><Icon size={18} /></div>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{title}</div>
              <div className="subtle">{desc}</div>
              {hasPhone && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, paddingLeft: 0 }} disabled={busy === `test-${channel}`} onClick={() => test(channel)}>
                  <Send size={13} /> {busy === `test-${channel}` ? 'Sending…' : 'Send test'}
                </button>
              )}
            </div>
            <Toggle label={title} checked={Boolean(user[field])} disabled={!hasPhone || busy === key} onChange={(v) => toggle(key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
