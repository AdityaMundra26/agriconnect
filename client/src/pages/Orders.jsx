import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check, Truck, PackageCheck, XCircle, MapPin, Search, IndianRupee, Clock, CheckCircle2 } from 'lucide-react';
import { listOrders, updateOrderStatus } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLoader } from '../hooks/useLoader.js';
import { PageHeader, EmptyState, StatusBadge, ConfirmDialog, FormError, SkeletonRows, StatCard } from '../components/ui.jsx';
import { ORDER_FLOW, ORDER_NEXT, cropEmoji, cropTint } from '../utils/constants.js';
import { inr, inrCompact, num, formatDate, timeAgo, errorMessage } from '../utils/format.js';

const ACTION = {
  confirmed: { text: 'Confirm', icon: Check, cls: '' },
  shipped: { text: 'Mark shipped', icon: Truck, cls: '' },
  delivered: { text: 'Mark delivered', icon: PackageCheck, cls: '' },
  cancelled: { text: 'Cancel', icon: XCircle, cls: 'btn-danger-soft' },
};

function Stepper({ status }) {
  if (status === 'cancelled') {
    return <div className="alert tone-gray" style={{ padding: '0.45rem 0.7rem' }}><XCircle size={16} /> This order was cancelled. Stock was returned to the listing.</div>;
  }
  const idx = ORDER_FLOW.indexOf(status);
  return (
    <div>
      <div className="stepper">
        {ORDER_FLOW.map((s, i) => (
          <div key={s} className="step">
            <div className={`step-dot ${i < idx || status === 'delivered' ? 'done' : i === idx ? 'current' : ''}`}>
              {(i < idx || status === 'delivered') && <Check size={12} strokeWidth={3} />}
            </div>
            {i < ORDER_FLOW.length - 1 && <div className={`step-line ${i < idx ? 'done' : ''}`} />}
          </div>
        ))}
      </div>
      <div className="step-labels">
        {ORDER_FLOW.map((s) => <span key={s} style={{ textTransform: 'capitalize' }}>{s}</span>)}
      </div>
    </div>
  );
}

function allowedActions(order, user) {
  if (user.role === 'buyer') return order.status === 'pending' ? ['cancelled'] : [];
  return ORDER_NEXT[order.status];
}

export default function Orders() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: orders, setData, loading, error } = useLoader(listOrders);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  async function change(order, status) {
    setBusy(order.id);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setData((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      toast.success(`Order #${order.id} ${status === 'cancelled' ? 'cancelled' : `marked ${status}`}`);
      setConfirmCancel(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update order'));
    } finally {
      setBusy(null);
    }
  }

  const list = orders || [];
  const active = list.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.status));
  const tabs = [
    ['all', 'All', list.length],
    ['active', 'In progress', active.length],
    ['delivered', 'Delivered', list.filter((o) => o.status === 'delivered').length],
    ['cancelled', 'Cancelled', list.filter((o) => o.status === 'cancelled').length],
  ];
  const q = query.trim().toLowerCase();
  const shown = list
    .filter((o) => (tab === 'all' ? true : tab === 'active' ? active.includes(o) : o.status === tab))
    .filter((o) => !q || o.crop_name.toLowerCase().includes(q) || String(o.id) === q.replace('#', '') || (o.buyer_name || '').toLowerCase().includes(q) || (o.farmer_name || '').toLowerCase().includes(q));

  const value = list.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price), 0);
  const isFarmer = user.role === 'farmer';

  return (
    <>
      <PageHeader
        title="Orders"
        description={isFarmer ? 'Orders buyers have placed on your listings. Move them through confirmation to delivery.' : user.role === 'buyer' ? 'Track everything you have ordered.' : 'Every order on the platform.'}
        actions={user.role === 'buyer' && <Link to="/marketplace" className="btn">Browse produce</Link>}
      />

      {orders && list.length > 0 && (
        <div className="stats">
          <StatCard icon={IndianRupee} label={isFarmer ? 'Sales value' : user.role === 'buyer' ? 'Total spent' : 'Order value'} value={inrCompact(value)} tone="green" />
          <StatCard icon={Clock} label="In progress" value={active.length} sub={isFarmer ? `${list.filter((o) => o.status === 'pending').length} need confirmation` : undefined} tone="amber" />
          <StatCard icon={CheckCircle2} label="Delivered" value={list.filter((o) => o.status === 'delivered').length} tone="blue" />
        </div>
      )}

      <div className="tabs">
        {tabs.map(([v, t, c]) => (
          <button key={v} className={`tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}>
            {t} <span className="count">{c}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <div className="input-group">
          <Search size={17} />
          <input className="input" placeholder="Search by crop, order # or name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <FormError>{error}</FormError>
      {loading && !orders ? (
        <div className="card"><SkeletonRows rows={4} height={120} /></div>
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShoppingBag} title={list.length ? 'No orders here' : 'No orders yet'}>
            {!list.length && (user.role === 'buyer' ? 'Browse the marketplace and place your first order.' : isFarmer ? 'When buyers order your produce, it shows up here.' : '')}
          </EmptyState>
        </div>
      ) : (
        <div className="stack">
          {shown.map((o) => {
            const actions = allowedActions(o, user);
            return (
              <div key={o.id} className="card">
                <div className="card-body stack">
                  <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                    <div className={`stat-icon ${cropTint(o.crop_name)}`} style={{ fontSize: '1.4rem', width: 48, height: 48 }}>{cropEmoji(o.crop_name)}</div>
                    <div className="grow">
                      <div className="row wrap" style={{ gap: '0.5rem' }}>
                        <h3>{o.crop_name}</h3>
                        <StatusBadge kind="order" value={o.status} />
                      </div>
                      <div className="subtle" style={{ marginTop: 3 }}>
                        Order #{o.id} · placed {formatDate(o.created_at)} · {timeAgo(o.updated_at || o.created_at)} last update
                      </div>
                      <div className="muted" style={{ fontSize: '0.88rem', marginTop: 6 }}>
                        {num(o.quantity)} {o.unit} × {inr(o.unit_price)} ·{' '}
                        {user.role !== 'buyer' && <>Buyer: <strong>{o.buyer_name}</strong>{user.role === 'admin' && ' · '}</>}
                        {user.role !== 'farmer' && <>Farmer: <strong>{o.farmer_name}</strong></>}
                      </div>
                      {o.delivery_address && (
                        <div className="subtle row" style={{ gap: 4, marginTop: 4 }}><MapPin size={13} /> {o.delivery_address}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="subtle">Total</div>
                      <div className="num" style={{ fontSize: '1.3rem', fontWeight: 750 }}>{inr(o.total_price)}</div>
                    </div>
                  </div>
                  <Stepper status={o.status} />
                  {actions.length > 0 && (
                    <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                      {actions.map((s) => {
                        const a = ACTION[s];
                        const Icon = a.icon;
                        return (
                          <button
                            key={s}
                            className={`btn btn-sm ${a.cls}`}
                            disabled={busy === o.id}
                            onClick={() => (s === 'cancelled' ? setConfirmCancel(o) : change(o, s))}
                          >
                            <Icon size={15} /> {a.text}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        title={`Cancel order #${confirmCancel?.id}?`}
        message={`${confirmCancel ? `${num(confirmCancel.quantity)} ${confirmCancel.unit} of ${confirmCancel.crop_name}` : ''} will be returned to the listing's stock. This can't be undone.`}
        confirmLabel="Cancel order"
        busy={busy === confirmCancel?.id}
        onConfirm={() => change(confirmCancel, 'cancelled')}
        onClose={() => setConfirmCancel(null)}
      />
    </>
  );
}
