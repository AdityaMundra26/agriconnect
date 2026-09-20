import { useEffect, useState } from 'react';
import { listReports, createReport, updateReportStatus } from '../api/reports.js';
import { listPlots } from '../api/plots.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUSES = ['open', 'in_progress', 'resolved', 'rejected'];

const SEVERITY_COLORS = {
  low: '#2e7d32',
  medium: '#f9a825',
  high: '#ef6c00',
  critical: '#c62828',
};

function SeverityBadge({ severity }) {
  if (!severity) return null;
  return (
    <span className="badge" style={{ backgroundColor: SEVERITY_COLORS[severity] || '#999' }}>
      {severity}
    </span>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [reports, setReports] = useState([]);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [plotId, setPlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
    if (user.role === 'farmer') {
      listPlots().then(setPlots).catch(() => {});
    }
  }, []);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const data = await listReports();
      setReports(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const report = await createReport({
        description,
        plotId: plotId ? Number(plotId) : undefined,
      });
      setReports((prev) => [report, ...prev]);
      setDescription('');
      setPlotId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    setError('');
    try {
      const updated = await updateReportStatus(id, status);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  }

  return (
    <div className="page">
      <h1>Field Reports</h1>
      {error && <p className="error">{error}</p>}

      {!isAdmin && (
        <form className="card" onSubmit={handleSubmit}>
          <label>
            Describe the issue
            <textarea
              required
              rows={3}
              placeholder='e.g. "Irrigation pipe broken near plot 2, water is flooding the field"'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {plots.length > 0 && (
            <label>
              Plot (optional)
              <select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
                <option value="">— none —</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit report'}
          </button>
          <p className="hint">
            Your report is automatically classified by category and severity.
          </p>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : reports.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <ul className="plot-list">
          {reports.map((r) => (
            <li key={r.id} className="card">
              <div className="report-header">
                <SeverityBadge severity={r.severity} />
                <span className="badge outline">{r.category}</span>
                <span className="badge outline">{r.status}</span>
              </div>
              <p>{r.description}</p>
              {r.location && <p className="hint">Location: {r.location}</p>}
              {isAdmin && (
                <label>
                  Update status
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
