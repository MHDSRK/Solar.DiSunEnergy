import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateFeasibility, normalizeTransformer, parseKw } from '../services/kseb/feasibilityEngine'

test('KSEB reCap values map to the published balance formula', () => {
  const record = normalizeTransformer({
    id: '1',
    transformer_name: 'Test DTR',
    feeder_name: 'Feeder',
    capacity: '100',
    allowed_cap: '81',
    regi: '6',
    comp_cap: '55',
  })
  assert.ok(record)
  assert.equal(record?.balanceAvailableKw, 20)
})

test('KSEB feasibility result uses remaining capacity', () => {
  assert.equal(calculateFeasibility(20, 5).status, 'PRELIMINARILY_FEASIBLE')
  assert.equal(calculateFeasibility(20, 25).status, 'INSUFFICIENT_CAPACITY')
})

test('KSEB numeric parsing handles formatted values', () => {
  assert.equal(parseKw('1,234.50 kW'), 1234.5)
  assert.equal(parseKw(''), null)
})
