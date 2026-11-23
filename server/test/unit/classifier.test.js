import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ruleBasedClassify, REPORT_CATEGORIES, REPORT_SEVERITIES } from '../../src/services/aiService.js';

describe('ruleBasedClassify (offline report classifier)', () => {
  const cases = [
    ['Irrigation pipe broken near plot 2, water is flooding the field', 'irrigation', 'high', 'plot 2'],
    ['Aphids spreading fast on the mustard near the east boundary', 'pest', 'high', 'the east boundary'],
    ['Yellow spots on tomato leaves, looks like blight', 'disease', 'medium', null],
    ['Borewell pump motor not working at the riverside plot', 'irrigation', 'high', 'the riverside plot'],
    ['Tractor engine making noise', 'equipment', 'medium', null],
    ['Hailstorm damaged the entire wheat crop', 'weather_damage', 'critical', null],
    ['Minor soil erosion on the slope', 'soil', 'low', 'the slope'],
    ['Something odd happened today', 'other', 'medium', null],
  ];

  for (const [text, category, severity, location] of cases) {
    test(`"${text.slice(0, 40)}…" -> ${category}/${severity}`, () => {
      const r = ruleBasedClassify(text);
      assert.equal(r.category, category);
      assert.equal(r.severity, severity);
      assert.equal(r.location, location);
      assert.equal(r.aiClassified, false);
    });
  }

  test('always returns a valid category and severity', () => {
    for (const text of ['', 'xyz', 'URGENT!!!', 'a'.repeat(500)]) {
      const r = ruleBasedClassify(text);
      assert.ok(REPORT_CATEGORIES.includes(r.category));
      assert.ok(REPORT_SEVERITIES.includes(r.severity));
    }
  });
});
