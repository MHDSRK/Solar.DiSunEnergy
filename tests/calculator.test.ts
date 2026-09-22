import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateBillFromUnits, calculateSolarResult, calculateSubsidy, getRecommendedKw } from '../services/solar/calculator.ts'

test('solar recommendation regression values', () => {
  assert.equal(getRecommendedKw(2.5), 3)
  assert.equal(getRecommendedKw(4.1), 5)
  assert.equal(getRecommendedKw(5.1), 6)
})

test('calculator bill-to-kW regression', () => {
  assert.equal(calculateSolarResult(3500, 'Domestic', 'bill').kw, 5)
  assert.equal(calculateSolarResult(4200, 'Domestic', 'bill').kw, 5)
  assert.equal(calculateSolarResult(6000, 'Domestic', 'bill').kw, 7)
  assert.equal(calculateSolarResult(10000, 'Domestic', 'bill').kw, 11)
})

test('units mode remains deterministic', () => {
  assert.equal(calculateSolarResult(300, 'Domestic', 'units').kw, 3)
  assert.equal(calculateSolarResult(600, 'Domestic', 'units').kw, 5)
})

test('commercial systems have no central subsidy', () => {
  assert.equal(calculateSubsidy(5, 'Commercial'), 0)
  assert.equal(calculateSubsidy(3, 'Domestic'), 78000)
  assert.equal(calculateSubsidy(2, 'Domestic'), 60000)
})

test('bill conversion remains monotonic', () => {
  assert.ok(calculateBillFromUnits(500, 'Domestic') < calculateBillFromUnits(600, 'Domestic'))
})
