import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, MapPin, User, Package, Pencil, ShoppingCart, Store, SlidersHorizontal, X } from 'lucide-react';
import { browseListings, myListings, createListing, updateListing } from '../api/listings.js';
import { createOrder } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLoader } from '../hooks/useLoader.js';
import { PageHeader, Modal, EmptyState, StatusBadge, FormError, Field, SkeletonGrid } from '../components/ui.jsx';
import { UNITS, cropEmoji, cropTint } from '../utils/constants.js';
import { inr, num, timeAgo, errorMessage } from '../utils/format.js';

// ---------------------------------------------------------------------------
// Product card (shared between buyer browse and farmer views)
// ---------------------------------------------------------------------------
function ProductCard({ listing, footer, showStatus }) {
  return (
    <div className="product">
      <div className={`product-media ${cropTint(listing.crop_name)}`}>
        <span aria-hidden="true">{cropEmoji(listing.crop_name)}</span>
        {showStatus && <StatusBadge kind="listing" value={listing.status} />}
      </div>
      <div className="product-body">
        <div className="row-between">
          <h3>{listing.crop_name}</h3>
          <span className="subtle">{timeAgo(listing.created_at)}</span>
        </div>
        <div className="product-price">
          {inr(listing.unit_price)} <small>/ {listing.unit}</small>
        </div>
        <div className="product-meta">
          <span><Package size={14} /> {num(listing.quantity)} {listing.unit} available</span>
          {listing.farmer_name && <span><User size={14} /> {listing.farmer_name}</span>}
          {listing.seller_location && <span><MapPin size={14} /> {listing.seller_location}</span>}
        </div>
        {listing.quality_notes && <p className="subtle" style={{ marginTop: 2 }}>“{listing.quality_notes}”</p>}
      </div>
      {footer && <div className="product-footer">{footer}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order modal (buyer)
// ---------------------------------------------------------------------------
function OrderModal({ listing, onClose, onOrdered }) {
  const toast = useToast();
  const [qty, setQty] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prevId, setPrevId] = useState(null);

  if ((listing?.id ?? null) !== prevId) {
    setPrevId(listing?.id ?? null);
    setQty('');
    setError('');
  }
  if (!listing) return null;

  const max = Number(listing.quantity);
  const q = Number(qty);
  const valid = q > 0 && q <= max;
  const total = valid ? q * Number(listing.unit_price) : 0;

  async function submit(e) {
    e.preventDefault();
    if (!valid) return setError(`Enter a quantity between 0 and ${num(max)} ${listing.unit}`);
    setSaving(true);
    setError('');
    try {
      const order = await createOrder({ listingId: listing.id, quantity: q, deliveryAddress: address || undefined });
      toast.success(`Order #${order.id} placed. The farmer has been notified.`);
      onOrdered(order);
    } catch (err) {
      setError(errorMessage(err, 'Failed to place order'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Order ${listing.crop_name}`} description={`Sold by ${listing.farmer_name}${listing.seller_location ? ` · ${listing.seller_location}` : ''}`}>
      <form onSubmit={submit} className="stack">
        <FormError>{error}</FormError>
        <div className="row card card-pad" style={{ background: 'var(--surface-2)' }}>
          <span style={{ fontSize: '2rem' }}>{cropEmoji(listing.crop_name)}</span>
          <div className="grow">
            <strong>{inr(listing.unit_price)} / {listing.unit}</strong>
            <div className="subtle">{num(max)} {listing.unit} available</div>
          </div>
        </div>
        <Field label={`Quantity (${listing.unit})`}>
          <div className="row" style={{ gap: '0.5rem' }}>
            <input className="input" type="number" min="0.01" step="0.01" max={max} required value={qty} onChange={(e) => setQty(e.target.value)} placeholder={`Up to ${num(max)}`} />
            <button type="button" className="btn btn-secondary" onClick={() => setQty(String(max))}>Max</button>
          </div>
        </Field>
        <Field label="Delivery address" hint="Optional, shared with the farmer">
          <textarea className="textarea" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Warehouse / shop address" />
        </Field>
        <div className="row-between card card-pad" style={{ background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
          <span className="muted">Order total</span>
          <strong style={{ fontSize: '1.35rem' }} className="num">{inr(total)}</strong>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving || !valid}>{saving ? <span className="spinner" /> : <><ShoppingCart size={17} /> Place order</>}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Listing create/edit modal (farmer)
// ---------------------------------------------------------------------------
function ListingModal({ open, listing, onClose, onSaved }) {
  const toast = useToast();
  const empty = { cropName: '', quantity: '', unit: 'kg', unitPrice: '', qualityNotes: '', status: 'active' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prevKey, setPrevKey] = useState(null);

  const key = open ? listing?.id ?? 'new' : null;
  if (key !== prevKey) {
    setPrevKey(key);
    setError('');
    setForm(
      listing
        ? {
            cropName: listing.crop_name,
            quantity: Number(listing.quantity),
            unit: listing.unit,
            unitPrice: Number(listing.unit_price),
            qualityNotes: listing.quality_notes || '',
            status: listing.status,
          }
        : empty
    );
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        cropName: form.cropName.trim(),
        quantity: Number(form.quantity),
        unit: form.unit,
        unitPrice: Number(form.unitPrice),
        qualityNotes: form.qualityNotes,
      };
      const saved = listing
        ? await updateListing(listing.id, { ...payload, status: form.status })
        : await createListing(payload);
      toast.success(listing ? 'Listing updated' : 'Listing published to the marketplace');
      onSaved(saved, !listing);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save listing'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={listing ? 'Edit listing' : 'List produce for sale'} description="Buyers see this on the marketplace immediately.">
      <form onSubmit={submit} className="stack">
        <FormError>{error}</FormError>
        <div className="form-grid">
          <Field label="Crop" className="span-2">
            <input className="input" required value={form.cropName} onChange={set('cropName')} placeholder="Tomato" />
          </Field>
          <Field label="Quantity available">
            <div className="row" style={{ gap: '0.5rem' }}>
              <input className="input" type="number" required min={listing ? 0 : 0.01} step="0.01" value={form.quantity} onChange={set('quantity')} />
              <select className="select" style={{ width: 110 }} value={form.unit} onChange={set('unit')}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </Field>
          <Field label={`Price per ${form.unit} (₹)`}>
            <input className="input" type="number" required min="0.01" step="0.01" value={form.unitPrice} onChange={set('unitPrice')} />
          </Field>
          <Field label="Quality notes" className="span-2" hint="Grade, variety, moisture, packaging…">
            <textarea className="textarea" rows={2} value={form.qualityNotes} onChange={set('qualityNotes')} placeholder="Grade A, harvested this week" />
          </Field>
          {listing && (
            <Field label="Status" className="span-2">
              <select className="select" value={form.status} onChange={set('status')}>
                <option value="active">Active: visible to buyers</option>
                <option value="sold_out">Sold out</option>
                <option value="closed">Closed: hidden from buyers</option>
              </select>
            </Field>
          )}
        </div>
        {form.quantity && form.unitPrice && (
          <p className="subtle">Total stock value: <strong>{inr(Number(form.quantity) * Number(form.unitPrice))}</strong></p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? <span className="spinner" /> : listing ? 'Save changes' : 'Publish listing'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Browse view (buyers, plus read-only for farmers/admin)
// ---------------------------------------------------------------------------
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'quantity_desc', label: 'Most stock' },
];

function BrowseView({ canOrder, currentUserId }) {
  const [filters, setFilters] = useState({ cropName: '', minPrice: '', maxPrice: '', sort: 'newest' });
  const [applied, setApplied] = useState(filters);
  const [showFilters, setShowFilters] = useState(false);
  const [ordering, setOrdering] = useState(null);

  // Debounce the text search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setApplied(filters), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const { data: listings, loading, error, reload } = useLoader(() => {
    const params = { sort: applied.sort };
    if (applied.cropName) params.cropName = applied.cropName;
    if (applied.minPrice) params.minPrice = applied.minPrice;
    if (applied.maxPrice) params.maxPrice = applied.maxPrice;
    return browseListings(params);
  }, [applied]);

  const hasFilters = filters.cropName || filters.minPrice || filters.maxPrice;

  return (
    <>
      <div className="toolbar">
        <div className="input-group">
          <Search size={17} />
          <input className="input" placeholder="Search crops: tomato, onion, wheat…" value={filters.cropName} onChange={(e) => setFilters({ ...filters, cropName: e.target.value })} />
        </div>
        <select className="select" style={{ width: 190 }} value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className={`btn ${showFilters ? '' : 'btn-secondary'}`} onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal size={16} /> Price
        </button>
        {hasFilters && (
          <button className="btn btn-ghost" onClick={() => setFilters({ cropName: '', minPrice: '', maxPrice: '', sort: filters.sort })}>
            <X size={16} /> Clear
          </button>
        )}
      </div>
      {showFilters && (
        <div className="card card-pad row wrap" style={{ marginBottom: '1.1rem' }}>
          <Field label="Min price (₹)"><input className="input" type="number" min="0" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} /></Field>
          <Field label="Max price (₹)"><input className="input" type="number" min="0" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} /></Field>
        </div>
      )}

      <FormError>{error}</FormError>
      {loading && !listings ? (
        <SkeletonGrid />
      ) : listings?.length === 0 ? (
        <div className="card">
          <EmptyState icon={Store} title={hasFilters ? 'No listings match your search' : 'No produce listed yet'}>
            {hasFilters ? 'Try a different crop or widen the price range.' : 'Check back soon. Farmers are adding produce regularly.'}
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="subtle" style={{ marginBottom: '0.75rem' }}>{listings.length} listing{listings.length === 1 ? '' : 's'}</p>
          <div className="grid-cards">
            {listings.map((l) => (
              <ProductCard
                key={l.id}
                listing={l}
                footer={
                  canOrder ? (
                    <button className="btn btn-block" onClick={() => setOrdering(l)}><ShoppingCart size={16} /> Order now</button>
                  ) : l.farmer_id === currentUserId ? (
                    <span className="subtle">This is your listing</span>
                  ) : null
                }
              />
            ))}
          </div>
        </>
      )}

      <OrderModal listing={ordering} onClose={() => setOrdering(null)} onOrdered={() => { setOrdering(null); reload(); }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Farmer's own listings
// ---------------------------------------------------------------------------
function MyListingsView() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data: listings, setData, loading, error } = useLoader(myListings);
  const [modal, setModal] = useState({ open: params.get('new') === '1', listing: null });
  const [statusFilter, setStatusFilter] = useState('all');

  function closeModal() {
    setModal({ open: false, listing: null });
    if (params.get('new')) setParams({}, { replace: true });
  }

  async function quickStatus(l, status) {
    try {
      const updated = await updateListing(l.id, { status });
      setData((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(`Listing marked ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update listing'));
    }
  }

  const counts = (listings || []).reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] || 0) + 1 }), {});
  const shown = (listings || []).filter((l) => statusFilter === 'all' || l.status === statusFilter);

  return (
    <>
      <div className="row-between wrap" style={{ marginBottom: '1.1rem' }}>
        <div className="chips">
          {[['all', 'All', listings?.length || 0], ['active', 'Active', counts.active || 0], ['sold_out', 'Sold out', counts.sold_out || 0], ['closed', 'Closed', counts.closed || 0]].map(([v, t, c]) => (
            <button key={v} className={`chip ${statusFilter === v ? 'active' : ''}`} onClick={() => setStatusFilter(v)}>{t} · {c}</button>
          ))}
        </div>
        <button className="btn" onClick={() => setModal({ open: true, listing: null })}><Plus size={17} /> New listing</button>
      </div>
      <FormError>{error}</FormError>
      {loading && !listings ? (
        <SkeletonGrid count={3} />
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState icon={Package} title={listings?.length ? 'Nothing in this filter' : 'You have no listings yet'} action={!listings?.length && <button className="btn" onClick={() => setModal({ open: true, listing: null })}><Plus size={17} /> List your first produce</button>}>
            {!listings?.length && 'Publish your harvest so buyers can order directly from you.'}
          </EmptyState>
        </div>
      ) : (
        <div className="grid-cards">
          {shown.map((l) => (
            <ProductCard
              key={l.id}
              listing={{ ...l, farmer_name: null }}
              showStatus
              footer={
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setModal({ open: true, listing: l })}><Pencil size={14} /> Edit</button>
                  {l.status === 'active' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => quickStatus(l, 'closed')}>Close</button>
                  ) : Number(l.quantity) > 0 ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => quickStatus(l, 'active')}>Re-activate</button>
                  ) : null}
                  <span className="subtle" style={{ marginLeft: 'auto' }}>{l.order_count} order{l.order_count === 1 ? '' : 's'}</span>
                </>
              }
            />
          ))}
        </div>
      )}
      <ListingModal
        open={modal.open}
        listing={modal.listing}
        onClose={closeModal}
        onSaved={(saved, isNew) => {
          setData((list) => (isNew ? [saved, ...(list || [])] : list.map((x) => (x.id === saved.id ? saved : x))));
          closeModal();
        }}
      />
    </>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const [tab, setTab] = useState(user.role === 'farmer' ? 'mine' : 'browse');

  if (user.role === 'buyer') {
    return (
      <>
        <PageHeader title="Marketplace" description="Fresh produce straight from farmers. No middlemen." actions={<Link to="/orders" className="btn btn-secondary">My orders</Link>} />
        <BrowseView canOrder currentUserId={user.id} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Marketplace"
        description={user.role === 'farmer' ? 'Manage your produce listings and see what is selling.' : 'All active listings on the platform. Moderate them from the Admin Console.'}
      />
      {user.role === 'farmer' && (
        <div className="tabs">
          <button className={`tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My listings</button>
          <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Market prices</button>
        </div>
      )}
      {tab === 'mine' && user.role === 'farmer' ? <MyListingsView /> : <BrowseView canOrder={false} currentUserId={user.id} />}
    </>
  );
}
