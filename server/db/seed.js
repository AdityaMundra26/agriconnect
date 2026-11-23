// Seeds demo accounts with realistic, backdated activity so every page and
// chart has data to show. Only touches the @demo.com accounts below: they are
// deleted (cascading to their data) and re-created on every run. Other users
// are never modified.
//
//   node db/seed.js
//
// All demo accounts use the password: demo1234
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const PASSWORD = 'demo1234';
const DEMO_USERS = {
  farmer: { name: 'Ravi Kumar', email: 'farmer@demo.com', role: 'farmer', phone: '+91 98450 11111' },
  farmer2: { name: 'Lakshmi Devi', email: 'farmer2@demo.com', role: 'farmer', phone: '+91 98450 22222' },
  buyer: { name: 'Anil Sharma (FreshMart)', email: 'buyer@demo.com', role: 'buyer', phone: '+91 98450 33333' },
  admin: { name: 'Platform Admin', email: 'admin@demo.com', role: 'admin', phone: '+91 98450 44444' },
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const dateOnly = (d) => d.toISOString().slice(0, 10);

async function seed() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const q = (sql, values) => client.query(sql, values);
  const insert = async (sql, values) => (await q(sql, values)).rows[0];

  try {
    await q('BEGIN');
    await q('DELETE FROM users WHERE email = ANY($1)', [Object.values(DEMO_USERS).map((u) => u.email)]);

    const hash = await bcrypt.hash(PASSWORD, 10);
    const ids = {};
    for (const [key, u] of Object.entries(DEMO_USERS)) {
      ids[key] = (
        await insert(
          `INSERT INTO users (name, email, password_hash, role, phone, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [u.name, u.email, hash, u.role, u.phone, daysAgo(60)]
        )
      ).id;
    }

    // Alert opt-ins: farmer gets SMS, admin gets SMS + voice calls for critical reports.
    await q('UPDATE users SET sms_alerts = true WHERE id = ANY($1)', [[ids.farmer, ids.buyer, ids.admin]]);
    await q('UPDATE users SET voice_alerts = true WHERE id = $1', [ids.admin]);

    // --- Farms & plots -----------------------------------------------------
    const farm1 = await insert(
      `INSERT INTO farm_profiles (user_id, location, soil_type, irrigation_access, land_size, preferred_crops, created_at)
       VALUES ($1, 'Mandya, Karnataka', 'Red soil', 'borewell', 12.5, $2, $3) RETURNING id`,
      [ids.farmer, ['ragi', 'sugarcane', 'tomato', 'groundnut'], daysAgo(58)]
    );
    const farm2 = await insert(
      `INSERT INTO farm_profiles (user_id, location, soil_type, irrigation_access, land_size, preferred_crops, created_at)
       VALUES ($1, 'Nashik, Maharashtra', 'Black soil', 'drip', 8, $2, $3) RETURNING id`,
      [ids.farmer2, ['onion', 'grapes', 'wheat'], daysAgo(55)]
    );

    const plot = async (farmId, name, area, history) =>
      (await insert(
        `INSERT INTO plots (farm_profile_id, name, area, crop_history, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [farmId, name, area, history, daysAgo(57)]
      )).id;

    const p = {
      north: await plot(farm1.id, 'North Field', 5, 'Ragi (2024 kharif), groundnut (2025 rabi)'),
      river: await plot(farm1.id, 'Riverside Plot', 4.5, 'Sugarcane, 2023-2025'),
      south: await plot(farm1.id, 'South Patch', 3, 'Tomato and vegetables'),
      east: await plot(farm2.id, 'East Block', 5, 'Onion (rabi), soybean (kharif)'),
      west: await plot(farm2.id, 'West Block', 3, 'Wheat'),
    };

    // --- Crop cycles (harvested ones feed the yield chart) -----------------
    const cycle = (plotId, crop, status, sown, expected, harvest, qty, unit = 'kg') =>
      q(
        `INSERT INTO crop_cycles (plot_id, crop_name, status, sown_date, expected_harvest_date, harvest_date, harvested_quantity, yield_unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [plotId, crop, status, sown && dateOnly(daysAgo(sown)), expected != null ? dateOnly(daysAgo(expected)) : null,
          harvest != null ? dateOnly(daysAgo(harvest)) : null, qty, unit]
      );

    await cycle(p.north, 'Ragi', 'harvested', 170, 50, 48, 4200);
    await cycle(p.south, 'Tomato', 'harvested', 120, 30, 28, 9500);
    await cycle(p.river, 'Sugarcane', 'growing', 200, -150, null, null, 'tonne');
    await cycle(p.north, 'Groundnut', 'sown', 20, -90, null, null);
    await cycle(p.south, 'Chickpea', 'planned', null, -110, null, null);
    await cycle(p.east, 'Onion', 'harvested', 150, 35, 33, 18000);
    await cycle(p.west, 'Wheat', 'harvested', 260, 120, 118, 6000);
    await cycle(p.east, 'Onion', 'sown', 15, -105, null, null);
    await cycle(p.west, 'Wheat', 'growing', 25, -95, null, null);

    // --- Listings ------------------------------------------------------------
    const listing = async (farmerId, crop, qty, unit, price, notes, status, age) =>
      (await insert(
        `INSERT INTO listings (farmer_id, crop_name, quantity, unit, unit_price, quality_notes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, unit_price`,
        [farmerId, crop, qty, unit, price, notes, status, daysAgo(age)]
      ));

    const L = {
      tomato: await listing(ids.farmer, 'Tomato', 1200, 'kg', 22, 'Grade A, hybrid variety, harvested this week', 'active', 30),
      ragi: await listing(ids.farmer, 'Ragi', 25, 'quintal', 3800, 'Sun-dried, cleaned, moisture under 12%', 'active', 45),
      groundnut: await listing(ids.farmer, 'Groundnut', 0, 'kg', 95, 'Bold kernels', 'sold_out', 40),
      jaggery: await listing(ids.farmer, 'Jaggery', 300, 'kg', 60, 'Organic, chemical-free', 'active', 12),
      onion: await listing(ids.farmer2, 'Onion', 80, 'quintal', 2400, 'Red onion, good storage life', 'active', 32),
      wheat: await listing(ids.farmer2, 'Wheat', 40, 'quintal', 2600, 'Lokwan variety', 'active', 20),
      grapes: await listing(ids.farmer2, 'Grapes', 500, 'kg', 85, 'Thompson seedless, export quality', 'active', 6),
    };

    // --- Orders (spread over ~6 weeks, mixed statuses) ---------------------
    const order = (l, qty, status, age, address = 'FreshMart Warehouse, Peenya, Bengaluru') =>
      q(
        `INSERT INTO orders (listing_id, buyer_id, quantity, total_price, status, delivery_address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [l.id, ids.buyer, qty, qty * Number(l.unit_price), status, address, daysAgo(age)]
      );

    await order(L.ragi, 5, 'delivered', 42);
    await order(L.groundnut, 400, 'delivered', 38);
    await order(L.onion, 10, 'delivered', 30);
    await order(L.tomato, 200, 'delivered', 26);
    await order(L.groundnut, 350, 'delivered', 22);
    await order(L.ragi, 3, 'cancelled', 19);
    await order(L.tomato, 150, 'shipped', 12);
    await order(L.wheat, 8, 'shipped', 9);
    await order(L.onion, 12, 'confirmed', 5);
    await order(L.jaggery, 50, 'confirmed', 3);
    await order(L.tomato, 100, 'pending', 1);
    await order(L.grapes, 60, 'pending', 0);

    // --- Field reports + history -------------------------------------------
    const report = async (userId, plotId, text, category, severity, status, location, age) => {
      const r = await insert(
        `INSERT INTO field_reports (user_id, plot_id, description, category, severity, status, location, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userId, plotId, text, category, severity, status, location, daysAgo(age)]
      );
      await q(
        `INSERT INTO report_status_history (report_id, status, changed_by, note, changed_at) VALUES ($1, 'open', $2, 'Report submitted', $3)`,
        [r.id, userId, daysAgo(age)]
      );
      const steps = { in_progress: ['in_progress'], resolved: ['in_progress', 'resolved'], rejected: ['rejected'] }[status] || [];
      const notes = { in_progress: 'Field officer assigned, visit scheduled', resolved: 'Issue fixed and verified on site', rejected: 'Duplicate of an earlier report' };
      for (const [i, s] of steps.entries()) {
        await q(
          `INSERT INTO report_status_history (report_id, status, changed_by, note, changed_at) VALUES ($1, $2, $3, $4, $5)`,
          [r.id, s, ids.admin, notes[s], daysAgo(Math.max(age - (i + 1) * 2, 0))]
        );
      }
    };

    await report(ids.farmer, p.north, 'Drip line burst near the north gate, water is flooding the field', 'irrigation', 'high', 'resolved', 'north gate', 35);
    await report(ids.farmer, p.south, 'Yellow spots spreading on tomato leaves, looks like early blight', 'disease', 'high', 'in_progress', 'South Patch', 14);
    await report(ids.farmer, p.river, 'Borewell pump motor not working since morning', 'equipment', 'critical', 'open', 'Riverside Plot', 2);
    await report(ids.farmer, p.north, 'Minor soil erosion on the slope after rain', 'soil', 'low', 'open', 'slope', 6);
    await report(ids.farmer2, p.east, 'Thrips found on onion crop in the east block', 'pest', 'medium', 'resolved', 'east block', 28);
    await report(ids.farmer2, p.west, 'Hailstorm damaged part of the wheat crop', 'weather_damage', 'high', 'open', 'West Block', 4);
    await report(ids.farmer2, null, 'Fence broken, cattle entering the farm', 'equipment', 'medium', 'rejected', null, 20);

    // --- Notifications -------------------------------------------------------
    const notify = (userId, message, type, link, age, read = false) =>
      q(
        `INSERT INTO notifications (user_id, message, type, link, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, message, type, link, read, daysAgo(age)]
      );
    await notify(ids.farmer, 'New order: 100 kg of Tomato (₹2,200)', 'order', '/orders', 1);
    await notify(ids.farmer, 'Your disease report is now in progress: Field officer assigned', 'report', '/reports', 12);
    await notify(ids.farmer, 'New order: 50 kg of Jaggery (₹3,000)', 'order', '/orders', 3, true);
    await notify(ids.buyer, 'Order for Tomato (150 kg) has shipped', 'order', '/orders', 10);
    await notify(ids.buyer, 'Order for Wheat (8 quintal) has shipped', 'order', '/orders', 7, true);
    await notify(ids.farmer2, 'New order: 60 kg of Grapes (₹5,100)', 'order', '/orders', 0);

    await q('COMMIT');
    console.log('Demo data seeded. Log in with any of these (password: demo1234):');
    for (const u of Object.values(DEMO_USERS)) console.log(`  ${u.role.padEnd(7)} ${u.email}`);
  } catch (err) {
    await q('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
