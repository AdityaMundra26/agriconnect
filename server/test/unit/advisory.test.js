import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getSeason, normalizeSoil, generateAdvisory } from '../../src/services/advisoryService.js';

describe('getSeason', () => {
  test('June-October is kharif', () => {
    for (const m of [5, 6, 7, 8, 9]) assert.equal(getSeason(new Date(2026, m, 15)), 'kharif');
  });
  test('November-March is rabi', () => {
    for (const m of [10, 11, 0, 1, 2]) assert.equal(getSeason(new Date(2026, m, 15)), 'rabi');
  });
  test('April-May is zaid', () => {
    for (const m of [3, 4]) assert.equal(getSeason(new Date(2026, m, 15)), 'zaid');
  });
});

describe('normalizeSoil', () => {
  test('matches regardless of case and wording', () => {
    assert.equal(normalizeSoil('Black soil'), 'black');
    assert.equal(normalizeSoil('BLACK'), 'black');
    assert.equal(normalizeSoil('black cotton soil'), 'black');
    assert.equal(normalizeSoil('Alluvial Soil'), 'alluvial');
  });
  test('returns null for unknown or missing soil', () => {
    assert.equal(normalizeSoil('volcanic ash'), null);
    assert.equal(normalizeSoil(null), null);
    assert.equal(normalizeSoil(''), null);
  });
});

describe('generateAdvisory', () => {
  const farm = { soil_type: 'Red soil', irrigation_access: 'drip', preferred_crops: ['Groundnut'] };
  const plot = { name: 'North Field' };

  test('returns a complete advisory without weather', () => {
    const a = generateAdvisory({ farm, plot, weather: null });
    assert.equal(a.plotName, 'North Field');
    assert.ok(['kharif', 'rabi', 'zaid'].includes(a.season));
    assert.equal(a.suggestedCrops.length, 5);
    assert.equal(a.soilRecognized, true);
    assert.match(a.fertilizer, /Red soil/);
    assert.equal(a.irrigationInterval, '2-3 days');
    assert.deepEqual(a.alerts, []);
    assert.ok(a.weatherNote);
  });

  test('flags unrecognised soil and falls back to generic advice', () => {
    const a = generateAdvisory({ farm: { ...farm, soil_type: 'mystery' }, plot });
    assert.equal(a.soilRecognized, false);
    assert.match(a.fertilizer, /soil test/i);
  });

  test('raises weather alerts for heat, humidity, rain and wind', () => {
    const a = generateAdvisory({
      farm,
      plot,
      weather: { tempC: 40, humidity: 90, condition: 'Rain', description: 'light rain', windSpeed: 12 },
    });
    const levels = a.alerts.map((x) => x.level);
    assert.ok(levels.includes('critical'), 'heat stress should be critical');
    assert.equal(a.alerts.length, 4);
    assert.match(a.irrigation, /skip the next cycle/);
  });

  test('frost alert at near-freezing temperatures', () => {
    const a = generateAdvisory({ farm, plot, weather: { tempC: 2, humidity: 40, condition: 'Clear' } });
    assert.ok(a.alerts.some((x) => /frost/i.test(x.text)));
  });

  test('adds crop-specific tips for active cycles', () => {
    const a = generateAdvisory({ farm, plot, activeCycles: [{ crop_name: 'Wheat' }, { crop_name: 'Unknownberry' }] });
    assert.equal(a.cropTips.length, 1);
    assert.equal(a.cropTips[0].crop, 'Wheat');
  });
});
