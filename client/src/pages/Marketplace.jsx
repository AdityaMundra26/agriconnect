import { useEffect, useState } from 'react';
import { browseListings, myListings, createListing, updateListing } from '../api/listings.js';
import { listOrders, createOrder, updateOrderStatus } from '../api/orders.js';
import { useAuth } from '../context/AuthContext.jsx';

const LISTING_STATUSES = ['active', 'sold_out', 'closed'];
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const emptyListingForm = { cropName: '', quantity: '', unit: 'kg', unitPrice: '', qualityNotes: '' };

export default function Marketplace() {
  const { user } = useAuth();
  const isFarmer = user.role === 'farmer';
  const isBuyer = user.role === 'buyer';

  const [error, setError] = useState('');

  // Browse (buyers)
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ cropName: '', minPrice: '', maxPrice: '' });
  const [orderQuantities, setOrderQuantities] = useState({});
  const [orderingId, setOrderingId] = useState(null);

  // My listings (farmers)
  const [mine, setMine] = useState([]);
  const [listingForm, setListingForm] = useState(emptyListingForm);
  const [creatingListing, setCreatingListing] = useState(false);

  // Orders (everyone)
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (isBuyer) loadListings();
    if (isFarmer) loadMine();
    loadOrders();
  }, []);

  async function loadListings(overrideFilters = filters) {
    setError('');
    try {
      const params = {};
      if (overrideFilters.cropName) params.cropName = overrideFilters.cropName;
      if (overrideFilters.minPrice) params.minPrice = overrideFilters.minPrice;
      if (overrideFilters.maxPrice) params.maxPrice = overrideFilters.maxPrice;
      setListings(await browseListings(params));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load listings');
    }
  }

  async function loadMine() {
    try {
      setMine(await myListings());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your listings');
    }
  }

  async function loadOrders() {
    try {
      setOrders(await listOrders());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders');
    }
  }

  function handleFilterSubmit(e) {
    e.preventDefault();
    loadListings();
  }

  async function handleCreateListing(e) {
    e.preventDefault();
    setError('');
    setCreatingListing(true);
    try {
      const created = await createListing({
        cropName: listingForm.cropName,
        quantity: Number(listingForm.quantity),
        unit: listingForm.unit,
        unitPrice: Number(listingForm.unitPrice),
        qualityNotes: listingForm.qualityNotes || undefined,
      });
      setMine((prev) => [created, ...prev]);
      setListingForm(emptyListingForm);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setCreatingListing(false);
    }
  }

  async function handleListingStatusChange(id, status) {
    setError('');
    try {
      const updated = await updateListing(id, { status });
      setMine((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update listing');
    }
  }

  async function handlePlaceOrder(listingId) {
    setError('');
    const quantity = Number(orderQuantities[listingId]);
    if (!quantity || quantity <= 0) {
      setError('Enter a valid quantity to order');
      return;
    }
    setOrderingId(listingId);
    try {
      await createOrder({ listingId, quantity });
      await loadListings();
      await loadOrders();
      setOrderQuantities((prev) => ({ ...prev, [listingId]: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setOrderingId(null);
    }
  }

  async function handleOrderStatusChange(id, status) {
    setError('');
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update order');
    }
  }

  return (
    <div className="page">
      <h1>Marketplace</h1>
      {error && <p className="error">{error}</p>}

      {isFarmer && (
        <>
          <h2>My Listings</h2>
          <form className="card" onSubmit={handleCreateListing}>
            <label>
              Crop
              <input
                required
                value={listingForm.cropName}
                onChange={(e) => setListingForm({ ...listingForm, cropName: e.target.value })}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={listingForm.quantity}
                onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
              />
            </label>
            <label>
              Unit
              <input
                value={listingForm.unit}
                onChange={(e) => setListingForm({ ...listingForm, unit: e.target.value })}
              />
            </label>
            <label>
              Price per unit (₹)
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={listingForm.unitPrice}
                onChange={(e) => setListingForm({ ...listingForm, unitPrice: e.target.value })}
              />
            </label>
            <label>
              Quality notes
              <input
                value={listingForm.qualityNotes}
                onChange={(e) => setListingForm({ ...listingForm, qualityNotes: e.target.value })}
              />
            </label>
            <button type="submit" disabled={creatingListing}>
              {creatingListing ? 'Creating...' : 'Create listing'}
            </button>
          </form>

          {mine.length === 0 ? (
            <p>You haven't listed any produce yet.</p>
          ) : (
            <ul className="plot-list">
              {mine.map((l) => (
                <li key={l.id} className="card">
                  <p><strong>{l.crop_name}</strong> — {l.quantity} {l.unit} @ ₹{l.unit_price}/{l.unit}</p>
                  {l.quality_notes && <p className="hint">{l.quality_notes}</p>}
                  <label>
                    Status
                    <select
                      value={l.status}
                      onChange={(e) => handleListingStatusChange(l.id, e.target.value)}
                    >
                      {LISTING_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {isBuyer && (
        <>
          <h2>Browse Produce</h2>
          <form className="card filters" onSubmit={handleFilterSubmit}>
            <label>
              Crop
              <input
                value={filters.cropName}
                onChange={(e) => setFilters({ ...filters, cropName: e.target.value })}
              />
            </label>
            <label>
              Min price
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              />
            </label>
            <label>
              Max price
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              />
            </label>
            <button type="submit">Search</button>
          </form>

          {listings.length === 0 ? (
            <p>No listings match your search.</p>
          ) : (
            <ul className="plot-list">
              {listings.map((l) => (
                <li key={l.id} className="card">
                  <p><strong>{l.crop_name}</strong> — {l.quantity} {l.unit} available @ ₹{l.unit_price}/{l.unit}</p>
                  <p className="hint">Sold by {l.farmer_name}</p>
                  {l.quality_notes && <p className="hint">{l.quality_notes}</p>}
                  <div className="form-actions">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={l.quantity}
                      placeholder={`qty (${l.unit})`}
                      value={orderQuantities[l.id] || ''}
                      onChange={(e) => setOrderQuantities({ ...orderQuantities, [l.id]: e.target.value })}
                      style={{ maxWidth: '120px' }}
                    />
                    <button
                      type="button"
                      onClick={() => handlePlaceOrder(l.id)}
                      disabled={orderingId === l.id}
                    >
                      {orderingId === l.id ? 'Placing...' : 'Place order'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <ul className="plot-list">
          {orders.map((o) => (
            <li key={o.id} className="card">
              <p>
                <strong>{o.crop_name}</strong> — {o.quantity} for ₹{o.total_price}
              </p>
              <span className="badge outline">{o.status}</span>
              {isFarmer && (
                <label>
                  Update status
                  <select value={o.status} onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {isBuyer && o.status === 'pending' && (
                <button type="button" className="danger-btn" onClick={() => handleOrderStatusChange(o.id, 'cancelled')}>
                  Cancel order
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
