import { useEffect, useState } from 'react';
import { getMyFarm, createFarm, updateFarm } from '../api/farms.js';
import { listPlots, createPlot, updatePlot, deletePlot } from '../api/plots.js';
import { getAdvisory } from '../api/advisory.js';
import { useAuth } from '../context/AuthContext.jsx';

const IRRIGATION_TYPES = ['none', 'rainfed', 'canal', 'borewell', 'drip', 'sprinkler'];

const emptyFarmForm = {
  location: '',
  soilType: '',
  irrigationAccess: 'rainfed',
  landSize: '',
  preferredCrops: '',
};

export default function Farm() {
  const { user } = useAuth();
  const [farm, setFarm] = useState(null);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingFarm, setEditingFarm] = useState(false);
  const [farmForm, setFarmForm] = useState(emptyFarmForm);
  const [savingFarm, setSavingFarm] = useState(false);

  const [plotForm, setPlotForm] = useState({ name: '', area: '', cropHistory: '' });
  const [savingPlot, setSavingPlot] = useState(false);
  const [editingPlotId, setEditingPlotId] = useState(null);

  const [advisories, setAdvisories] = useState({});
  const [loadingAdvisoryId, setLoadingAdvisoryId] = useState(null);

  useEffect(() => {
    loadFarm();
  }, []);

  async function loadFarm() {
    setLoading(true);
    setError('');
    try {
      const data = await getMyFarm();
      setFarm(data);
      const loadedPlots = await listPlots();
      setPlots(loadedPlots);
    } catch (err) {
      if (err.response?.status === 404) {
        setFarm(null);
        setEditingFarm(true);
      } else {
        setError(err.response?.data?.error || 'Failed to load farm profile');
      }
    } finally {
      setLoading(false);
    }
  }

  function startEditFarm() {
    setFarmForm(
      farm
        ? {
            location: farm.location || '',
            soilType: farm.soil_type || '',
            irrigationAccess: farm.irrigation_access || 'rainfed',
            landSize: farm.land_size ?? '',
            preferredCrops: (farm.preferred_crops || []).join(', '),
          }
        : emptyFarmForm
    );
    setEditingFarm(true);
  }

  async function handleFarmSubmit(e) {
    e.preventDefault();
    setError('');
    setSavingFarm(true);
    try {
      const payload = {
        location: farmForm.location,
        soilType: farmForm.soilType || undefined,
        irrigationAccess: farmForm.irrigationAccess,
        landSize: farmForm.landSize === '' ? undefined : Number(farmForm.landSize),
        preferredCrops: farmForm.preferredCrops
          ? farmForm.preferredCrops.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
      };
      const saved = farm ? await updateFarm(farm.id, payload) : await createFarm(payload);
      setFarm(saved);
      setEditingFarm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save farm profile');
    } finally {
      setSavingFarm(false);
    }
  }

  function startEditPlot(plot) {
    setEditingPlotId(plot.id);
    setPlotForm({ name: plot.name, area: plot.area ?? '', cropHistory: plot.crop_history || '' });
  }

  function resetPlotForm() {
    setEditingPlotId(null);
    setPlotForm({ name: '', area: '', cropHistory: '' });
  }

  async function handlePlotSubmit(e) {
    e.preventDefault();
    setError('');
    setSavingPlot(true);
    try {
      const payload = {
        name: plotForm.name,
        area: plotForm.area === '' ? undefined : Number(plotForm.area),
        cropHistory: plotForm.cropHistory || undefined,
      };
      if (editingPlotId) {
        const updated = await updatePlot(editingPlotId, payload);
        setPlots((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createPlot(payload);
        setPlots((prev) => [created, ...prev]);
      }
      resetPlotForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save plot');
    } finally {
      setSavingPlot(false);
    }
  }

  async function handleDeletePlot(id) {
    setError('');
    try {
      await deletePlot(id);
      setPlots((prev) => prev.filter((p) => p.id !== id));
      if (editingPlotId === id) resetPlotForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete plot');
    }
  }

  async function handleGetAdvisory(plotId) {
    setError('');
    setLoadingAdvisoryId(plotId);
    try {
      const advisory = await getAdvisory(plotId);
      setAdvisories((prev) => ({ ...prev, [plotId]: advisory }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load advisory');
    } finally {
      setLoadingAdvisoryId(null);
    }
  }

  if (user.role !== 'farmer') {
    return (
      <div className="page">
        <h1>Farm Profile</h1>
        <p>Only farmer accounts have a farm profile.</p>
      </div>
    );
  }

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h1>Farm Profile</h1>
      {error && <p className="error">{error}</p>}

      {!editingFarm && farm && (
        <div className="card">
          <p><strong>Location:</strong> {farm.location}</p>
          <p><strong>Soil type:</strong> {farm.soil_type || '—'}</p>
          <p><strong>Irrigation access:</strong> {farm.irrigation_access}</p>
          <p><strong>Land size:</strong> {farm.land_size ? `${farm.land_size} acres` : '—'}</p>
          <p><strong>Preferred crops:</strong> {(farm.preferred_crops || []).join(', ') || '—'}</p>
          <button onClick={startEditFarm}>Edit farm profile</button>
        </div>
      )}

      {editingFarm && (
        <form className="card" onSubmit={handleFarmSubmit}>
          <label>
            Location
            <input
              required
              value={farmForm.location}
              onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })}
            />
          </label>
          <label>
            Soil type
            <input
              value={farmForm.soilType}
              onChange={(e) => setFarmForm({ ...farmForm, soilType: e.target.value })}
            />
          </label>
          <label>
            Irrigation access
            <select
              value={farmForm.irrigationAccess}
              onChange={(e) => setFarmForm({ ...farmForm, irrigationAccess: e.target.value })}
            >
              {IRRIGATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Land size (acres)
            <input
              type="number"
              step="0.01"
              min="0"
              value={farmForm.landSize}
              onChange={(e) => setFarmForm({ ...farmForm, landSize: e.target.value })}
            />
          </label>
          <label>
            Preferred crops (comma-separated)
            <input
              value={farmForm.preferredCrops}
              onChange={(e) => setFarmForm({ ...farmForm, preferredCrops: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={savingFarm}>
              {savingFarm ? 'Saving...' : 'Save farm profile'}
            </button>
            {farm && (
              <button type="button" className="secondary-btn" onClick={() => setEditingFarm(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {farm && (
        <>
          <h2>Plots</h2>
          <form className="card" onSubmit={handlePlotSubmit}>
            <label>
              Name
              <input
                required
                value={plotForm.name}
                onChange={(e) => setPlotForm({ ...plotForm, name: e.target.value })}
              />
            </label>
            <label>
              Area (acres)
              <input
                type="number"
                step="0.01"
                min="0"
                value={plotForm.area}
                onChange={(e) => setPlotForm({ ...plotForm, area: e.target.value })}
              />
            </label>
            <label>
              Crop history
              <input
                value={plotForm.cropHistory}
                onChange={(e) => setPlotForm({ ...plotForm, cropHistory: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={savingPlot}>
                {savingPlot ? 'Saving...' : editingPlotId ? 'Update plot' : 'Add plot'}
              </button>
              {editingPlotId && (
                <button type="button" className="secondary-btn" onClick={resetPlotForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {plots.length === 0 ? (
            <p>No plots yet — add your first one above.</p>
          ) : (
            <ul className="plot-list">
              {plots.map((plot) => (
                <li key={plot.id} className="card">
                  <p><strong>{plot.name}</strong> {plot.area ? `— ${plot.area} acres` : ''}</p>
                  {plot.crop_history && <p>{plot.crop_history}</p>}
                  <div className="form-actions">
                    <button type="button" onClick={() => startEditPlot(plot)}>Edit</button>
                    <button type="button" className="danger-btn" onClick={() => handleDeletePlot(plot.id)}>
                      Delete
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleGetAdvisory(plot.id)}
                      disabled={loadingAdvisoryId === plot.id}
                    >
                      {loadingAdvisoryId === plot.id ? 'Loading...' : 'Get advisory'}
                    </button>
                  </div>

                  {advisories[plot.id] && (
                    <div className="advisory">
                      <p><strong>Season:</strong> {advisories[plot.id].season}</p>
                      <p>{advisories[plot.id].sowingWindow}</p>
                      <p><strong>Irrigation:</strong> {advisories[plot.id].irrigation}</p>
                      <p><strong>Fertilizer:</strong> {advisories[plot.id].fertilizer}</p>
                      {advisories[plot.id].weather ? (
                        <p className="hint">
                          Current weather: {advisories[plot.id].weather.description},{' '}
                          {advisories[plot.id].weather.tempC}°C, {advisories[plot.id].weather.humidity}% humidity
                        </p>
                      ) : (
                        <p className="hint">{advisories[plot.id].weatherNote}</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
