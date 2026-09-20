import { query } from '../config/db.js';

export async function createFarmProfile({
  userId,
  location,
  latitude,
  longitude,
  soilType,
  irrigationAccess,
  landSize,
  preferredCrops,
}) {
  const result = await query(
    `INSERT INTO farm_profiles
       (user_id, location, latitude, longitude, soil_type, irrigation_access, land_size, preferred_crops)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, location, latitude ?? null, longitude ?? null, soilType ?? null, irrigationAccess, landSize ?? null, preferredCrops ?? []]
  );
  return result.rows[0];
}

export async function findFarmProfileByUserId(userId) {
  const result = await query('SELECT * FROM farm_profiles WHERE user_id = $1', [userId]);
  return result.rows[0];
}

export async function findFarmProfileById(id) {
  const result = await query('SELECT * FROM farm_profiles WHERE id = $1', [id]);
  return result.rows[0];
}

export async function updateFarmProfile(id, fields) {
  const columns = {
    location: 'location',
    latitude: 'latitude',
    longitude: 'longitude',
    soilType: 'soil_type',
    irrigationAccess: 'irrigation_access',
    landSize: 'land_size',
    preferredCrops: 'preferred_crops',
  };

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
    return findFarmProfileById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE farm_profiles SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}
