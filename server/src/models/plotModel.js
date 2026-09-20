import { query } from '../config/db.js';

export async function createPlot({ farmProfileId, name, area, cropHistory }) {
  const result = await query(
    `INSERT INTO plots (farm_profile_id, name, area, crop_history)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [farmProfileId, name, area ?? null, cropHistory ?? null]
  );
  return result.rows[0];
}

export async function findPlotsByFarmProfileId(farmProfileId) {
  const result = await query(
    'SELECT * FROM plots WHERE farm_profile_id = $1 ORDER BY created_at DESC',
    [farmProfileId]
  );
  return result.rows;
}

export async function findPlotById(id) {
  const result = await query('SELECT * FROM plots WHERE id = $1', [id]);
  return result.rows[0];
}

// Joins to farm_profiles so callers can verify plot ownership in one query.
export async function findPlotWithOwner(id) {
  const result = await query(
    `SELECT plots.*, farm_profiles.user_id AS owner_id
     FROM plots
     JOIN farm_profiles ON farm_profiles.id = plots.farm_profile_id
     WHERE plots.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updatePlot(id, fields) {
  const columns = { name: 'name', area: 'area', cropHistory: 'crop_history' };
  const sets = [];
  const values = [];
  let i = 1;

  for (const [key, column] of Object.entries(columns)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = $${i}`);
      values.push(fields[key]);
      i += 1;
    }
  }

  if (sets.length === 0) {
    return findPlotById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE plots SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deletePlot(id) {
  await query('DELETE FROM plots WHERE id = $1', [id]);
}
