import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRunningCosts } from '../public/js/domain/costs.js';

const defaults = Object.freeze({
  monthlyDistance: 600,
  petrolPrice: 6.36,
  petrolEfficiency: 48.6,
  electricityPrice: 1.01226,
  batteryEnergy: 1,
  electricRange: 40
});

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `Expected ${actual} to be approximately ${expected}`);
}

test('current motorcycle defaults use the nominal battery energy with no overhead', () => {
  const result = calculateRunningCosts(defaults);

  assert.deepEqual(Object.keys(result), [
    'energyPerCharge', 'petrolPerKm', 'electricPerKm', 'petrolMonthly',
    'electricMonthly', 'difference', 'outcome', 'shownDifference',
    'annualDifference', 'percentage', 'petrolBarPercent', 'electricBarPercent'
  ]);
  assert.equal(result.energyPerCharge, 1);
  close(result.petrolPerKm, 0.1308641975308642);
  close(result.electricPerKm, 0.0253065);
  close(result.petrolMonthly, 78.51851851851852);
  close(result.electricMonthly, 15.1839);
  close(result.difference, 63.33461851851852);
  assert.equal(result.outcome, 'saving');
  close(result.shownDifference, 63.33461851851852);
  close(result.annualDifference, 760.0154222222222);
  close(result.percentage, 80.66201415094339);
  assert.equal(result.petrolBarPercent, 100);
  close(result.electricBarPercent, 19.3379858490566);
});

test('the car profile uses its supplied 10 km/l efficiency', () => {
  const result = calculateRunningCosts({ ...defaults, petrolEfficiency: 10 });

  close(result.petrolPerKm, 0.636);
  close(result.petrolMonthly, 381.6);
  close(result.electricMonthly, 15.1839);
  close(result.shownDifference, 366.4161);
  close(result.annualDifference, 4396.9932);
  close(result.percentage, 96.02099056603773);
  close(result.electricBarPercent, 3.979009433962264);
});

test('doubling distance doubles monthly and annual costs, preserving per-km rates', () => {
  const result = calculateRunningCosts({ ...defaults, monthlyDistance: 1200 });

  close(result.petrolPerKm, 0.1308641975308642);
  close(result.electricPerKm, 0.0253065);
  close(result.petrolMonthly, 157.03703703703704);
  close(result.electricMonthly, 30.3678);
  close(result.difference, 126.66923703703704);
  close(result.annualDifference, 1520.0308444444444);
  close(result.percentage, 80.66201415094339);
  close(result.electricBarPercent, 19.3379858490566);
});

test('zero distance produces equal zero costs and empty bar lengths', () => {
  const result = calculateRunningCosts({ ...defaults, monthlyDistance: 0 });

  assert.equal(result.petrolMonthly, 0);
  assert.equal(result.electricMonthly, 0);
  assert.equal(result.difference, 0);
  assert.equal(result.outcome, 'equal');
  assert.equal(result.shownDifference, 0);
  assert.equal(result.annualDifference, 0);
  assert.equal(result.percentage, null);
  assert.equal(result.petrolBarPercent, 0);
  assert.equal(result.electricBarPercent, 0);
});

test('matching running costs are equal with both bars at full width', () => {
  const result = calculateRunningCosts({
    monthlyDistance: 100, petrolPrice: 5, petrolEfficiency: 10,
    electricityPrice: 2, batteryEnergy: 5, electricRange: 20
  });

  assert.equal(result.petrolPerKm, 0.5);
  assert.equal(result.electricPerKm, 0.5);
  assert.equal(result.petrolMonthly, 50);
  assert.equal(result.electricMonthly, 50);
  assert.equal(result.difference, 0);
  assert.equal(result.outcome, 'equal');
  assert.equal(result.shownDifference, 0);
  assert.equal(result.annualDifference, 0);
  assert.equal(result.percentage, 0);
  assert.equal(result.petrolBarPercent, 100);
  assert.equal(result.electricBarPercent, 100);
});

test('differences below half a cent display as equal without rounding the costs', () => {
  const result = calculateRunningCosts({
    monthlyDistance: 1, petrolPrice: 0.004, petrolEfficiency: 1,
    electricityPrice: 0, batteryEnergy: 1, electricRange: 1
  });

  assert.equal(result.petrolMonthly, 0.004);
  assert.equal(result.difference, 0.004);
  assert.equal(result.outcome, 'equal');
  assert.equal(result.shownDifference, 0);
  assert.equal(result.annualDifference, 0);
  assert.equal(result.percentage, 100);
});

test('a difference of half a cent is retained', () => {
  const result = calculateRunningCosts({
    monthlyDistance: 1, petrolPrice: 0.005, petrolEfficiency: 1,
    electricityPrice: 0, batteryEnergy: 1, electricRange: 1
  });

  assert.equal(result.outcome, 'saving');
  assert.equal(result.shownDifference, 0.005);
  assert.equal(result.annualDifference, 0.06);
});

test('more expensive charging reports a positive additional cost', () => {
  const result = calculateRunningCosts({
    monthlyDistance: 100, petrolPrice: 2, petrolEfficiency: 10,
    electricityPrice: 3, batteryEnergy: 2, electricRange: 10
  });

  assert.equal(result.petrolMonthly, 20);
  assert.equal(result.electricMonthly, 60);
  assert.equal(result.difference, -40);
  assert.equal(result.outcome, 'higher');
  assert.equal(result.shownDifference, 40);
  assert.equal(result.annualDifference, 480);
  assert.equal(result.percentage, 200);
  close(result.petrolBarPercent, 33.33333333333333);
  assert.equal(result.electricBarPercent, 100);
});

test('free petrol keeps the comparison valid without a percentage denominator', () => {
  const result = calculateRunningCosts({ ...defaults, petrolPrice: 0 });

  assert.equal(result.petrolMonthly, 0);
  close(result.electricMonthly, 15.1839);
  assert.equal(result.outcome, 'higher');
  close(result.shownDifference, 15.1839);
  close(result.annualDifference, 182.2068);
  assert.equal(result.percentage, null);
  assert.equal(result.petrolBarPercent, 0);
  assert.equal(result.electricBarPercent, 100);
});

test('free electricity is accepted, including a scenario with both prices at zero', () => {
  const freeElectricity = calculateRunningCosts({ ...defaults, electricityPrice: 0 });
  assert.equal(freeElectricity.electricMonthly, 0);
  assert.equal(freeElectricity.outcome, 'saving');
  assert.equal(freeElectricity.percentage, 100);
  assert.equal(freeElectricity.electricBarPercent, 0);

  const bothFree = calculateRunningCosts({ ...defaults, petrolPrice: 0, electricityPrice: 0 });
  assert.equal(bothFree.outcome, 'equal');
  assert.equal(bothFree.shownDifference, 0);
  assert.equal(bothFree.percentage, null);
  assert.equal(bothFree.petrolBarPercent, 0);
  assert.equal(bothFree.electricBarPercent, 0);
});

for (const key of Object.keys(defaults)) {
  for (const value of [-1, NaN, Infinity, -Infinity, '1', undefined, null]) {
    test(`rejects invalid ${key}: ${String(value)}`, () => {
      assert.throws(() => calculateRunningCosts({ ...defaults, [key]: value }), RangeError);
    });
  }
}

for (const key of ['petrolEfficiency', 'batteryEnergy', 'electricRange']) {
  test(`rejects zero ${key}`, () => {
    assert.throws(() => calculateRunningCosts({ ...defaults, [key]: 0 }), RangeError);
  });
}

test('missing inputs are rejected', () => {
  assert.throws(() => calculateRunningCosts({}), RangeError);
  assert.throws(() => calculateRunningCosts(), RangeError);
});
