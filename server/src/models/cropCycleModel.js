import { query } from '../config/db.js';

const COLUMNS = {
  cropName: 'crop_name',
  sownDate: 'sown_date',
  expectedHarvestDate: 'expected_harvest_date',
  harvestDate: 'harvest_date',
  harvestedQuantity: 'harvested_quantity',
  yieldUnit: 'yield_unit',
  status: 'status',
  notes: 'notes',
};

export async function createCropCycle(plotId, fields) {
  const keys = Object.keys(COLUMNS).filter((k) => fields[k] !== undefined);
  const cols = ['plot_id', ...keys.map((k) => COLUMNS[k])];
  const values = [plotId, ...keys.map((k) => fields[k])];
  const placeholders = values.map((_, i) => `$${i + 1}`);
  const result = await query(
    `INSERT INTO crop_cycles (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return result.rows[0];
}

// All cycles across every plot the user owns, newest first.
export async function findCropCyclesForOwner(userId, plotId) {
  const values = [userId];
  let plotFilter = '';
  if (plotId) {
    values.push(plotId);
    plotFilter = 'AND plots.id = $2';
  }
  const result = await query(
    `SELECT crop_cycles.*, plots.name AS plot_name
     FROM crop_cycles
     JOIN plots ON plots.id = crop_cycles.plot_id
     JOIN farm_profiles ON farm_profiles.id = plots.farm_profile_id
     WHERE farm_profiles.user_id = $1 ${plotFilter}
     ORDER BY COALESCE(crop_cycles.sown_date, crop_cycles.created_at::date) DESC, crop_cycles.id DESC`,
    values
  );
  return result.rows;
}

export async function findCropCycleWithOwner(id) {
  const result = await query(
    `SELECT crop_cycles.*, farm_profiles.user_id AS owner_id
     FROM crop_cycles
     JOIN plots ON plots.id = crop_cycles.plot_id
     JOIN farm_profiles ON farm_profiles.id = plots.farm_profile_id
     WHERE crop_cycles.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updateCropCycle(id, fields) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }
  if (sets.length === 0) return (await findCropCycleWithOwner(id));
  values.push(id);
  const result = await query(
    `UPDATE crop_cycles SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteCropCycle(id) {
  await query('DELETE FROM crop_cycles WHERE id = $1', [id]);
}
