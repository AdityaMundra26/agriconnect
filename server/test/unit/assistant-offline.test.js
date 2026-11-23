import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { offlineAnswer, buildContextText } from '../../src/services/assistantContextService.js';
import { ORDER_TRANSITIONS } from '../../src/models/orderModel.js';

const farmerData = {
  user: { name: 'Ravi', role: 'farmer' },
  farm: { location: 'Mandya', soil_type: 'Red soil', irrigation_access: 'borewell', land_size: 10, preferred_crops: ['ragi'] },
  plots: [{ name: 'North Field', area: 5, crop_history: '' }],
  cycles: [{ crop_name: 'Ragi', plot_name: 'North Field', status: 'growing', sown_date: '2026-10-01', expected_harvest_date: '2027-01-15' }],
  listings: [{ crop_name: 'Tomato', quantity: 100, unit: 'kg', unit_price: 20, status: 'active', order_count: 1 }],
  orders: [
    { id: 1, crop_name: 'Tomato', quantity: 10, unit: 'kg', total_price: 200, status: 'delivered', buyer_name: 'A', created_at: new Date() },
    { id: 2, crop_name: 'Tomato', quantity: 5, unit: 'kg', total_price: 100, status: 'cancelled', buyer_name: 'A', created_at: new Date() },
    { id: 3, crop_name: 'Tomato', quantity: 5, unit: 'kg', total_price: 100, status: 'pending', buyer_name: 'A', created_at: new Date() },
  ],
  reports: [{ id: 9, description: 'Pump broken', category: 'equipment', severity: 'high', status: 'open', created_at: new Date() }],
};

describe('offlineAnswer', () => {
  test('sales question sums non-cancelled orders', () => {
    const a = offlineAnswer('How are my sales?', farmerData);
    assert.match(a, /3 total/);
    assert.match(a, /₹300/); // 200 + 100 pending, cancelled excluded
    assert.match(a, /1 order\(s\) are waiting/);
  });
  test('crop question includes the season and what is growing', () => {
    const a = offlineAnswer('What should I sow?', farmerData);
    assert.match(a, /season/i);
    assert.match(a, /Ragi on North Field/);
  });
  test('report question lists open reports', () => {
    assert.match(offlineAnswer('any open issues?', farmerData), /Pump broken/);
  });
  test('buyer with no orders gets a clear answer', () => {
    const a = offlineAnswer('how much did I spend', { ...farmerData, user: { role: 'buyer' }, orders: [], reports: [] });
    assert.match(a, /not placed any orders/);
  });
});

describe('buildContextText', () => {
  test('includes farm, plots, cycles, listings, orders and reports', () => {
    const text = buildContextText(farmerData);
    for (const s of ['Mandya', 'North Field', 'Ragi', 'Tomato', 'Order #1', 'Report #9']) assert.ok(text.includes(s), s);
  });
});

describe('ORDER_TRANSITIONS', () => {
  test('only allows forward moves; delivered and cancelled are terminal', () => {
    assert.deepEqual(ORDER_TRANSITIONS.pending, ['confirmed', 'cancelled']);
    assert.deepEqual(ORDER_TRANSITIONS.shipped, ['delivered']);
    assert.deepEqual(ORDER_TRANSITIONS.delivered, []);
    assert.deepEqual(ORDER_TRANSITIONS.cancelled, []);
    for (const next of Object.values(ORDER_TRANSITIONS)) assert.ok(!next.includes('pending'));
  });
});
