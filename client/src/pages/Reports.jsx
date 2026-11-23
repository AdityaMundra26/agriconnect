import { useState } from 'react';
import { ClipboardList, Send, Sparkles, MapPin, LandPlot, User, Filter } from 'lucide-react';
import { listReports, createReport, getReport, updateReportStatus } from '../api/reports.js';
import { listPlots } from '../api/plots.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLoader } from '../hooks/useLoader.js';
import { PageHeader, EmptyState, StatusBadge, Drawer, FormError, Field, SkeletonRows, PageLoading, Badge } from '../components/ui.jsx';
import { REPORT_STATUSES, REPORT_CATEGORIES, SEVERITIES } from '../utils/constants.js';
import { formatDate, timeAgo, label, errorMessage } from '../utils/format.js';

const EXAMPLES = [
  'Drip pipe burst near the north gate, water is flooding the field',
  'Yellow spots spreading on tomato leaves in the south patch',
  'Borewell pump motor not working since morning',
];

function ReportForm({ onCreated }) {
  const toast = useToast();
  const { data: plots } = useLoader(listPlots);
  const [description, setDescription] = useState('');
  const [plotId, setPlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const report = await createReport({ description: description.trim(), plotId: plotId ? Number(plotId) : undefined });
      toast.success(`Report filed: ${label(report.category)}, ${report.severity} severity`);
      setDescription('');
      setPlotId('');
      onCreated(report);
    } catch (err) {
      setError(errorMessage(err, 'Failed to submit report'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-header">
        <h3><Sparkles size={18} color="var(--brand-600)" /> Report a field issue</h3>
      </div>
      <div className="card-body stack">
        <FormError>{error}</FormError>
        <Field label="What's the problem?" hint="Write naturally. We'll detect the category, severity and location automatically.">
          <textarea className="textarea" rows={4} required minLength={10} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Aphids spreading fast on the mustard near the east boundary" />
        </Field>
        <div className="chips">
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} className="chip" onClick={() => setDescription(ex)} style={{ height: 'auto', padding: '0.35rem 0.7rem', textAlign: 'left' }}>
              {ex}
            </button>
          ))}
        </div>
        {plots?.length > 0 && (
          <Field label="Plot (optional)">
            <select className="select" value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">Not specific to a plot</option>
              {plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <div className="form-actions">
          <button className="btn" disabled={submitting || description.trim().length < 10}>
            {submitting ? <><span className="spinner" /> Classifying…</> : <><Send size={16} /> Submit report</>}
          </button>
        </div>
      </div>
    </form>
  );
}

function ReportDrawer({ reportId, isAdmin, onClose, onUpdated }) {
  const toast = useToast();
  const { data, setData, loading, error } = useLoader(() => (reportId ? getReport(reportId) : Promise.resolve(null)), [reportId]);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevId, setPrevId] = useState(null);

  if (data?.report && data.report.id !== prevId) {
    setPrevId(data.report.id);
    setStatus(data.report.status);
    setNote('');
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateReportStatus(reportId, status, note || undefined);
      const fresh = await getReport(reportId);
      setData(fresh);
      setNote('');
      onUpdated(updated);
      toast.success('Report updated. The farmer has been notified.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update report'));
    } finally {
      setSaving(false);
    }
  }

  const r = data?.report;
  return (
    <Drawer open={Boolean(reportId)} onClose={onClose} title={r ? `Report #${r.id}` : 'Report'} subtitle={r && `Filed ${formatDate(r.created_at)}`}>
      {loading && !data ? (
        <PageLoading />
      ) : error ? (
        <FormError>{error}</FormError>
      ) : r ? (
        <div className="stack-lg">
          <div className="row wrap" style={{ gap: '0.4rem' }}>
            <StatusBadge kind="severity" value={r.severity} dot={false} />
            <Badge tone="gray">{label(r.category)}</Badge>
            <StatusBadge kind="report" value={r.status} />
            {r.ai_classified && <Badge tone="violet"><Sparkles size={12} /> AI classified</Badge>}
          </div>
          <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{r.description}</p>
          <dl className="kv" style={{ margin: 0 }}>
            <div><dt>Location</dt><dd style={{ textTransform: 'none' }}>{r.location || 'Not detected'}</dd></div>
            <div><dt>Plot</dt><dd style={{ textTransform: 'none' }}>{r.plot_name || 'None'}</dd></div>
            {isAdmin && <div><dt>Reported by</dt><dd style={{ textTransform: 'none' }}>{r.reporter_name}</dd></div>}
          </dl>

          <div>
            <h3 style={{ marginBottom: '0.9rem' }}>Timeline</h3>
            <div className="timeline">
              {data.history.map((h) => (
                <div key={h.id} className="timeline-item">
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <StatusBadge kind="report" value={h.status} />
                    <span className="subtle">{formatDate(h.changed_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {h.note && <p style={{ marginTop: 5, fontSize: '0.9rem' }}>{h.note}</p>}
                  {h.changed_by_name && <p className="subtle" style={{ marginTop: 2 }}>by {h.changed_by_name}{h.changed_by_role === 'admin' ? ' (admin)' : ''}</p>}
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <form className="card card-pad stack" onSubmit={save} style={{ background: 'var(--surface-2)' }}>
              <h3>Update status</h3>
              <div className="chips">
                {REPORT_STATUSES.map((s) => (
                  <button type="button" key={s} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{label(s)}</button>
                ))}
              </div>
              <Field label="Note to farmer (optional)">
                <textarea className="textarea" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Field officer will visit tomorrow morning" />
              </Field>
              <button className="btn" disabled={saving || (status === r.status && !note.trim())}>
                {saving ? <span className="spinner" /> : 'Save update'}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [filters, setFilters] = useState({ status: isAdmin ? 'open' : '', severity: '', category: '' });
  const { data: reports, setData, loading, error } = useLoader(
    () => listReports(isAdmin ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) : undefined),
    [filters, isAdmin]
  );
  const [openId, setOpenId] = useState(null);

  // Farmers filter client-side (the API returns all of their own reports).
  const shown = (reports || []).filter((r) => isAdmin || !filters.status || r.status === filters.status);
  const counts = (reports || []).reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

  const list = (
    <div className="card">
      <div className="card-header">
        <h3><ClipboardList size={18} color="var(--text-3)" /> {isAdmin ? 'All reports' : 'Your reports'}</h3>
        {!isAdmin && (
          <select className="select" style={{ width: 160, height: 34 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {REPORT_STATUSES.map((s) => <option key={s} value={s}>{label(s)} ({counts[s] || 0})</option>)}
          </select>
        )}
      </div>
      <FormError>{error}</FormError>
      {loading && !reports ? (
        <SkeletonRows rows={4} height={64} />
      ) : shown.length === 0 ? (
        <EmptyState icon={ClipboardList} title={isAdmin ? 'No reports match these filters' : 'No reports yet'}>
          {!isAdmin && 'Use the form to report pests, disease, irrigation or equipment problems.'}
        </EmptyState>
      ) : (
        <div className="list">
          {shown.map((r) => (
            <div key={r.id} className="list-item clickable" onClick={() => setOpenId(r.id)}>
              <StatusBadge kind="severity" value={r.severity} dot={false} />
              <div className="grow">
                <div className="title" style={{ fontWeight: 540 }}>{r.description}</div>
                <div className="meta row wrap" style={{ gap: '0.75rem', marginTop: 2 }}>
                  <span style={{ textTransform: 'capitalize' }}>{label(r.category)}</span>
                  {r.location && <span className="row" style={{ gap: 3 }}><MapPin size={12} /> {r.location}</span>}
                  {r.plot_name && <span className="row" style={{ gap: 3 }}><LandPlot size={12} /> {r.plot_name}</span>}
                  {isAdmin && <span className="row" style={{ gap: 3 }}><User size={12} /> {r.reporter_name}</span>}
                  <span>{timeAgo(r.created_at)}</span>
                </div>
              </div>
              <StatusBadge kind="report" value={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Field Reports"
        description={isAdmin ? 'Review, prioritise and resolve issues reported by farmers.' : 'Report problems on your farm and follow them to resolution.'}
      />
      {isAdmin ? (
        <>
          <div className="toolbar card card-pad">
            <Filter size={17} color="var(--text-3)" />
            <select className="select" style={{ width: 170 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              {REPORT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <select className="select" style={{ width: 170 }} value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
              <option value="">All severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <select className="select" style={{ width: 190 }} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All categories</option>
              {REPORT_CATEGORIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          {list}
        </>
      ) : (
        <div className="grid-main-side" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
          {list}
          <ReportForm onCreated={(r) => setData((rs) => [r, ...(rs || [])])} />
        </div>
      )}
      <ReportDrawer
        reportId={openId}
        isAdmin={isAdmin}
        onClose={() => setOpenId(null)}
        onUpdated={(u) => setData((rs) => rs.map((r) => (r.id === u.id ? { ...r, ...u } : r)))}
      />
    </>
  );
}
