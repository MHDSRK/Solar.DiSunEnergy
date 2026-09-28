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

test('Page One financing rule for 3 kW excludes subsidy from out-of-pocket cost', () => {
  const r = calculateSolarResult(300, 'Domestic', 'units')
  assert.equal(r.kw, 3)
  assert.equal(r.cost, 220000)
  assert.equal(r.loan, 200000)
  assert.equal(r.netCost, 20000)
  assert.equal(r.loanAssumption.estimatedEmi, 1339)
})

test('Page One financing rule above 3 kW subtracts loan and subsidy', () => {
  const r = calculateSolarResult(600, 'Domestic', 'units')
  assert.equal(r.kw, 5)
  assert.equal(r.cost, 325000)
  assert.equal(r.loan, 200000)
  assert.equal(r.subsidy, 78000)
  assert.equal(r.netCost, 47000)
  assert.equal(r.loanAssumption.estimatedEmi, 2195)
})
