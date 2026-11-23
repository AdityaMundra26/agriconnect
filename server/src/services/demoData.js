// Demo / sample data: 6 farmers across India, 4 buyers, an admin, ~26 listings,
// ~3 months of orders, a year of harvests, field reports with moderation
// history, notifications and SMS/voice alert logs.
//
// Only ever touches accounts ending in @demo.com. Removing deletes those users
// and ON DELETE CASCADE removes everything they own; other users are never
// modified. Data comes from a fixed random seed, so every load looks the same
// (relative to today). Used by db/seed.js and the /api/demo endpoints.
//
// All demo accounts use the password: demo1234
import bcrypt from 'bcrypt';

export const PASSWORD = 'demo1234';

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------
let seedState = 20261123;
function rand() {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => min + rand() * (max - min);
const int = (min, max) => Math.floor(between(min, max + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const round = (n, step = 1) => Math.round(n / step) * step;

const DAY = 86400000;
const daysAgo = (n, hour = int(7, 19)) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, int(0, 59), 0, 0);
  return d;
};
const dateOnly = (d) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------
const FARMERS = [
  {
    key: 'ravi', name: 'Ravi Kumar', email: 'farmer@demo.com', phone: '+91 98450 11111',
    farm: { location: 'Mandya, Karnataka', soil: 'Red soil', irrigation: 'borewell', land: 12.5, preferred: ['ragi', 'sugarcane', 'tomato', 'groundnut'] },
    plots: [['North Field', 5, 'Ragi (2024 kharif), groundnut (2025 rabi)'], ['Riverside Plot', 4.5, 'Sugarcane, 2023-2025'], ['South Patch', 3, 'Tomato and vegetables']],
  },
  {
    key: 'lakshmi', name: 'Lakshmi Devi', email: 'farmer2@demo.com', phone: '+91 98450 22222',
    farm: { location: 'Nashik, Maharashtra', soil: 'Black soil', irrigation: 'drip', land: 8, preferred: ['onion', 'grapes', 'wheat'] },
    plots: [['East Block', 3, 'Onion (rabi), soybean (kharif)'], ['Vineyard', 3, 'Thompson seedless grapes since 2021'], ['West Block', 2, 'Wheat']],
  },
  {
    key: 'gurpreet', name: 'Gurpreet Singh', email: 'farmer3@demo.com', phone: '+91 98720 33333',
    farm: { location: 'Ludhiana, Punjab', soil: 'Alluvial soil', irrigation: 'canal', land: 22, preferred: ['wheat', 'rice', 'potato', 'mustard'] },
    plots: [['Canal Side', 10, 'Rice-wheat rotation'], ['Tubewell Field', 7, 'Potato, then wheat'], ['Back Field', 5, 'Mustard and fodder']],
  },
  {
    key: 'meena', name: 'Meena Patel', email: 'farmer4@demo.com', phone: '+91 97250 44444',
    farm: { location: 'Anand, Gujarat', soil: 'Loamy soil', irrigation: 'sprinkler', land: 9, preferred: ['banana', 'potato', 'tomato'] },
    plots: [['Banana Orchard', 4, 'Grand Naine banana'], ['Vegetable Plot', 3, 'Tomato, brinjal, chilli'], ['Home Field', 2, 'Potato in rabi']],
  },
  {
    key: 'suresh', name: 'Suresh Reddy', email: 'farmer5@demo.com', phone: '+91 94400 55555',
    farm: { location: 'Guntur, Andhra Pradesh', soil: 'Black soil', irrigation: 'canal', land: 15, preferred: ['chilli', 'cotton', 'turmeric'] },
    plots: [['Chilli Field', 6, 'Guntur Sannam chilli'], ['Cotton Block', 6, 'Bt cotton'], ['Turmeric Patch', 3, 'Turmeric, two seasons']],
  },
  {
    key: 'anita', name: 'Anita Kumari', email: 'farmer6@demo.com', phone: '+91 99340 66666',
    farm: { location: 'Nalanda, Bihar', soil: 'Alluvial soil', irrigation: 'borewell', land: 6, preferred: ['rice', 'maize', 'litchi'] },
    plots: [['Paddy Field', 3, 'Rice in kharif, maize in rabi'], ['Litchi Garden', 2, 'Shahi litchi trees'], ['Pond Edge', 1, 'Makhana (fox nut)']],
  },
];

const BUYERS = [
  { key: 'freshmart', name: 'Anil Sharma (FreshMart)', email: 'buyer@demo.com', phone: '+91 98450 33333', address: 'FreshMart Warehouse, Peenya, Bengaluru', weight: 4 },
  { key: 'greenbasket', name: 'Priya Nair (GreenBasket Foods)', email: 'buyer2@demo.com', phone: '+91 98470 77777', address: 'GreenBasket DC, Kakkanad, Kochi', weight: 3 },
  { key: 'verma', name: 'Rahul Verma (Verma Traders)', email: 'buyer3@demo.com', phone: '+91 98110 88888', address: 'Shop 14, Azadpur Mandi, Delhi', weight: 3 },
  { key: 'annapurna', name: 'Kavya Joshi (Hotel Annapurna)', email: 'buyer4@demo.com', phone: '+91 98220 99999', address: 'Hotel Annapurna, FC Road, Pune', weight: 2 },
];

const ADMIN = { name: 'Platform Admin', email: 'admin@demo.com', phone: '+91 98450 44444' };

// Listings per farmer: [crop, unit, price, stock, orderQty range, notes, status?]
const LISTINGS = {
  ravi: [
    ['Tomato', 'kg', 22, 1200, [50, 250], 'Grade A hybrid, harvested this week'],
    ['Ragi', 'quintal', 3800, 25, [2, 6], 'Sun-dried, cleaned, moisture under 12%'],
    ['Jaggery', 'kg', 60, 300, [20, 80], 'Organic, chemical-free'],
    ['Groundnut', 'kg', 95, 0, [100, 400], 'Bold kernels', 'sold_out'],
    ['Coconut', 'dozen', 180, 150, [10, 40], 'Tender coconuts from the farm bund'],
  ],
  lakshmi: [
    ['Onion', 'quintal', 2400, 80, [5, 15], 'Red onion, good storage life'],
    ['Grapes', 'kg', 85, 500, [40, 150], 'Thompson seedless, export quality'],
    ['Wheat', 'quintal', 2600, 40, [4, 10], 'Lokwan variety'],
    ['Raisins', 'kg', 260, 0, [10, 40], 'Shade-dried green raisins', 'sold_out'],
  ],
  gurpreet: [
    ['Basmati Rice', 'quintal', 6200, 60, [3, 10], 'Pusa 1121, aged 1 year'],
    ['Wheat', 'quintal', 2550, 120, [10, 25], 'HD-3086, cleaned and graded'],
    ['Potato', 'kg', 18, 4000, [200, 800], 'Kufri Jyoti, cold-store fresh'],
    ['Mustard', 'quintal', 5600, 20, [2, 5], 'Black mustard seed for oil'],
    ['Paddy Straw', 'tonne', 3500, 0, [2, 6], 'Baled', 'closed'],
  ],
  meena: [
    ['Banana', 'dozen', 45, 900, [40, 150], 'Grand Naine, ripening in 2-3 days'],
    ['Potato', 'kg', 20, 1500, [100, 400], 'Table variety, washed'],
    ['Brinjal', 'kg', 28, 300, [20, 80], 'Purple round, tender'],
    ['Green Chilli', 'kg', 45, 0, [10, 50], 'Medium spicy', 'sold_out'],
  ],
  suresh: [
    ['Red Chilli', 'kg', 180, 900, [50, 200], 'Guntur Sannam S4, stemless'],
    ['Cotton', 'quintal', 7200, 35, [3, 8], 'Long staple, ginned'],
    ['Turmeric', 'kg', 140, 600, [30, 120], 'Polished finger turmeric, high curcumin'],
    ['Black Gram', 'quintal', 7800, 15, [1, 4], 'Urad dal, machine cleaned'],
  ],
  anita: [
    ['Makhana', 'kg', 620, 120, [5, 25], 'Hand-popped, grade A (5 suta)'],
    ['Litchi', 'kg', 150, 0, [20, 80], 'Shahi litchi - season over', 'closed'],
    ['Maize', 'quintal', 2100, 50, [5, 12], 'Yellow, dried'],
    ['Rice', 'quintal', 3200, 30, [3, 8], 'Sonachur aromatic rice'],
  ],
};

// Typical yield per acre for harvest records.
const YIELD = {
  Ragi: [900, 1200, 'kg'], Tomato: [9000, 12000, 'kg'], Groundnut: [700, 950, 'kg'], Sugarcane: [32, 42, 'tonne'],
  Onion: [8000, 10000, 'kg'], Grapes: [7000, 9000, 'kg'], Wheat: [1700, 2100, 'kg'], Soybean: [500, 700, 'kg'],
  Rice: [2200, 2700, 'kg'], Potato: [8000, 10000, 'kg'], Mustard: [550, 700, 'kg'], Banana: [11000, 14000, 'kg'],
  Brinjal: [7000, 9000, 'kg'], Chilli: [900, 1200, 'kg'], Cotton: [550, 750, 'kg'], Turmeric: [2200, 2800, 'kg'],
  Maize: [2300, 2800, 'kg'], Litchi: [2500, 3500, 'kg'], Makhana: [500, 700, 'kg'], Chickpea: [600, 800, 'kg'],
};

// Per plot: past harvested cycles [crop, sownDaysAgo, growDays] and a current one [crop, status, sownDaysAgo, growDays].
const CYCLES = {
  'North Field': { past: [['Ragi', 300, 120], ['Groundnut', 160, 110]], now: ['Groundnut', 'sown', 20, 110] },
  'Riverside Plot': { past: [['Sugarcane', 560, 360]], now: ['Sugarcane', 'growing', 200, 350] },
  'South Patch': { past: [['Tomato', 250, 100], ['Tomato', 125, 95]], now: ['Chickpea', 'planned', null, 110] },
  'East Block': { past: [['Onion', 320, 130], ['Soybean', 170, 100]], now: ['Onion', 'sown', 15, 120] },
  'Vineyard': { past: [['Grapes', 330, 150]], now: ['Grapes', 'growing', 60, 150] },
  'West Block': { past: [['Wheat', 360, 130]], now: ['Wheat', 'growing', 25, 125] },
  'Canal Side': { past: [['Wheat', 350, 140], ['Rice', 175, 120]], now: ['Wheat', 'sown', 18, 140] },
  'Tubewell Field': { past: [['Potato', 330, 100], ['Potato', 70, 95]], now: ['Wheat', 'planned', null, 130] },
  'Back Field': { past: [['Mustard', 340, 125]], now: ['Mustard', 'growing', 35, 120] },
  'Banana Orchard': { past: [['Banana', 420, 330]], now: ['Banana', 'growing', 80, 330] },
  'Vegetable Plot': { past: [['Brinjal', 230, 110], ['Tomato', 120, 100]], now: ['Chilli', 'sown', 12, 150] },
  'Home Field': { past: [['Potato', 340, 100]], now: ['Potato', 'sown', 22, 100] },
  'Chilli Field': { past: [['Chilli', 360, 170]], now: ['Chilli', 'growing', 70, 170] },
  'Cotton Block': { past: [['Cotton', 380, 180]], now: ['Cotton', 'failed', 150, 180], failedNote: 'Pink bollworm outbreak - crop abandoned' },
  'Turmeric Patch': { past: [['Turmeric', 400, 260]], now: ['Turmeric', 'growing', 140, 260] },
  'Paddy Field': { past: [['Rice', 330, 125], ['Maize', 190, 110]], now: ['Maize', 'sown', 16, 110] },
  'Litchi Garden': { past: [['Litchi', 300, 120]], now: ['Litchi', 'planned', null, 120] },
  'Pond Edge': { past: [['Makhana', 260, 150]], now: ['Makhana', 'planned', null, 150] },
};

// [farmerKey, plotName|null, description, category, severity, status, location, daysAgo, note?]
const REPORTS = [
  ['ravi', 'Riverside Plot', 'Borewell pump motor not working since morning', 'equipment', 'critical', 'open', 'Riverside Plot', 1],
  ['ravi', 'South Patch', 'Yellow spots spreading on tomato leaves, looks like early blight', 'disease', 'high', 'in_progress', 'South Patch', 9, 'Plant doctor visit scheduled; spray mancozeb meanwhile'],
  ['ravi', 'North Field', 'Minor soil erosion on the slope after rain', 'soil', 'low', 'open', 'the slope', 5],
  ['ravi', 'North Field', 'Drip line burst near the north gate, water is flooding the field', 'irrigation', 'high', 'resolved', 'the north gate', 34, 'Line replaced by field team, flow restored'],
  ['ravi', null, 'Wild boars damaging the groundnut crop at night', 'pest', 'medium', 'resolved', null, 52, 'Solar fence subsidy approved and installed'],
  ['lakshmi', 'East Block', 'Thrips found on onion crop in the east block', 'pest', 'medium', 'resolved', 'the east block', 27, 'Blue sticky traps and spinosad spray recommended'],
  ['lakshmi', 'Vineyard', 'Powdery mildew patches on grape leaves after humid week', 'disease', 'high', 'in_progress', 'Vineyard', 4, 'Sulphur dusting advised; follow-up in 5 days'],
  ['lakshmi', 'West Block', 'Hailstorm damaged part of the wheat crop', 'weather_damage', 'high', 'open', 'West Block', 3],
  ['lakshmi', null, 'Fence broken, cattle entering the farm', 'equipment', 'medium', 'rejected', null, 21, 'Duplicate of an earlier report'],
  ['gurpreet', 'Canal Side', 'Canal water supply stopped for 4 days, wheat sowing delayed', 'irrigation', 'high', 'resolved', 'Canal Side', 40, 'Canal department cleared the blockage'],
  ['gurpreet', 'Tubewell Field', 'Late blight suspected on potato, dark lesions on leaves', 'disease', 'critical', 'in_progress', 'Tubewell Field', 2, 'Urgent: agronomist dispatched'],
  ['gurpreet', 'Back Field', 'Aphids spreading on mustard near the back boundary', 'pest', 'medium', 'open', 'the back boundary', 6],
  ['gurpreet', null, 'Tractor hydraulic lift not working', 'equipment', 'low', 'resolved', null, 63, 'Repaired at the custom hiring centre'],
  ['meena', 'Banana Orchard', 'Strong winds knocked over 30 banana plants', 'weather_damage', 'high', 'resolved', 'Banana Orchard', 46, 'Crop insurance claim filed and approved'],
  ['meena', 'Vegetable Plot', 'Fruit borer in brinjal, many fruits with holes', 'pest', 'medium', 'resolved', 'Vegetable Plot', 30, 'Pheromone traps installed'],
  ['meena', 'Home Field', 'Sprinkler nozzles clogged in the home field', 'irrigation', 'low', 'open', 'the home field', 7],
  ['suresh', 'Cotton Block', 'Pink bollworm infestation across the whole cotton block - urgent', 'pest', 'critical', 'resolved', 'Cotton Block', 58, 'Crop declared lost; compensation under PMFBY initiated'],
  ['suresh', 'Chilli Field', 'Leaf curl virus on chilli plants spreading', 'disease', 'high', 'in_progress', 'Chilli Field', 11, 'Removing infected plants; whitefly control advised'],
  ['suresh', 'Turmeric Patch', 'Waterlogging in turmeric patch after heavy rain', 'irrigation', 'medium', 'open', 'Turmeric Patch', 4],
  ['anita', 'Paddy Field', 'Brown planthopper seen at the base of paddy plants', 'pest', 'high', 'resolved', 'Paddy Field', 70, 'Drained field and sprayed as advised'],
  ['anita', 'Pond Edge', 'Pond water level very low, makhana crop at risk', 'irrigation', 'medium', 'in_progress', 'Pond Edge', 8, 'Borewell connection to pond being arranged'],
  ['anita', null, 'Soil test shows low zinc, need guidance', 'soil', 'low', 'resolved', null, 25, 'Apply zinc sulphate 10 kg/acre before sowing'],
];

// ---------------------------------------------------------------------------
// Bulk insert helper: one round trip per table instead of one per row.
// Postgres returns RETURNING rows in VALUES order for a single INSERT.
// ---------------------------------------------------------------------------
async function bulkInsert(q, table, columns, rows, returning = 'id') {
  if (rows.length === 0) return [];
  const values = [];
  const tuples = rows.map((row) => {
    const ph = row.map((v) => {
      values.push(v);
      return `$${values.length}`;
    });
    return `(${ph.join(', ')})`;
  });
  const result = await q(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}${returning ? ` RETURNING ${returning}` : ''}`,
    values
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const DEMO_EMAIL_PATTERN = '%@demo.com';

export async function getDemoStatus(q) {
  const row = (
    await q(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE email LIKE $1) AS users,
         (SELECT COUNT(*)::int FROM listings l JOIN users u ON u.id = l.farmer_id WHERE u.email LIKE $1) AS listings,
         (SELECT COUNT(*)::int FROM orders o JOIN users u ON u.id = o.buyer_id WHERE u.email LIKE $1) AS orders,
         (SELECT COUNT(*)::int FROM field_reports r JOIN users u ON u.id = r.user_id WHERE u.email LIKE $1) AS reports`,
      [DEMO_EMAIL_PATTERN]
    )
  ).rows[0];
  return { enabled: row.users > 0, counts: row };
}

// Deletes every @demo.com account; ON DELETE CASCADE removes their farms,
// plots, cycles, listings, orders, reports, notifications and alert logs.
export async function removeDemoData(q) {
  const result = await q(`DELETE FROM users WHERE email LIKE $1`, [DEMO_EMAIL_PATTERN]);
  return result.rowCount;
}

// `q` must be a query function on a single client so this can run in one
// transaction (BEGIN/COMMIT are issued here).
export async function seedDemoData(q) {
  seedState = 20261123; // same data every run
  const counts = { users: 0, listings: 0, orders: 0, cycles: 0, reports: 0, notifications: 0, alerts: 0 };

  await q('BEGIN');
  try {
    await removeDemoData(q);
    const hash = await bcrypt.hash(PASSWORD, 10);

    // --- Users ---------------------------------------------------------------
    const smsOn = new Set(['farmer@demo.com', 'farmer2@demo.com', 'farmer3@demo.com', 'buyer@demo.com', 'buyer2@demo.com', 'admin@demo.com']);
    const voiceOn = new Set(['admin@demo.com', 'farmer@demo.com']);
    const userRows = [
      [ADMIN, 'admin', 400],
      ...FARMERS.map((f, i) => [f, 'farmer', 380 - i * 25]),
      ...BUYERS.map((b, i) => [b, 'buyer', 300 - i * 30]),
    ];
    const users = await bulkInsert(
      q,
      'users',
      ['name', 'email', 'password_hash', 'role', 'phone', 'sms_alerts', 'voice_alerts', 'created_at'],
      userRows.map(([u, role, age]) => [u.name, u.email, hash, role, u.phone, smsOn.has(u.email), voiceOn.has(u.email), daysAgo(age)]),
      'id, email'
    );
    counts.users = users.length;
    const idByEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
    const adminId = idByEmail[ADMIN.email];
    const farmerIds = Object.fromEntries(FARMERS.map((f) => [f.key, idByEmail[f.email]]));
    const buyerIds = Object.fromEntries(BUYERS.map((b) => [b.key, idByEmail[b.email]]));

    // --- Farms & plots -----------------------------------------------------
    const farms = await bulkInsert(
      q,
      'farm_profiles',
      ['user_id', 'location', 'soil_type', 'irrigation_access', 'land_size', 'preferred_crops', 'created_at'],
      FARMERS.map((f, i) => [farmerIds[f.key], f.farm.location, f.farm.soil, f.farm.irrigation, f.farm.land, f.farm.preferred, daysAgo(378 - i * 25)]),
      'id, user_id'
    );
    const farmIdByUser = Object.fromEntries(farms.map((f) => [f.user_id, f.id]));
    const plotSpecs = FARMERS.flatMap((f, i) => f.plots.map(([name, area, history]) => ({ name, area, history, farmer: f.key, age: 375 - i * 25 })));
    const plots = await bulkInsert(
      q,
      'plots',
      ['farm_profile_id', 'name', 'area', 'crop_history', 'created_at'],
      plotSpecs.map((p) => [farmIdByUser[farmerIds[p.farmer]], p.name, p.area, p.history, daysAgo(p.age)]),
      'id'
    );
    const plotIds = Object.fromEntries(plotSpecs.map((p, i) => [p.name, { id: plots[i].id, area: p.area, farmer: p.farmer }]));

    // --- Crop cycles -----------------------------------------------------------
    const cycleRows = [];
    for (const [plotName, spec] of Object.entries(CYCLES)) {
      const plot = plotIds[plotName];
      for (const [crop, sown, grow] of spec.past) {
        const [lo, hi, unit] = YIELD[crop];
        const harvested = Math.max(0, sown - grow - int(0, 6));
        cycleRows.push([plot.id, crop, 'harvested', dateOnly(daysAgo(sown)), dateOnly(daysAgo(sown - grow)), dateOnly(daysAgo(harvested)),
          round(between(lo, hi) * plot.area, unit === 'tonne' ? 1 : 10), unit, null, daysAgo(sown + 5)]);
      }
      const [crop, status, sown, grow] = spec.now;
      const plannedStart = int(10, 40);
      cycleRows.push([plot.id, crop, status, sown != null ? dateOnly(daysAgo(sown)) : null,
        dateOnly(daysAgo(sown != null ? sown - grow : -(plannedStart + grow))), null, null, YIELD[crop][2],
        status === 'failed' ? spec.failedNote : null, daysAgo(sown != null ? sown + 3 : 5)]);
    }
    await bulkInsert(q, 'crop_cycles',
      ['plot_id', 'crop_name', 'status', 'sown_date', 'expected_harvest_date', 'harvest_date', 'harvested_quantity', 'yield_unit', 'notes', 'created_at'],
      cycleRows, null);
    counts.cycles = cycleRows.length;

    // --- Listings --------------------------------------------------------------
    const listingSpecs = Object.entries(LISTINGS).flatMap(([farmerKey, rows]) =>
      rows.map(([crop, unit, price, stock, qtyRange, notes, status = 'active']) => ({
        crop, unit, price, stock, qtyRange, notes, status, farmerKey, farmerId: farmerIds[farmerKey],
        // Ravi is the main demo account: his listings run the whole 90 days.
        age: farmerKey === 'ravi' ? int(80, 90) : int(8, 85),
      }))
    );
    const listingIds = await bulkInsert(q, 'listings',
      ['farmer_id', 'crop_name', 'quantity', 'unit', 'unit_price', 'quality_notes', 'status', 'created_at'],
      listingSpecs.map((l) => [l.farmerId, l.crop, l.stock, l.unit, l.price, l.notes, l.status, daysAgo(l.age)]));
    const listings = listingSpecs.map((l, i) => ({ ...l, id: listingIds[i].id }));
    counts.listings = listings.length;

    // --- Orders: ~90 days, gently growing volume ---------------------------------
    const buyerPool = BUYERS.flatMap((b) => Array(b.weight).fill(b));
    const orders = [];
    for (let day = 90; day >= 0; day--) {
      const perDay = chance(0.3 + (90 - day) / 120) ? int(1, 2 + Math.floor((90 - day) / 40)) : 0;
      for (let n = 0; n < perDay; n++) {
        const live = listings.filter((x) => x.age >= day);
        const ravis = live.filter((x) => x.farmerKey === 'ravi');
        // ~40% of orders go to Ravi so the main demo account looks busy.
        const l = ravis.length && chance(0.4) ? pick(ravis) : pick(live);
        if (!l) continue;
        const buyer = pick(buyerPool);
        const qty = round(between(l.qtyRange[0], l.qtyRange[1]), l.unit === 'quintal' || l.unit === 'tonne' ? 1 : 5);
        let status;
        if (day > 12) status = chance(0.09) ? 'cancelled' : 'delivered';
        else if (day > 6) status = pick(['delivered', 'delivered', 'shipped', 'cancelled']);
        else if (day > 2) status = pick(['shipped', 'confirmed', 'confirmed', 'delivered']);
        else status = pick(['pending', 'pending', 'confirmed']);
        orders.push({ l, buyer, qty, status, day });
      }
    }
    // Always a fresh pending order on Ravi's tomato for the demo walkthrough.
    orders.push({ l: listings.find((l) => l.farmerKey === 'ravi' && l.crop === 'Tomato'), buyer: BUYERS[0], qty: 100, status: 'pending', day: 0 });

    const orderIds = await bulkInsert(q, 'orders',
      ['listing_id', 'buyer_id', 'quantity', 'total_price', 'status', 'delivery_address', 'created_at', 'updated_at'],
      orders.map((o) => {
        const created = daysAgo(o.day);
        const updated = o.status === 'pending' ? created : new Date(Math.min(Date.now(), created.getTime() + int(1, 4) * DAY));
        return [o.l.id, buyerIds[o.buyer.key], o.qty, o.qty * o.l.price, o.status, o.buyer.address, created, updated];
      }));
    const insertedOrders = orders.map((o, i) => ({ ...o, id: orderIds[i].id, total: o.qty * o.l.price }));
    counts.orders = insertedOrders.length;

    // --- Field reports + history -----------------------------------------------
    const reportIds = await bulkInsert(q, 'field_reports',
      ['user_id', 'plot_id', 'description', 'category', 'severity', 'status', 'location', 'created_at'],
      REPORTS.map(([farmerKey, plotName, text, category, severity, status, location, age]) =>
        [farmerIds[farmerKey], plotName ? plotIds[plotName].id : null, text, category, severity, status, location, daysAgo(age)]));
    const historyRows = [];
    REPORTS.forEach(([farmerKey, , , , , status, , age, note], i) => {
      const id = reportIds[i].id;
      historyRows.push([id, 'open', farmerIds[farmerKey], 'Report submitted', daysAgo(age)]);
      const steps = { in_progress: ['in_progress'], resolved: ['in_progress', 'resolved'], rejected: ['rejected'] }[status] || [];
      steps.forEach((s, j) => {
        historyRows.push([id, s, adminId, j === steps.length - 1 ? note : 'Assigned to field officer',
          daysAgo(Math.max(age - (j + 1) * Math.max(1, Math.floor(age / 6)), 0))]);
      });
    });
    await bulkInsert(q, 'report_status_history', ['report_id', 'status', 'changed_by', 'note', 'changed_at'], historyRows, null);
    counts.reports = REPORTS.length;

    // --- Notifications (recent activity) ----------------------------------------
    const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
    const notificationRows = [];
    for (const o of insertedOrders.filter((x) => x.day <= 10)) {
      notificationRows.push([o.l.farmerId, `New order #${o.id}: ${o.qty} ${o.l.unit} of ${o.l.crop} (${inr(o.total)})`, 'order', '/orders', o.day > 2, daysAgo(o.day)]);
      if (o.status !== 'pending') {
        notificationRows.push([buyerIds[o.buyer.key], `Order #${o.id} (${o.l.crop}) is now ${o.status}`, 'order', '/orders', o.day > 3, daysAgo(Math.max(o.day - 1, 0))]);
      }
    }
    notificationRows.push(
      [farmerIds.ravi, 'Your disease report is now in progress: Plant doctor visit scheduled', 'report', '/reports', false, daysAgo(8)],
      [farmerIds.ravi, 'Your Groundnut listing is now sold out', 'listing', '/marketplace', true, daysAgo(15)],
      [farmerIds.lakshmi, 'Your Raisins listing is now sold out', 'listing', '/marketplace', true, daysAgo(12)]
    );
    await bulkInsert(q, 'notifications', ['user_id', 'message', 'type', 'link', 'is_read', 'created_at'], notificationRows, null);
    counts.notifications = notificationRows.length;

    // --- SMS / voice alert log ----------------------------------------------------
    const alertRows = insertedOrders
      .filter((x) => x.day <= 6 && ['ravi', 'lakshmi', 'gurpreet'].includes(x.l.farmerKey))
      .slice(-8)
      .map((o) => {
        const f = FARMERS.find((x) => x.key === o.l.farmerKey);
        return [o.l.farmerId, 'sms', f.phone.replace(/\s/g, ''), `AgriConnect: New order #${o.id} for ${o.qty} ${o.l.unit} ${o.l.crop} worth Rs ${o.total}. Open AgriConnect to confirm.`, daysAgo(o.day)];
      });
    alertRows.push(
      [adminId, 'voice', '+919845044444', 'AgriConnect: critical equipment report from Ravi Kumar: Borewell pump motor not working since morning', daysAgo(1)],
      [adminId, 'voice', '+919845044444', 'AgriConnect: critical disease report from Gurpreet Singh: Late blight suspected on potato, dark lesions on leaves', daysAgo(2)],
      [adminId, 'sms', '+919845044444', 'AgriConnect: high weather_damage report from Lakshmi Devi: Hailstorm damaged part of the wheat crop', daysAgo(3)]
    );
    await bulkInsert(q, 'alert_log', ['user_id', 'channel', 'to_number', 'message', 'created_at', 'provider', 'status'],
      alertRows.map((r) => [...r, 'simulated', 'simulated']), null);
    counts.alerts = alertRows.length;

    await q('COMMIT');
    return counts;
  } catch (err) {
    await q('ROLLBACK');
    throw err;
  }
}
