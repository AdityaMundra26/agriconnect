import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, Search, ClipboardList, ArrowRight, MessageSquare, PhoneCall, RefreshCw } from 'lucide-react';
import { adminListings, updateListing } from '../api/listings.js';
import { getAdminUsers, getAdminAlerts } from '../api/dashboard.js';
import { useToast } from '../context/ToastContext.jsx';
import { useLoader } from '../hooks/useLoader.js';
import { PageHeader, StatusBadge, EmptyState, SkeletonRows, FormError, Avatar, ConfirmDialog, Badge } from '../components/ui.jsx';
import { cropEmoji } from '../utils/constants.js';
import { inr, num, formatDate, errorMessage, label, timeAgo } from '../utils/format.js';

function UsersTab() {
  const { data: users, loading, error } = useLoader(getAdminUsers);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const q = query.toLowerCase();
  const shown = (users || []).filter((u) => (!role || u.role === role) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));

  return (
    <>
      <div className="toolbar">
        <div className="input-group">
          <Search size={17} />
          <input className="input" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chips">
          {['', 'farmer', 'buyer', 'admin'].map((r) => (
            <button key={r} className={`chip ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
              {r ? `${r}s` : 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <FormError>{error}</FormError>
        {loading && !users ? (
          <SkeletonRows />
        ) : shown.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th className="right">Listings</th><th className="right">Orders</th><th className="right">Reports</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div className="subtle">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge kind="role" value={u.role} dot={false} /></td>
                    <td className="right num">{u.listings}</td>
                    <td className="right num">{u.orders}</td>
                    <td className="right num">{u.reports}</td>
                    <td className="nowrap">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function ListingsTab() {
  const toast = useToast();
  const { data: listings, setData, loading, error } = useLoader(adminListings);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null); // { listing, status }
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      const updated = await updateListing(pending.listing.id, { status: pending.status });
      setData((list) => list.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      toast.success(`Listing set to ${label(pending.status)}. The farmer has been notified.`);
      setPending(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update listing'));
    } finally {
      setBusy(false);
    }
  }

  const q = query.toLowerCase();
  const shown = (listings || []).filter((l) => (!status || l.status === status) && (!q || l.crop_name.toLowerCase().includes(q) || l.farmer_name.toLowerCase().includes(q)));

  return (
    <>
      <div className="toolbar">
        <div className="input-group">
          <Search size={17} />
          <input className="input" placeholder="Search crop or seller" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chips">
          {['', 'active', 'sold_out', 'closed'].map((s) => (
            <button key={s} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
              {s ? label(s) : 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <FormError>{error}</FormError>
        {loading && !listings ? (
          <SkeletonRows />
        ) : shown.length === 0 ? (
          <EmptyState icon={Store} title="No listings found" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Listing</th><th>Seller</th><th className="right">Stock</th><th className="right">Price</th><th className="right">Orders</th><th>Status</th><th>Moderate</th></tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="row">
                        <span style={{ fontSize: '1.3rem' }}>{cropEmoji(l.crop_name)}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{l.crop_name}</div>
                          {l.quality_notes && <div className="subtle" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.quality_notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{l.farmer_name}</div>
                      {l.seller_location && <div className="subtle">{l.seller_location}</div>}
                    </td>
                    <td className="right num nowrap">{num(l.quantity)} {l.unit}</td>
                    <td className="right num nowrap">{inr(l.unit_price)}/{l.unit}</td>
                    <td className="right num">{l.order_count}</td>
                    <td><StatusBadge kind="listing" value={l.status} /></td>
                    <td>
                      <select
                        className="select"
                        style={{ height: 32, width: 130, fontSize: '0.84rem' }}
                        value={l.status}
                        onChange={(e) => setPending({ listing: l, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="sold_out">Sold out</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        danger={pending?.status === 'closed'}
        title={`Set listing to ${label(pending?.status)}?`}
        message={`${pending?.listing.crop_name} by ${pending?.listing.farmer_name} will be marked ${label(pending?.status)}. The farmer will get a notification.`}
        confirmLabel="Update listing"
        busy={busy}
        onConfirm={apply}
        onClose={() => setPending(null)}
      />
    </>
  );
}

const ALERT_TONE = { sent: 'green', simulated: 'blue', failed: 'red' };

function AlertsTab() {
  const { data, loading, error, reload } = useLoader(getAdminAlerts);
  const alerts = data?.alerts || [];
  return (
    <>
      <div className="row-between wrap" style={{ marginBottom: '1.1rem' }}>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          {data?.provider === 'twilio'
            ? 'SMS and voice alerts are delivered through Twilio.'
            : 'No SMS gateway configured: alerts are simulated (logged here, not sent). Set the TWILIO_* variables to deliver real SMS and calls.'}
        </p>
        <button className="btn btn-secondary btn-sm" onClick={reload}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div className="card">
        <FormError>{error}</FormError>
        {loading && !data ? (
          <SkeletonRows />
        ) : alerts.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No alerts sent yet">Alerts appear here when orders or reports trigger SMS or voice messages.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>When</th><th>Channel</th><th>Recipient</th><th>Message</th><th>Status</th></tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td className="nowrap subtle">{timeAgo(a.created_at)}</td>
                    <td>
                      <span className="row" style={{ gap: 6 }}>
                        {a.channel === 'voice' ? <PhoneCall size={15} /> : <MessageSquare size={15} />}
                        {a.channel === 'voice' ? 'Voice' : 'SMS'}
                      </span>
                    </td>
                    <td className="nowrap">
                      <div>{a.user_name || 'Deleted user'}</div>
                      <div className="subtle">{a.to_number}</div>
                    </td>
                    <td style={{ maxWidth: 420 }}>{a.message}{a.error && <div className="subtle" style={{ color: 'var(--red)' }}>{a.error}</div>}</td>
                    <td><Badge tone={ALERT_TONE[a.status] || 'gray'} dot>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('listings');
  return (
    <>
      <PageHeader
        title="Admin Console"
        description="Moderate marketplace listings and manage platform users."
        actions={<Link to="/reports" className="btn btn-secondary"><ClipboardList size={16} /> Field report queue <ArrowRight size={15} /></Link>}
      />
      <div className="tabs">
        <button className={`tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}><Store size={16} /> Listings</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}><Users size={16} /> Users</button>
        <button className={`tab ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}><MessageSquare size={16} /> SMS & voice log</button>
      </div>
      {tab === 'listings' ? <ListingsTab /> : tab === 'users' ? <UsersTab /> : <AlertsTab />}
    </>
  );
}
