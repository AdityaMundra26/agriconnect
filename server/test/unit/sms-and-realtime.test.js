import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { toE164, deliver, isTwilioConfigured } from '../../src/services/smsProvider.js';
import { subscribe, publish, connectionCount } from '../../src/services/realtime.js';

describe('toE164', () => {
  test('normalizes Indian numbers', () => {
    assert.equal(toE164('9845011111'), '+919845011111');
    assert.equal(toE164('98450 11111'), '+919845011111');
    assert.equal(toE164('+91 98450 11111'), '+919845011111');
    assert.equal(toE164('09845011111'), '+919845011111');
    assert.equal(toE164('919845011111'), '+919845011111');
  });
  test('keeps other international numbers', () => {
    assert.equal(toE164('+1 415 555 0100'), '+14155550100');
  });
  test('rejects missing or malformed numbers', () => {
    assert.equal(toE164(null), null);
    assert.equal(toE164(''), null);
    assert.equal(toE164('12345'), null);
  });
});

describe('deliver (simulated mode)', () => {
  test('simulates when Twilio is not configured', { skip: isTwilioConfigured() && 'Twilio is configured' }, async () => {
    const r = await deliver('sms', '+919845011111', 'hello');
    assert.deepEqual(r, { provider: 'simulated', status: 'simulated' });
  });
});

// Minimal stand-in for an http.ServerResponse.
function fakeRes() {
  const res = new EventEmitter();
  res.chunks = [];
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers; };
  res.write = (chunk) => res.chunks.push(chunk);
  return res;
}

describe('realtime pub/sub', () => {
  test('publishes only to the subscribed user and cleans up on close', () => {
    const a = fakeRes();
    const b = fakeRes();
    subscribe(101, a);
    subscribe(202, b);
    assert.equal(a.status, 200);
    assert.equal(a.headers['Content-Type'], 'text/event-stream');

    assert.equal(publish(101, 'notification', { id: 1, message: 'hi' }), 1);
    assert.ok(a.chunks.some((c) => c.includes('event: notification') && c.includes('"message":"hi"')));
    assert.ok(!b.chunks.some((c) => c.includes('event: notification')));

    a.emit('close');
    b.emit('close');
    assert.equal(connectionCount(101), 0);
    assert.equal(publish(101, 'notification', {}), 0);
  });

  test('fans out to multiple tabs of the same user', () => {
    const t1 = fakeRes();
    const t2 = fakeRes();
    subscribe(303, t1);
    subscribe(303, t2);
    assert.equal(publish(303, 'notification', { id: 2 }), 2);
    t1.emit('close');
    assert.equal(connectionCount(303), 1);
    t2.emit('close');
  });
});
