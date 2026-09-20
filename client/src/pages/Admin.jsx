import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListings, updateListing } from '../api/listings.js';
import { useAuth } from '../context/AuthContext.jsx';

const LISTING_STATUSES = ['active', 'sold_out', 'closed'];

export default function Admin() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role !== 'admin') return;
    adminListings()
      .then(setListings)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load listings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id, status) {
    setError('');
    try {
      const updated = await updateListing(id, { status });
      setListings((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update listing');
    }
  }

  if (user.role !== 'admin') {
    return (
      <div className="page">
        <h1>Admin</h1>
        <p>Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Admin</h1>
      <p className="hint">
        Field report moderation lives on the <Link to="/reports">Field Reports</Link> page — as an
        admin you see every report there with status controls. This page covers marketplace
        listing moderation.
      </p>
      {error && <p className="error">{error}</p>}

      <h2>All Marketplace Listings</h2>
      {loading ? (
        <p>Loading...</p>
      ) : listings.length === 0 ? (
        <p>No listings yet.</p>
      ) : (
        <ul className="plot-list">
          {listings.map((l) => (
            <li key={l.id} className="card">
              <p>
                <strong>{l.crop_name}</strong> — {l.quantity} {l.unit} @ ₹{l.unit_price}/{l.unit}
              </p>
              <p className="hint">Seller: {l.farmer_name}</p>
              {l.quality_notes && <p className="hint">{l.quality_notes}</p>}
              <label>
                Status
                <select value={l.status} onChange={(e) => handleStatusChange(l.id, e.target.value)}>
                  {LISTING_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
