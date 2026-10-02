import assert from 'node:assert/strict'
import test from 'node:test'
import { validateSiteVisitSlot } from '../lib/siteVisitRules.ts'

test('rejects a site-visit time that has already passed today in India', () => {
  const now = new Date('2026-10-02T05:30:00.000Z') // 11:00 IST
  const errors = validateSiteVisitSlot('2026-10-02', '10:45', now)
  assert.ok(errors.includes('Preferred time must be later than the current time.'))
})

test('accepts a later site-visit time today during business hours', () => {
  const now = new Date('2026-10-02T05:30:00.000Z') // 11:00 IST
  const errors = validateSiteVisitSlot('2026-10-02', '11:15', now)
  assert.ok(!errors.includes('Preferred time must be later than the current time.'))
})
