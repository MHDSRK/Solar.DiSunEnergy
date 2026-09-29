import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { parseWhatsAppInbound, parseWhatsAppStatuses, verifyWhatsAppSignature } from '../lib/whatsapp.ts'

test('verifies a Meta-style webhook signature', () => {
  const previous = process.env.WHATSAPP_APP_SECRET
  process.env.WHATSAPP_APP_SECRET = 'test-secret'
  const body = '{"object":"whatsapp_business_account"}'
  const digest = createHmac('sha256', 'test-secret').update(body).digest('hex')

  assert.equal(verifyWhatsAppSignature(body, 'sha256=' + digest), true)
  assert.equal(verifyWhatsAppSignature(body + 'x', 'sha256=' + digest), false)
  assert.equal(verifyWhatsAppSignature(body, null), false)

  if (previous === undefined) delete process.env.WHATSAPP_APP_SECRET
  else process.env.WHATSAPP_APP_SECRET = previous
})

test('parses inbound WhatsApp text and media messages', () => {
  const body = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [
            { id: 'wamid.text', from: '919876543210', timestamp: '1770000000', type: 'text', text: { body: 'Need a 5kW system' } },
            { id: 'wamid.image', from: '919876543210', timestamp: '1770000001', type: 'image', image: { id: 'media-1', caption: 'KSEB bill' } },
          ],
        },
      }],
    }],
  }

  const messages = parseWhatsAppInbound(body)
  assert.equal(messages.length, 2)
  assert.equal(messages[0].from, '919876543210')
  assert.equal(messages[0].text, 'Need a 5kW system')
  assert.equal(messages[1].mediaId, 'media-1')
  assert.equal(messages[1].caption, 'KSEB bill')
})

test('parses delivery status updates', () => {
  const statuses = parseWhatsAppStatuses({
    entry: [{
      changes: [{
        value: {
          statuses: [{ id: 'wamid.outbound', status: 'read', timestamp: '1770000002', recipient_id: '919876543210' }],
        },
      }],
    }],
  })

  assert.deepEqual(statuses[0], {
    messageId: 'wamid.outbound',
    status: 'read',
    timestamp: '1770000002',
    recipient: '919876543210',
    raw: { id: 'wamid.outbound', status: 'read', timestamp: '1770000002', recipient_id: '919876543210' },
  })
})
