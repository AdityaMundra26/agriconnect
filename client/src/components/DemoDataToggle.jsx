import { useState } from 'react';
import { Database, DatabaseZap, Trash2 } from 'lucide-react';
import { enableDemo, disableDemo } from '../api/demo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ConfirmDialog } from './ui.jsx';
import { errorMessage } from '../utils/format.js';

// Load / remove the sample demo data.
//   status:   { enabled, counts, toggle } from GET /demo
//   onChange: called with the new status after a load/remove
//   variant:  'card' (Admin Console) or 'compact' (login page)
export default function DemoDataToggle({ status, onChange, variant = 'card' }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!status) return null;
  const { enabled, counts } = status;
  const usingDemoAccount = user?.email?.endsWith('@demo.com');

  async function load() {
    setBusy(true);
    try {
      const next = await enableDemo();
      onChange?.(next);
      toast.success(`Sample data loaded: ${next.counts.users} accounts, ${next.counts.listings} listings, ${next.counts.orders} orders`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load sample data'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const next = await disableDemo();
      setConfirmRemove(false);
      toast.success('Sample data removed');
      // The signed-in demo account no longer exists.
      if (usingDemoAccount) logout();
      else onChange?.(next);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove sample data'));
    } finally {
      setBusy(false);
    }
  }

  const button = enabled ? (
    <button type="button" className={`btn btn-danger-soft ${variant === 'compact' ? 'btn-sm' : ''}`} disabled={busy} onClick={() => setConfirmRemove(true)}>
      <Trash2 size={15} /> Remove sample data
    </button>
  ) : (
    <button type="button" className={`btn ${variant === 'compact' ? 'btn-sm' : ''}`} disabled={busy} onClick={load}>
      {busy ? <><span className="spinner" /> Loading sample data…</> : <><DatabaseZap size={16} /> Load sample data</>}
    </button>
  );

  const confirm = (
    <ConfirmDialog
      open={confirmRemove}
      title="Remove sample data?"
      message={`This deletes all ${counts.users} demo accounts (@demo.com) and everything they own: ${counts.listings} listings, ${counts.orders} orders and ${counts.reports} field reports. Real accounts are not affected.${usingDemoAccount ? ' You are signed in with a demo account, so you will be logged out.' : ''} You can load it again at any time.`}
      confirmLabel="Remove sample data"
      busy={busy}
      onConfirm={remove}
      onClose={() => setConfirmRemove(false)}
    />
  );

  if (variant === 'compact') {
    return (
      <div className="demo-toggle-compact">
        <span className="subtle">{enabled ? 'Sample data is loaded.' : 'Sample data is off. Load it to try the demo accounts.'}</span>
        {button}
        {confirm}
      </div>
    );
  }

  return (
    <div className="card card-pad row wrap" style={{ marginBottom: '1.5rem' }}>
      <div className={`stat-icon ${enabled ? 'tone-green' : 'tone-gray'}`}><Database size={20} /></div>
      <div className="grow">
        <h3 className="row" style={{ gap: '0.5rem' }}>
          Sample demo data
          <span className={`badge ${enabled ? 'tone-green' : 'tone-gray'}`}><span className="dot" />{enabled ? 'On' : 'Off'}</span>
        </h3>
        <p className="subtle" style={{ marginTop: 2 }}>
          {enabled
            ? `${counts.users} demo accounts · ${counts.listings} listings · ${counts.orders} orders · ${counts.reports} field reports`
            : 'Load realistic farms, listings, orders and reports for demos. Only @demo.com accounts are created.'}
        </p>
      </div>
      {button}
      {confirm}
    </div>
  );
}
