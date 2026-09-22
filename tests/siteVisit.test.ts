import test from 'node:test'
import assert from 'node:assert/strict'
import { parseLocation, validateSiteVisitSlot } from '../lib/siteVisitRules'

test('site visit accepts a normal weekday during working hours', () => {
  const errors = validateSiteVisitSlot('2026-09-23', '10:00', new Date('2026-09-22T12:00:00+05:30'))
  assert.deepEqual(errors, [])
})

test('site visit rejects Sunday', () => {
  const errors = validateSiteVisitSlot('2026-09-27', '10:00', new Date('2026-09-22T12:00:00+05:30'))
  assert.ok(errors.some((error) => error.includes('Sundays')))
})

test('site visit rejects out-of-hours booking', () => {
  const errors = validateSiteVisitSlot('2026-09-23', '20:00', new Date('2026-09-22T12:00:00+05:30'))
  assert.ok(errors.some((error) => error.includes('09:00 and 18:00')))
})

test('location coordinates are parsed safely', () => {
  assert.deepEqual(parseLocation('10.532100, 76.214200'), { latitude: 10.5321, longitude: 76.2142 })
  assert.deepEqual(parseLocation('not a coordinate'), { latitude: null, longitude: null })
})
