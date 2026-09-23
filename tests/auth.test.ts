import test from 'node:test'
import assert from 'node:assert/strict'
import { createLeadToken, verifyLeadToken } from '../lib/leadAuth.ts'
import { hashAdminPassword, verifyAdminPassword } from '../lib/adminPassword.ts'

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

test('admin passwords are verified from a scrypt hash', async () => {
  const hash = await hashAdminPassword('correct-password')
  assert.equal(await verifyAdminPassword('correct-password', hash), true)
  assert.equal(await verifyAdminPassword('wrong-password', hash), false)
  assert.equal(await verifyAdminPassword('correct-password', hash.replace(/^scrypt\$/, 'plain$')), false)
})
