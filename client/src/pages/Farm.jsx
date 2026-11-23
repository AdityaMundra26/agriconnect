import { useState } from 'react';
import {
  Sprout,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Lightbulb,
  Droplets,
  FlaskConical,
  CalendarDays,
  CloudSun,
  AlertTriangle,
  Info,
  Wheat,
  LandPlot,
} from 'lucide-react';
import { getMyFarm, createFarm, updateFarm } from '../api/farms.js';
import { listPlots, createPlot, updatePlot, deletePlot } from '../api/plots.js';
import { listCropCycles, createCropCycle, updateCropCycle, deleteCropCycle } from '../api/cropCycles.js';
import { getAdvisory } from '../api/advisory.js';
import { useLoader } from '../hooks/useLoader.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  PageHeader,
  Modal,
  Drawer,
  ConfirmDialog,
  EmptyState,
  StatusBadge,
  PageLoading,
  FormError,
  Field,
  Badge,
} from '../components/ui.jsx';
import { IRRIGATION_TYPES, SOIL_TYPES, UNITS, CYCLE_STATUSES, cropEmoji } from '../utils/constants.js';
import { errorMessage, formatDate, num, toDateInput, daysUntil, label } from '../utils/format.js';

// ---------------------------------------------------------------------------
// Data loading: a 404 on the farm just means "not set up yet".
// ---------------------------------------------------------------------------
async function loadFarmData() {
  let farm = null;
  try {
    farm = await getMyFarm();
  } catch (err) {
    if (err.response?.status !== 404) throw err;
  }
  if (!farm) return { farm: null, plots: [], cycles: [] };
  const [plots, cycles] = await Promise.all([listPlots(), listCropCycles()]);
  return { farm, plots, cycles };
}

// ---------------------------------------------------------------------------
// Farm profile form
// ---------------------------------------------------------------------------
function FarmForm({ farm, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    location: farm?.location || '',
    soilType: farm?.soil_type || '',
    irrigationAccess: farm?.irrigation_access || 'rainfed',
    landSize: farm?.land_size ?? '',
    preferredCrops: (farm?.preferred_crops || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        location: form.location.trim(),
        soilType: form.soilType || undefined,
        irrigationAccess: form.irrigationAccess,
        landSize: form.landSize === '' ? undefined : Number(form.landSize),
        preferredCrops: form.preferredCrops.split(',').map((c) => c.trim()).filter(Boolean),
      };
      const saved = farm ? await updateFarm(farm.id, payload) : await createFarm(payload);
      toast.success(farm ? 'Farm profile updated' : 'Farm profile created');
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save farm profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      <FormError>{error}</FormError>
      <div className="form-grid">
        <Field label="Location (village / district, state)" className="span-2" hint="Used for live weather in advisories, e.g. “Mandya, Karnataka”">
          <input className="input" required value={form.location} onChange={set('location')} placeholder="Mandya, Karnataka" />
        </Field>
        <Field label="Soil type">
          <select className="select" value={form.soilType} onChange={set('soilType')}>
            <option value="">Not sure</option>
            {SOIL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            {form.soilType && !SOIL_TYPES.includes(form.soilType) && <option value={form.soilType}>{form.soilType}</option>}
          </select>
        </Field>
        <Field label="Irrigation access">
          <select className="select" value={form.irrigationAccess} onChange={set('irrigationAccess')}>
            {IRRIGATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Total land (acres)">
          <input className="input" type="number" step="0.01" min="0.01" value={form.landSize} onChange={set('landSize')} placeholder="e.g. 10" />
        </Field>
        <Field label="Preferred crops" hint="Comma-separated">
          <input className="input" value={form.preferredCrops} onChange={set('preferredCrops')} placeholder="ragi, tomato, sugarcane" />
        </Field>
      </div>
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button className="btn" disabled={saving}>{saving ? <span className="spinner" /> : farm ? 'Save changes' : 'Create farm profile'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Plot form
// ---------------------------------------------------------------------------
function PlotModal({ open, plot, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', area: '', cropHistory: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prevKey, setPrevKey] = useState(null);

  // Reset the form whenever the modal opens for a different plot.
  const key = open ? plot?.id ?? 'new' : null;
  if (key !== prevKey) {
    setPrevKey(key);
    setError('');
    setForm({ name: plot?.name || '', area: plot?.area ?? '', cropHistory: plot?.crop_history || '' });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        area: form.area === '' ? undefined : Number(form.area),
        cropHistory: form.cropHistory || undefined,
      };
      const saved = plot ? await updatePlot(plot.id, payload) : await createPlot(payload);
      toast.success(plot ? 'Plot updated' : 'Plot added');
      onSaved(saved, !plot);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save plot'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={plot ? 'Edit plot' : 'Add a plot'} description="Plots let you track crops and get advice per field.">
      <form onSubmit={submit} className="stack">
        <FormError>{error}</FormError>
        <div className="form-grid">
          <Field label="Plot name">
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="North Field" />
          </Field>
          <Field label="Area (acres)">
            <input className="input" type="number" step="0.01" min="0.01" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. 2.5" />
          </Field>
          <Field label="Crop history" className="span-2" hint="What has been grown here before (helps with rotation)">
            <textarea className="textarea" rows={2} value={form.cropHistory} onChange={(e) => setForm({ ...form, cropHistory: e.target.value })} placeholder="Ragi in 2024 kharif, groundnut in 2025 rabi" />
          </Field>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? <span className="spinner" /> : plot ? 'Save plot' : 'Add plot'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Crop cycle form
// ---------------------------------------------------------------------------
function CycleModal({ open, plot, cycle, onClose, onSaved }) {
  const toast = useToast();
  const empty = { cropName: '', status: 'planned', sownDate: '', expectedHarvestDate: '', harvestDate: '', harvestedQuantity: '', yieldUnit: 'kg', notes: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prevKey, setPrevKey] = useState(null);

  const key = open ? `${plot?.id}-${cycle?.id ?? 'new'}` : null;
  if (key !== prevKey) {
    setPrevKey(key);
    setError('');
    setForm(
      cycle
        ? {
            cropName: cycle.crop_name,
            status: cycle.status,
            sownDate: toDateInput(cycle.sown_date),
            expectedHarvestDate: toDateInput(cycle.expected_harvest_date),
            harvestDate: toDateInput(cycle.harvest_date),
            harvestedQuantity: cycle.harvested_quantity ?? '',
            yieldUnit: cycle.yield_unit || 'kg',
            notes: cycle.notes || '',
          }
        : empty
    );
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const harvested = form.status === 'harvested';

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        cropName: form.cropName.trim(),
        harvestedQuantity: harvested ? form.harvestedQuantity : '',
        harvestDate: harvested ? form.harvestDate : '',
      };
      const saved = cycle ? await updateCropCycle(cycle.id, payload) : await createCropCycle({ ...payload, plotId: plot.id });
      toast.success(cycle ? 'Crop cycle updated' : 'Crop cycle added');
      onSaved({ ...saved, plot_name: plot?.name ?? cycle?.plot_name }, !cycle);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save crop cycle'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={cycle ? 'Edit crop cycle' : `Add crop to ${plot?.name || 'plot'}`} description="Track a crop from planning to harvest. Harvest quantities feed your yield analytics.">
      <form onSubmit={submit} className="stack">
        <FormError>{error}</FormError>
        <div className="form-grid">
          <Field label="Crop">
            <input className="input" required value={form.cropName} onChange={set('cropName')} placeholder="Wheat" list="crop-suggestions" />
            <datalist id="crop-suggestions">
              {['Rice', 'Wheat', 'Ragi', 'Maize', 'Tomato', 'Onion', 'Potato', 'Sugarcane', 'Cotton', 'Groundnut', 'Chickpea', 'Mustard', 'Soybean'].map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Status">
            <select className="select" value={form.status} onChange={set('status')}>
              {CYCLE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Field label="Sowing date">
            <input className="input" type="date" value={form.sownDate} onChange={set('sownDate')} />
          </Field>
          <Field label="Expected harvest">
            <input className="input" type="date" value={form.expectedHarvestDate} min={form.sownDate || undefined} onChange={set('expectedHarvestDate')} />
          </Field>
          {harvested && (
            <>
              <Field label="Harvest date">
                <input className="input" type="date" value={form.harvestDate} onChange={set('harvestDate')} />
              </Field>
              <Field label="Harvested quantity">
                <div className="row" style={{ gap: '0.5rem' }}>
                  <input className="input" type="number" min="0" step="0.01" value={form.harvestedQuantity} onChange={set('harvestedQuantity')} placeholder="e.g. 4200" />
                  <select className="select" style={{ width: 110 }} value={form.yieldUnit} onChange={set('yieldUnit')}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Field>
            </>
          )}
          <Field label="Notes" className="span-2">
            <input className="input" value={form.notes} onChange={set('notes')} placeholder="Variety, seed source, observations…" />
          </Field>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? <span className="spinner" /> : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Advisory drawer
// ---------------------------------------------------------------------------
const ALERT_STYLE = {
  critical: { cls: 'tone-red', icon: AlertTriangle },
  warning: { cls: 'tone-amber', icon: AlertTriangle },
  info: { cls: 'tone-blue', icon: Info },
};

function AdvisoryDrawer({ plot, onClose }) {
  const { data: adv, loading, error } = useLoader(() => (plot ? getAdvisory(plot.id) : Promise.resolve(null)), [plot?.id]);

  return (
    <Drawer open={Boolean(plot)} onClose={onClose} title={`Advisory · ${plot?.name || ''}`} subtitle="Rule-based recommendations for your soil, water and season">
      {loading ? (
        <PageLoading />
      ) : error ? (
        <FormError>{error}</FormError>
      ) : adv ? (
        <div className="stack">
          <div className="card card-pad row" style={{ background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
            <div className="stat-icon tone-green"><CalendarDays size={20} /></div>
            <div>
              <div className="subtle">Current season</div>
              <h3>{adv.seasonLabel}</h3>
              <div className="subtle">{adv.seasonWindow}</div>
            </div>
          </div>

          {adv.alerts.map((a, i) => {
            const s = ALERT_STYLE[a.level] || ALERT_STYLE.info;
            const Icon = s.icon;
            return (
              <div key={i} className={`alert ${s.cls}`}>
                <Icon size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {a.text}
              </div>
            );
          })}

          <div className="advice">
            <div className="advice-icon tone-green"><Sprout size={18} /></div>
            <div>
              <h4>What to sow</h4>
              <p>{adv.sowingWindow}</p>
              <div className="chips" style={{ marginTop: 8 }}>
                {adv.suggestedCrops.map((c) => <Badge key={c} tone="green">{cropEmoji(c)} {c}</Badge>)}
              </div>
            </div>
          </div>
          <div className="advice">
            <div className="advice-icon tone-blue"><Droplets size={18} /></div>
            <div>
              <h4>Irrigation{adv.irrigationInterval && ` · every ${adv.irrigationInterval}`}</h4>
              <p>{adv.irrigation}</p>
            </div>
          </div>
          <div className="advice">
            <div className="advice-icon tone-amber"><FlaskConical size={18} /></div>
            <div>
              <h4>Soil & fertilizer</h4>
              <p>{adv.fertilizer}</p>
              {!adv.soilRecognized && <p className="subtle" style={{ marginTop: 4 }}>Tip: set your soil type in the farm profile for specific advice.</p>}
            </div>
          </div>
          {adv.cropTips.length > 0 && (
            <div className="advice">
              <div className="advice-icon tone-violet"><Lightbulb size={18} /></div>
              <div className="stack-sm">
                <h4>Tips for your current crops</h4>
                {adv.cropTips.map((t) => <p key={t.crop}><strong>{t.crop}:</strong> {t.tip}</p>)}
              </div>
            </div>
          )}
          <div className="advice">
            <div className="advice-icon tone-gray"><CloudSun size={18} /></div>
            <div>
              <h4>Weather</h4>
              {adv.weather ? (
                <p style={{ textTransform: 'capitalize' }}>
                  {adv.weather.description}, {Math.round(adv.weather.tempC)}°C, {adv.weather.humidity}% humidity
                </p>
              ) : (
                <p>{adv.weatherNote}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Plot card
// ---------------------------------------------------------------------------
function cycleProgress(c) {
  if (c.status === 'harvested') return 100;
  if (!c.sown_date || !c.expected_harvest_date) return null;
  const start = new Date(c.sown_date).getTime();
  const end = new Date(c.expected_harvest_date).getTime();
  if (end <= start) return null;
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
}

function PlotCard({ plot, cycles, onAdvisory, onEdit, onDelete, onAddCycle, onEditCycle, onDeleteCycle }) {
  const active = cycles.filter((c) => !['harvested', 'failed'].includes(c.status));
  const past = cycles.filter((c) => ['harvested', 'failed'].includes(c.status)).slice(0, 2);

  return (
    <div className="card plot-card">
      <div className="plot-head">
        <div className="stat-icon tone-green"><LandPlot size={20} /></div>
        <div className="grow">
          <h3>{plot.name}</h3>
          <div className="subtle">{plot.area ? `${num(plot.area)} acres` : 'Area not set'}</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} aria-label="Edit plot"><Pencil size={15} /></button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} aria-label="Delete plot"><Trash2 size={15} /></button>
      </div>
      <div style={{ padding: '0 1.2rem 0.6rem', flex: 1 }}>
        {plot.crop_history && <p className="subtle" style={{ marginBottom: 8 }}>History: {plot.crop_history}</p>}
        {active.length === 0 && past.length === 0 && <p className="subtle" style={{ padding: '0.6rem 0' }}>No crops tracked yet.</p>}
        {[...active, ...past].map((c) => {
          const pct = cycleProgress(c);
          const d = daysUntil(c.expected_harvest_date);
          return (
            <div key={c.id} className="cycle-row">
              <span style={{ fontSize: '1.3rem' }}>{cropEmoji(c.crop_name)}</span>
              <div className="grow">
                <div className="row-between">
                  <strong style={{ fontSize: '0.9rem' }}>{c.crop_name}</strong>
                  <StatusBadge kind="cycle" value={c.status} />
                </div>
                {c.status === 'harvested' ? (
                  <div className="subtle">
                    {c.harvested_quantity != null ? `${num(c.harvested_quantity)} ${c.yield_unit} harvested` : 'Harvested'} · {formatDate(c.harvest_date)}
                  </div>
                ) : (
                  <>
                    <div className="subtle">
                      {c.sown_date ? `Sown ${formatDate(c.sown_date)}` : 'Not sown yet'}
                      {d !== null && ` · ${d >= 0 ? `harvest in ${d}d` : `${-d}d past expected`}`}
                    </div>
                    {pct !== null && <div className="progress" style={{ marginTop: 5 }}><div style={{ width: `${pct}%` }} /></div>}
                  </>
                )}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEditCycle(c)} aria-label="Edit crop"><Pencil size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDeleteCycle(c)} aria-label="Delete crop"><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      <div className="card-footer row">
        <button className="btn btn-sm" onClick={onAdvisory}><Lightbulb size={15} /> Advisory</button>
        <button className="btn btn-sm btn-secondary" onClick={onAddCycle}><Plus size={15} /> Add crop</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Farm() {
  const toast = useToast();
  const { data, setData, loading, error } = useLoader(loadFarmData);
  const [editingFarm, setEditingFarm] = useState(false);
  const [plotModal, setPlotModal] = useState({ open: false, plot: null });
  const [cycleModal, setCycleModal] = useState({ open: false, plot: null, cycle: null });
  const [advisoryPlot, setAdvisoryPlot] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, item }
  const [deleting, setDeleting] = useState(false);

  if (loading && !data) return <PageLoading />;
  if (error) return <FormError>{error}</FormError>;

  const { farm, plots, cycles } = data;
  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  if (!farm) {
    return (
      <>
        <PageHeader title="Set up your farm" description="Tell us about your land to unlock crop advisory, plot tracking and yield analytics." />
        <div className="card card-pad" style={{ maxWidth: 720 }}>
          <FarmForm onSaved={(f) => update({ farm: f })} />
        </div>
      </>
    );
  }

  async function doDelete() {
    setDeleting(true);
    try {
      if (confirm.kind === 'plot') {
        await deletePlot(confirm.item.id);
        update({ plots: plots.filter((p) => p.id !== confirm.item.id), cycles: cycles.filter((c) => c.plot_id !== confirm.item.id) });
        toast.success('Plot deleted');
      } else {
        await deleteCropCycle(confirm.item.id);
        update({ cycles: cycles.filter((c) => c.id !== confirm.item.id) });
        toast.success('Crop cycle deleted');
      }
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  }

  const irrigationLabel = IRRIGATION_TYPES.find((t) => t.value === farm.irrigation_access)?.label;
  const totalArea = plots.reduce((s, p) => s + Number(p.area || 0), 0);

  return (
    <>
      <PageHeader
        title="My Farm"
        description="Manage your farm profile, plots and crop cycles."
        actions={<button className="btn" onClick={() => setPlotModal({ open: true, plot: null })}><Plus size={17} /> Add plot</button>}
      />

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2><MapPin size={18} color="var(--brand-600)" /> {farm.location}</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditingFarm(true)}><Pencil size={15} /> Edit profile</button>
        </div>
        <div className="card-body">
          <dl className="kv" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', margin: 0 }}>
            <div><dt>Soil</dt><dd style={{ textTransform: 'capitalize' }}>{farm.soil_type || 'Not set'}</dd></div>
            <div><dt>Irrigation</dt><dd>{irrigationLabel}</dd></div>
            <div><dt>Total land</dt><dd>{farm.land_size ? `${num(farm.land_size)} acres` : 'Not set'}</dd></div>
            <div><dt>Plotted</dt><dd>{plots.length} plots · {num(totalArea)} acres</dd></div>
            <div><dt>Preferred crops</dt><dd>{(farm.preferred_crops || []).join(', ') || 'None'}</dd></div>
          </dl>
        </div>
      </div>

      {plots.length === 0 ? (
        <div className="card">
          <EmptyState icon={Wheat} title="No plots yet" action={<button className="btn" onClick={() => setPlotModal({ open: true, plot: null })}><Plus size={17} /> Add your first plot</button>}>
            Split your land into plots to track crops and get field-specific advice.
          </EmptyState>
        </div>
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {plots.map((p) => (
            <PlotCard
              key={p.id}
              plot={p}
              cycles={cycles.filter((c) => c.plot_id === p.id)}
              onAdvisory={() => setAdvisoryPlot(p)}
              onEdit={() => setPlotModal({ open: true, plot: p })}
              onDelete={() => setConfirm({ kind: 'plot', item: p })}
              onAddCycle={() => setCycleModal({ open: true, plot: p, cycle: null })}
              onEditCycle={(c) => setCycleModal({ open: true, plot: p, cycle: c })}
              onDeleteCycle={(c) => setConfirm({ kind: 'cycle', item: c })}
            />
          ))}
        </div>
      )}

      <Modal open={editingFarm} onClose={() => setEditingFarm(false)} title="Edit farm profile" size="lg">
        <FarmForm
          farm={farm}
          onCancel={() => setEditingFarm(false)}
          onSaved={(f) => {
            update({ farm: f });
            setEditingFarm(false);
          }}
        />
      </Modal>

      <PlotModal
        open={plotModal.open}
        plot={plotModal.plot}
        onClose={() => setPlotModal({ open: false, plot: null })}
        onSaved={(saved, isNew) => {
          update({ plots: isNew ? [saved, ...plots] : plots.map((p) => (p.id === saved.id ? saved : p)) });
          setPlotModal({ open: false, plot: null });
        }}
      />

      <CycleModal
        open={cycleModal.open}
        plot={cycleModal.plot}
        cycle={cycleModal.cycle}
        onClose={() => setCycleModal({ open: false, plot: null, cycle: null })}
        onSaved={(saved, isNew) => {
          update({ cycles: isNew ? [saved, ...cycles] : cycles.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)) });
          setCycleModal({ open: false, plot: null, cycle: null });
        }}
      />

      <AdvisoryDrawer plot={advisoryPlot} onClose={() => setAdvisoryPlot(null)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'plot' ? 'Delete plot?' : 'Delete crop cycle?'}
        message={
          confirm?.kind === 'plot'
            ? `“${confirm.item.name}” and all its crop cycles will be permanently deleted.`
            : `The ${confirm?.item.crop_name} cycle will be permanently deleted.`
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
