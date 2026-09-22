import test from 'node:test'
import assert from 'node:assert/strict'
import { createLeadToken, verifyLeadToken } from '../lib/leadAuth'

test('lead token is bound to its lead ID', () => {
  process.env.LEAD_SESSION_SECRET = 'test-secret-for-lead-auth'
  const token = createLeadToken('DSN-TEST-1')
  assert.equal(verifyLeadToken('DSN-TEST-1', token), true)
  assert.equal(verifyLeadToken('DSN-TEST-2', token), false)
})

test('lead token rejects malformed values', () => {
  process.env.LEAD_SESSION_SECRET = 'test-secret-for-lead-auth'
  assert.equal(verifyLeadToken('DSN-TEST-1', 'invalid'), false)
})
