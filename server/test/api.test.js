// End-to-end API tests against a real Postgres (DATABASE_URL). The suite
// creates its own throwaway users (emails ending in @test.agriconnect) and
// deletes them - and everything they own - when it finishes.
//
//   npm test            (unit + API)
//   npm run test:api    (API only)
import 'dotenv/config';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL && 'DATABASE_URL not set';
process.env.JWT_SECRET ||= 'test-secret';

let app, pool, query, server, BASE;
const RUN = Date.now().toString(36);
const email = (who) => `${who}-${RUN}@test.agriconnect`;
const tokens = {};
const ids = {};

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const waitFor = async (fn, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
};

describe('AgriConnect API', { skip: SKIP }, () => {
  before(async () => {
    ({ default: app } = await import('../src/app.js'));
    ({ pool, query } = await import('../src/config/db.js'));
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    BASE = `http://127.0.0.1:${server.address().port}/api`;

    for (const [who, role] of [['farmer', 'farmer'], ['buyer', 'buyer'], ['admin', 'buyer'], ['other', 'farmer']]) {
      const r = await api('POST', '/auth/register', {
        body: { name: `Test ${who}`, email: email(who), password: 'password123', role, phone: '9845000000' },
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      ids[who] = r.body.user.id;
    }
    // Admins can't self-register; promote one directly, then log in for a fresh token.
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [ids.admin]);
    for (const who of ['farmer', 'buyer', 'admin', 'other']) {
      tokens[who] = (await api('POST', '/auth/login', { body: { email: email(who).toUpperCase(), password: 'password123' } })).body.token;
    }
  });

  after(async () => {
    if (query) await query(`DELETE FROM users WHERE email LIKE $1`, [`%-${RUN}@test.agriconnect`]);
    server?.close();
    await pool?.end();
  });

  describe('auth', () => {
    test('rejects duplicate email, short password, admin self-signup, bad email', async () => {
      assert.equal((await api('POST', '/auth/register', { body: { name: 'x', email: email('farmer'), password: 'password123' } })).status, 409);
      assert.equal((await api('POST', '/auth/register', { body: { name: 'x', email: email('n1'), password: 'short' } })).status, 400);
      assert.equal((await api('POST', '/auth/register', { body: { name: 'x', email: email('n2'), password: 'password123', role: 'admin' } })).status, 400);
      assert.equal((await api('POST', '/auth/register', { body: { name: 'x', email: 'not-an-email', password: 'password123' } })).status, 400);
    });
    test('wrong password is 401; missing token is 401', async () => {
      assert.equal((await api('POST', '/auth/login', { body: { email: email('farmer'), password: 'nope' } })).status, 401);
      assert.equal((await api('GET', '/auth/me')).status, 401);
    });
    test('profile update and alert opt-in validation', async () => {
      const r = await api('PUT', '/auth/me', { token: tokens.farmer, body: { name: 'Ravi Test', smsAlerts: true } });
      assert.equal(r.status, 200);
      assert.equal(r.body.user.sms_alerts, true);
      const noPhone = await api('PUT', '/auth/me', { token: tokens.other, body: { phone: '', smsAlerts: true } });
      assert.equal(noPhone.status, 400);
    });
  });

  describe('farm, plots, crop cycles, advisory', () => {
    test('farmer creates a farm and plots; buyer cannot', async () => {
      const farm = await api('POST', '/farms', {
        token: tokens.farmer,
        body: { location: 'Mandya, Karnataka', soilType: 'Black soil', irrigationAccess: 'drip', landSize: 10, preferredCrops: ['wheat'] },
      });
      assert.equal(farm.status, 201);
      assert.equal((await api('POST', '/farms', { token: tokens.buyer, body: { location: 'x' } })).status, 403);
      assert.equal((await api('POST', '/farms', { token: tokens.farmer, body: { location: 'again' } })).status, 409);

      const plot = await api('POST', '/plots', { token: tokens.farmer, body: { name: 'North', area: 4 } });
      assert.equal(plot.status, 201);
      ids.plot = plot.body.plot.id;
      assert.equal((await api('POST', '/plots', { token: tokens.farmer, body: { name: 'Bad', area: -2 } })).status, 400);
    });

    test('crop cycle lifecycle with validation and ownership', async () => {
      const c = await api('POST', '/crop-cycles', {
        token: tokens.farmer,
        body: { plotId: ids.plot, cropName: 'Wheat', status: 'sown', sownDate: '2026-11-01', expectedHarvestDate: '2027-03-01' },
      });
      assert.equal(c.status, 201);
      const h = await api('PUT', `/crop-cycles/${c.body.cycle.id}`, { token: tokens.farmer, body: { status: 'harvested', harvestedQuantity: 1200 } });
      assert.equal(h.status, 200);
      assert.ok(h.body.cycle.harvest_date, 'harvest date auto-filled');

      const bad = await api('POST', '/crop-cycles', {
        token: tokens.farmer,
        body: { plotId: ids.plot, cropName: 'X', sownDate: '2026-11-10', expectedHarvestDate: '2026-10-01' },
      });
      assert.equal(bad.status, 400);
      assert.equal((await api('PUT', `/crop-cycles/${c.body.cycle.id}`, { token: tokens.other, body: { status: 'failed' } })).status, 403);

      const y = await api('GET', '/analytics/yield', { token: tokens.farmer });
      assert.equal(y.body.byCrop[0].crop_name, 'Wheat');
      assert.equal(y.body.byCrop[0].per_acre, 300);
    });

    test('advisory uses soil and irrigation; non-owner is forbidden', async () => {
      const a = await api('GET', `/advisory/${ids.plot}`, { token: tokens.farmer });
      assert.equal(a.status, 200);
      assert.equal(a.body.advisory.soilRecognized, true);
      assert.equal(a.body.advisory.irrigationInterval, '2-3 days');
      assert.equal((await api('GET', `/advisory/${ids.plot}`, { token: tokens.other })).status, 403);
    });

    test('invalid id returns 400, not 500', async () => {
      assert.equal((await api('GET', '/plots/not-a-number', { token: tokens.farmer })).status, 400);
    });
  });

  describe('marketplace and orders', () => {
    test('listing create, validation and admin-only-status rule', async () => {
      const l = await api('POST', '/listings', {
        token: tokens.farmer,
        body: { cropName: 'Tomato', quantity: 100, unit: 'kg', unitPrice: 20 },
      });
      assert.equal(l.status, 201);
      ids.listing = l.body.listing.id;
      assert.equal((await api('POST', '/listings', { token: tokens.buyer, body: { cropName: 'x', quantity: 1, unitPrice: 1 } })).status, 403);
      assert.equal((await api('POST', '/listings', { token: tokens.farmer, body: { cropName: 'x', quantity: 1, unitPrice: 1, unit: 'bags' } })).status, 400);
      assert.equal((await api('PUT', `/listings/${ids.listing}`, { token: tokens.admin, body: { unitPrice: 1 } })).status, 403);
      assert.equal((await api('PUT', `/listings/${ids.listing}`, { token: tokens.other, body: { unitPrice: 1 } })).status, 403);
    });

    test('browse filters and sorting', async () => {
      const r = await api('GET', '/listings?cropName=tomato&maxPrice=25&sort=price_asc');
      assert.ok(r.body.listings.some((l) => l.id === ids.listing));
      assert.ok(!(await api('GET', '/listings?maxPrice=5')).body.listings.some((l) => l.id === ids.listing));
      assert.equal((await api('GET', '/listings?minPrice=abc')).status, 400);
    });

    test('order decrements stock, notifies the farmer live, and sends an SMS alert', async () => {
      // Open the farmer's live notification stream first.
      const controller = new AbortController();
      const stream = await fetch(`${BASE}/notifications/stream?token=${tokens.farmer}`, { signal: controller.signal });
      assert.equal(stream.headers.get('content-type'), 'text/event-stream');
      const reader = stream.body.getReader();
      let received = '';
      const readUntil = (pattern) =>
        Promise.race([
          (async () => {
            while (!pattern.test(received)) {
              const { value, done } = await reader.read();
              if (done) break;
              received += new TextDecoder().decode(value);
            }
            return pattern.test(received);
          })(),
          new Promise((r) => setTimeout(() => r(false), 5000)),
        ]);
      assert.ok(await readUntil(/event: ready/));

      const o = await api('POST', '/orders', { token: tokens.buyer, body: { listingId: ids.listing, quantity: 30, deliveryAddress: 'Test Rd' } });
      assert.equal(o.status, 201);
      assert.equal(Number(o.body.order.total_price), 600);
      ids.order = o.body.order.id;

      assert.ok(await readUntil(/event: notification[\s\S]*New order/), 'farmer receives the notification over SSE');
      controller.abort();

      const listing = (await api('GET', '/listings/mine', { token: tokens.farmer })).body.listings.find((l) => l.id === ids.listing);
      assert.equal(Number(listing.quantity), 70);

      // Farmer opted in to SMS earlier in the suite.
      const alert = await waitFor(async () => (await query(`SELECT * FROM alert_log WHERE user_id = $1 AND channel = 'sms'`, [ids.farmer])).rows[0]);
      assert.ok(alert, 'SMS alert was logged');
      assert.equal(alert.to_number, '+919845000000');
      assert.match(alert.message, /New order/);
    });

    test('SSE stream rejects a bad token', async () => {
      assert.equal((await fetch(`${BASE}/notifications/stream?token=garbage`)).status, 401);
    });

    test('rejects over-stock, self-orders and farmer orders', async () => {
      const over = await api('POST', '/orders', { token: tokens.buyer, body: { listingId: ids.listing, quantity: 1000 } });
      assert.equal(over.status, 400);
      assert.match(over.body.error, /Only 70/);
      assert.equal((await api('POST', '/orders', { token: tokens.farmer, body: { listingId: ids.listing, quantity: 1 } })).status, 403);
    });

    test('status transitions are forward-only; buyer may only cancel pending', async () => {
      assert.equal((await api('PUT', `/orders/${ids.order}/status`, { token: tokens.farmer, body: { status: 'delivered' } })).status, 400);
      assert.equal((await api('PUT', `/orders/${ids.order}/status`, { token: tokens.buyer, body: { status: 'confirmed' } })).status, 403);
      assert.equal((await api('PUT', `/orders/${ids.order}/status`, { token: tokens.other, body: { status: 'confirmed' } })).status, 403);
      for (const s of ['confirmed', 'shipped', 'delivered']) {
        assert.equal((await api('PUT', `/orders/${ids.order}/status`, { token: tokens.farmer, body: { status: s } })).status, 200, s);
      }
      assert.equal((await api('PUT', `/orders/${ids.order}/status`, { token: tokens.farmer, body: { status: 'cancelled' } })).status, 400);
    });

    test('selling out marks the listing sold_out; cancelling restores stock and reactivates it', async () => {
      const o = await api('POST', '/orders', { token: tokens.buyer, body: { listingId: ids.listing, quantity: 70 } });
      assert.equal(o.status, 201);
      let l = (await api('GET', '/listings/mine', { token: tokens.farmer })).body.listings.find((x) => x.id === ids.listing);
      assert.equal(l.status, 'sold_out');
      assert.equal((await api('PUT', `/orders/${o.body.order.id}/status`, { token: tokens.buyer, body: { status: 'cancelled' } })).status, 200);
      l = (await api('GET', '/listings/mine', { token: tokens.farmer })).body.listings.find((x) => x.id === ids.listing);
      assert.equal(l.status, 'active');
      assert.equal(Number(l.quantity), 70);
    });

    test('concurrent orders cannot oversell', async () => {
      const attempts = await Promise.all(
        Array.from({ length: 5 }, () => api('POST', '/orders', { token: tokens.buyer, body: { listingId: ids.listing, quantity: 20 } }))
      );
      assert.equal(attempts.filter((r) => r.status === 201).length, 3); // 3 x 20 = 60 of the 70 left
      const l = (await api('GET', '/listings/mine', { token: tokens.farmer })).body.listings.find((x) => x.id === ids.listing);
      assert.equal(Number(l.quantity), 10);
    });

    test('analytics and dashboard reflect the activity', async () => {
      const m = await api('GET', '/analytics/marketplace', { token: tokens.farmer });
      assert.equal(m.body.totals.revenue, 600 + 3 * 400);
      const d = await api('GET', '/dashboard/summary', { token: tokens.buyer });
      assert.equal(d.body.role, 'buyer');
      assert.equal(d.body.stats.spent, 1800);
    });
  });

  describe('field reports', () => {
    test('farmer report is classified; admin moderates with a note; history is recorded', async () => {
      const r = await api('POST', '/reports', {
        token: tokens.farmer,
        body: { description: 'Pump motor not working, whole field is drying - urgent', plotId: ids.plot },
      });
      assert.equal(r.status, 201);
      assert.equal(r.body.report.category, 'equipment');
      assert.equal(r.body.report.severity, 'critical');
      ids.report = r.body.report.id;

      assert.equal((await api('PUT', `/reports/${ids.report}/status`, { token: tokens.farmer, body: { status: 'resolved' } })).status, 403);
      const u = await api('PUT', `/reports/${ids.report}/status`, { token: tokens.admin, body: { status: 'in_progress', note: 'Mechanic sent' } });
      assert.equal(u.status, 200);

      const detail = await api('GET', `/reports/${ids.report}`, { token: tokens.farmer });
      assert.deepEqual(detail.body.history.map((h) => h.status), ['open', 'in_progress']);
      assert.equal(detail.body.history[1].note, 'Mechanic sent');
      assert.equal((await api('GET', `/reports/${ids.report}`, { token: tokens.other })).status, 403);
    });

    test('validation: too short, and admins cannot file', async () => {
      assert.equal((await api('POST', '/reports', { token: tokens.farmer, body: { description: 'bad' } })).status, 400);
      assert.equal((await api('POST', '/reports', { token: tokens.admin, body: { description: 'a long enough report' } })).status, 403);
    });
  });

  describe('notifications, alerts, admin', () => {
    test('notifications list, unread count and mark-all-read', async () => {
      const n = await api('GET', '/notifications', { token: tokens.buyer });
      assert.ok(n.body.unread > 0);
      assert.ok(n.body.notifications.some((x) => /in_progress|confirmed|shipped/.test(x.message) || /is now/.test(x.message)));
      await api('PUT', '/notifications/read-all', { token: tokens.buyer });
      assert.equal((await api('GET', '/notifications', { token: tokens.buyer })).body.unread, 0);
    });

    test('test alert endpoint sends regardless of opt-in, and needs a phone', async () => {
      const t = await api('POST', '/auth/me/test-alert', { token: tokens.buyer, body: { channel: 'voice' } });
      assert.equal(t.status, 200);
      assert.equal(t.body.alert.channel, 'voice');
      await api('PUT', '/auth/me', { token: tokens.other, body: { phone: '' } });
      assert.equal((await api('POST', '/auth/me/test-alert', { token: tokens.other, body: {} })).status, 400);
    });

    test('admin endpoints are admin-only', async () => {
      assert.equal((await api('GET', '/admin/users', { token: tokens.farmer })).status, 403);
      const users = await api('GET', '/admin/users', { token: tokens.admin });
      assert.ok(users.body.users.some((u) => u.id === ids.farmer));
      const alerts = await api('GET', '/admin/alerts', { token: tokens.admin });
      assert.equal(alerts.status, 200);
      assert.ok(alerts.body.alerts.some((a) => a.user_id === ids.farmer));
    });

    test('demo data: status is public; toggle respects DEMO_TOGGLE; load is idempotent', async () => {
      const original = process.env.DEMO_TOGGLE;
      try {
        const s = await api('GET', '/demo');
        assert.equal(s.status, 200);
        assert.equal(typeof s.body.enabled, 'boolean');

        process.env.DEMO_TOGGLE = 'off';
        assert.equal((await api('POST', '/demo/disable', { token: tokens.admin })).status, 403);

        process.env.DEMO_TOGGLE = 'admin';
        assert.equal((await api('POST', '/demo/disable')).status, 403);
        assert.equal((await api('POST', '/demo/disable', { token: tokens.farmer })).status, 403);

        // Admin load (re-)seeds the fixed demo set; loading twice gives identical counts.
        const first = await api('POST', '/demo/enable', { token: tokens.admin });
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.equal(first.body.enabled, true);
        assert.equal(first.body.counts.users, 11);
        const second = await api('POST', '/demo/enable', { token: tokens.admin });
        assert.deepEqual(second.body.counts, first.body.counts);

        // Demo data never touches non-demo accounts.
        assert.equal((await api('GET', '/auth/me', { token: tokens.farmer })).status, 200);
        const demoFarmer = await api('POST', '/auth/login', { body: { email: 'farmer@demo.com', password: 'demo1234' } });
        assert.equal(demoFarmer.status, 200);
      } finally {
        if (original === undefined) delete process.env.DEMO_TOGGLE;
        else process.env.DEMO_TOGGLE = original;
      }
    });

    test('assistant answers offline from the user\'s data', async () => {
      const a = await api('POST', '/assistant/query', { token: tokens.farmer, body: { question: 'How are my sales?' } });
      assert.equal(a.status, 200);
      assert.ok(a.body.answer.length > 0);
      assert.equal((await api('POST', '/assistant/query', { token: tokens.farmer, body: { question: '' } })).status, 400);
    });
  });
});
