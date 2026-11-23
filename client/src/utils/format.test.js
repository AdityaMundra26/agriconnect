import { describe, test, expect, vi, afterEach } from 'vitest';
import { inr, inrCompact, num, label, initials, errorMessage, daysUntil, timeAgo } from './format.js';
import { cropEmoji, cropTint, ORDER_NEXT, ORDER_FLOW, TONES } from './constants.js';

describe('money formatting', () => {
  test('inr uses Indian digit grouping', () => {
    expect(inr(103150)).toBe('₹1,03,150');
    expect(inr(0)).toBe('₹0');
    expect(inr('22.5')).toBe('₹22.5');
    expect(inr(null)).toBe('₹0');
  });
  test('inrCompact abbreviates to K / L / Cr without losing precision', () => {
    expect(inrCompact(950)).toBe('₹950');
    expect(inrCompact(14736)).toBe('₹14.7K');
    expect(inrCompact(103150)).toBe('₹1.03L');
    expect(inrCompact(100000)).toBe('₹1L');
    expect(inrCompact(25000000)).toBe('₹2.5Cr');
  });
  test('num trims decimals', () => {
    expect(num('1200.00')).toBe('1,200');
    expect(num(12.345)).toBe('12.35');
  });
});

describe('text helpers', () => {
  test('label replaces underscores', () => {
    expect(label('in_progress')).toBe('in progress');
    expect(label('weather_damage')).toBe('weather damage');
    expect(label(null)).toBe('');
  });
  test('initials', () => {
    expect(initials('Ravi Kumar')).toBe('RK');
    expect(initials('Anil Sharma (FreshMart)')).toBe('AS');
    expect(initials('')).toBe('');
  });
  test('errorMessage prefers the API error and explains network failures', () => {
    expect(errorMessage({ response: { data: { error: 'Nope' } } })).toBe('Nope');
    expect(errorMessage({ code: 'ERR_NETWORK' })).toMatch(/Cannot reach the server/);
    expect(errorMessage({}, 'Fallback')).toBe('Fallback');
  });
});

describe('dates', () => {
  afterEach(() => vi.useRealTimers());
  test('daysUntil counts whole days from today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 15, 0));
    expect(daysUntil(new Date(2026, 10, 30))).toBe(7);
    expect(daysUntil(new Date(2026, 10, 20))).toBe(-3);
    expect(daysUntil(null)).toBeNull();
  });
  test('timeAgo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
    expect(timeAgo('2026-11-23T11:59:30Z')).toBe('just now');
    expect(timeAgo('2026-11-23T11:15:00Z')).toBe('45m ago');
    expect(timeAgo('2026-11-23T07:00:00Z')).toBe('5h ago');
    expect(timeAgo('2026-11-20T12:00:00Z')).toBe('3d ago');
  });
});

describe('constants', () => {
  test('cropEmoji matches exact and partial names, with a default', () => {
    expect(cropEmoji('Tomato')).toBe('🍅');
    expect(cropEmoji('Red Onion')).toBe('🧅');
    expect(cropEmoji('Dragonfruit')).toBe('🌱');
  });
  test('cropTint is stable for a crop name', () => {
    expect(cropTint('Wheat')).toBe(cropTint('wheat'));
    expect(cropTint('Wheat')).toMatch(/^tone-/);
  });
  test('client order transitions mirror the server (forward only)', () => {
    expect(ORDER_NEXT.pending).toEqual(['confirmed', 'cancelled']);
    expect(ORDER_NEXT.delivered).toEqual([]);
    expect(ORDER_FLOW).toEqual(['pending', 'confirmed', 'shipped', 'delivered']);
    for (const s of [...ORDER_FLOW, 'cancelled']) expect(TONES.order[s]).toBeTruthy();
  });
});
