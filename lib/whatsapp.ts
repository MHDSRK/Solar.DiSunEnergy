import { createHmac, timingSafeEqual } from 'node:crypto'

export type WhatsAppInboundMessage = {
  messageId: string
  from: string
  timestamp: string | null
  type: string
  text: string | null
  mediaId: string | null
  caption: string | null
  raw: unknown
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(1)
  return digits
}

export function verifyWhatsAppSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim()
  if (!appSecret || !signature?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  const supplied = signature.slice(7)
  if (supplied.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(supplied, 'utf8'), Buffer.from(expected, 'utf8'))
}

function extractMessage(message: any): WhatsAppInboundMessage {
  const type = String(message?.type || 'unknown')
  const text = type === 'text' ? String(message?.text?.body || '') : null
  const media = message?.[type]
  const mediaId = media?.id ? String(media.id) : null
  const caption = media?.caption ? String(media.caption) : null
  return {
    messageId: String(message?.id || ''),
    from: normalizeWhatsAppPhone(String(message?.from || '')),
    timestamp: message?.timestamp ? String(message.timestamp) : null,
    type,
    text,
    mediaId,
    caption,
    raw: message,
  }
}

async function getDb() {
  return (await import('@/lib/db')).getSql()
}

let whatsappSchemaPromise: Promise<void> | null = null

async function ensureWhatsAppSchema() {
  return
}

export async function storeWhatsAppMessage(message: WhatsAppInboundMessage) {
  if (!message.messageId || !message.from) return { stored: false, duplicate: false }

  await ensureWhatsAppSchema()
  const sql = await getDb()
  const contacts = await sql.query(
    'INSERT INTO whatsapp_contacts (phone, updated_at) VALUES ($1, NOW()) ON CONFLICT (phone) DO UPDATE SET updated_at = NOW() RETURNING id',
    [message.from],
  )
  const contactId = Number((contacts as any[])[0]?.id)

  const conversations = await sql.query(
    'INSERT INTO whatsapp_conversations (contact_id, last_message_at, updated_at) VALUES ($1, COALESCE(TO_TIMESTAMP($2::double precision), NOW()), NOW()) ON CONFLICT (contact_id) DO UPDATE SET last_message_at = GREATEST(whatsapp_conversations.last_message_at, EXCLUDED.last_message_at), updated_at = NOW() RETURNING id',
    [contactId, message.timestamp || '0'],
  )
  const conversationId = Number((conversations as any[])[0]?.id)

  const rows = await sql.query(
    'INSERT INTO whatsapp_messages (conversation_id, whatsapp_message_id, direction, message_type, body, media_id, caption, sent_at, delivery_status, raw_payload) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(TO_TIMESTAMP($8::double precision), NOW()), $9, $10::jsonb) ON CONFLICT (whatsapp_message_id) DO NOTHING RETURNING id',
    [conversationId, message.messageId, 'INBOUND', message.type, message.text, message.mediaId, message.caption, message.timestamp || '0', 'received', JSON.stringify(message.raw)],
  )
  const stored = (rows as any[]).length > 0

  if (stored) {
    await sql.query(
      'UPDATE whatsapp_conversations SET unread_count = unread_count + 1, updated_at = NOW() WHERE id = $1',
      [conversationId],
    )
  }

  return { stored, duplicate: !stored, contactId, conversationId }
}

export async function linkWhatsAppContactToLead(phone: string) {
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) return
  const sql = await getDb()
  await sql.query(
    `UPDATE whatsapp_contacts
     SET lead_id = (
       SELECT lead_id
       FROM leads
       WHERE CASE
         WHEN length(regexp_replace(COALESCE(phone, ''), $$\\D$$, '', 'g')) = 10
           THEN '91' || regexp_replace(COALESCE(phone, ''), $$\\D$$, '', 'g')
         WHEN length(regexp_replace(COALESCE(phone, ''), $$\\D$$, '', 'g')) = 12
              AND left(regexp_replace(COALESCE(phone, ''), $$\\D$$, '', 'g'), 2) = '91'
           THEN regexp_replace(COALESCE(phone, ''), $$\\D$$, '', 'g')
         ELSE regexp_replace(COALESCE(phone, ''), $$\\D$$, '', 'g')
       END = $1
       ORDER BY updated_at DESC
       LIMIT 1
     ),
     updated_at = NOW()
     WHERE phone = $1`,
    [normalized],
  )
}

export async function ensureWhatsAppConversation(phone: string, leadId?: string | null) {
  await ensureWhatsAppSchema()
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) throw new Error('Lead does not have a valid WhatsApp phone number.')

  const sql = await getDb()
  const contacts = await sql.query(
    `INSERT INTO whatsapp_contacts (phone, lead_id, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (phone) DO UPDATE SET
       lead_id = COALESCE(EXCLUDED.lead_id, whatsapp_contacts.lead_id),
       updated_at = NOW()
     RETURNING id`,
    [normalized, leadId || null],
  )
  const contactId = Number((contacts as any[])[0]?.id)
  if (!contactId) throw new Error('Unable to create WhatsApp contact.')

  const conversations = await sql.query(
    `INSERT INTO whatsapp_conversations (contact_id, last_message_at, updated_at)
     VALUES ($1, NOW(), NOW())
     ON CONFLICT (contact_id) DO UPDATE SET
       updated_at = NOW()
     RETURNING id`,
    [contactId],
  )
  const conversationId = Number((conversations as any[])[0]?.id)
  if (!conversationId) throw new Error('Unable to create WhatsApp conversation.')

  return { normalized, contactId, conversationId }
}

export async function storeWhatsAppOutboundMessage(input: {
  conversationId: number
  messageId: string
  messageType: string
  body?: string | null
  rawPayload: unknown
  deliveryStatus?: string
}) {
  await ensureWhatsAppSchema()
  const sql = await getDb()
  const rows = await sql.query(
    `INSERT INTO whatsapp_messages
      (conversation_id, whatsapp_message_id, direction, message_type, body, delivery_status, sent_at, raw_payload)
     VALUES ($1, $2, 'OUTBOUND', $3, $4, $5, NOW(), $6::jsonb)
     ON CONFLICT (whatsapp_message_id) DO UPDATE SET
       updated_at = NOW()
     RETURNING id`,
    [
      input.conversationId,
      input.messageId,
      input.messageType,
      input.body || null,
      input.deliveryStatus || 'accepted',
      JSON.stringify(input.rawPayload),
    ],
  )
  await sql.query(
    'UPDATE whatsapp_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1',
    [input.conversationId],
  )
  return Number((rows as any[])[0]?.id)
}

export async function storeWhatsAppWebhookEvent(input: {
  eventType: string
  messageId?: string | null
  phoneNumberId?: string | null
  payload: unknown
}) {
  await ensureWhatsAppSchema()
  const sql = await getDb()
  await sql.query(
    'INSERT INTO whatsapp_webhook_events (event_type, message_id, phone_number_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
    [input.eventType, input.messageId || null, input.phoneNumberId || null, JSON.stringify(input.payload)],
  )
}

export function parseWhatsAppInbound(body: any): WhatsAppInboundMessage[] {
  const messages: WhatsAppInboundMessage[] = []
  for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value
      for (const message of Array.isArray(value?.messages) ? value.messages : []) {
        const parsed = extractMessage(message)
        if (parsed.messageId && parsed.from) messages.push(parsed)
      }
    }
  }
  return messages
}

export function parseWhatsAppStatuses(body: any) {
  const statuses: Array<{ messageId: string; status: string; timestamp: string | null; recipient: string | null; raw: unknown }> = []
  for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      for (const status of Array.isArray(change?.value?.statuses) ? change.value.statuses : []) {
        if (!status?.id) continue
        statuses.push({
          messageId: String(status.id),
          status: String(status.status || 'unknown'),
          timestamp: status.timestamp ? String(status.timestamp) : null,
          recipient: status.recipient_id ? normalizeWhatsAppPhone(String(status.recipient_id)) : null,
          raw: status,
        })
      }
    }
  }
  return statuses
}

const WHATSAPP_STATUS_RANK: Record<string, number> = {
  accepted: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

export async function updateWhatsAppStatus(status: { messageId: string; status: string; timestamp: string | null; recipient: string | null; raw: unknown }) {
  await ensureWhatsAppSchema()
  const sql = await getDb()
  const normalizedStatus = String(status.status || 'unknown').toLowerCase()
  const incomingRank = WHATSAPP_STATUS_RANK[normalizedStatus] ?? 0
  const timestamp = status.timestamp ? Number(status.timestamp) : NaN
  const hasTimestamp = Number.isFinite(timestamp) && timestamp > 0
  const statusAt = hasTimestamp ? new Date(timestamp * 1000) : null

  const rows = await sql.query(
    `UPDATE whatsapp_messages
     SET delivery_status = $1,
         status_at = COALESCE($2::timestamptz, status_at),
         sent_at = CASE WHEN $1 = 'sent' THEN COALESCE(sent_at, COALESCE($2::timestamptz, NOW())) ELSE sent_at END,
         delivered_at = CASE WHEN $1 = 'delivered' THEN COALESCE(delivered_at, COALESCE($2::timestamptz, NOW())) ELSE delivered_at END,
         read_at = CASE WHEN $1 = 'read' THEN COALESCE(read_at, COALESCE($2::timestamptz, NOW())) ELSE read_at END,
         failed_at = CASE WHEN $1 = 'failed' THEN COALESCE(failed_at, COALESCE($2::timestamptz, NOW())) ELSE failed_at END,
         error_payload = CASE WHEN $1 = 'failed' THEN $3::jsonb ELSE error_payload END,
         updated_at = NOW()
     WHERE whatsapp_message_id = $4
       AND (
         status_at IS NULL
         OR $2::timestamptz IS NULL
         OR $2::timestamptz >= status_at
       )
       AND (
         delivery_status IS NULL
         OR delivery_status = 'accepted'
         OR $5::integer >= COALESCE(
           CASE delivery_status
             WHEN 'accepted' THEN 0
             WHEN 'sent' THEN 1
             WHEN 'delivered' THEN 2
             WHEN 'read' THEN 3
             WHEN 'failed' THEN 4
             ELSE 0
           END, 0
         )
       )
     RETURNING id, delivery_status, status_at`,
    [normalizedStatus, statusAt, JSON.stringify(status.raw), status.messageId, incomingRank],
  )
  const updated = (rows as any[]).length > 0
  if (!updated && status.recipient) {
    const existing = await sql.query(
      'SELECT id, delivery_status FROM whatsapp_messages WHERE whatsapp_message_id = $1 LIMIT 1',
      [status.messageId],
    ) as any[]
    if (existing.length === 0) {
      try {
        const conversation = await ensureWhatsAppConversation(status.recipient)
        await storeWhatsAppOutboundMessage({
          conversationId: conversation.conversationId,
          messageId: status.messageId,
          messageType: 'unknown',
          deliveryStatus: normalizedStatus,
          rawPayload: status.raw,
        })
        return true
      } catch (error) {
        console.error('Unable to create missing WhatsApp outbound status record', error)
      }
    }
  }
  if (!updated) {
    console.warn('WhatsApp status ignored because it is older or lower priority than the stored status', {
      messageId: status.messageId,
      status: normalizedStatus,
      recipient: status.recipient,
      timestamp: status.timestamp,
    })
  }
  return updated
}
