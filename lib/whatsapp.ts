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

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
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
    from: normalizePhone(String(message?.from || '')),
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

export async function storeWhatsAppMessage(message: WhatsAppInboundMessage) {
  if (!message.messageId || !message.from) return { stored: false, duplicate: false }

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
    'INSERT INTO whatsapp_messages (conversation_id, whatsapp_message_id, direction, message_type, body, media_id, caption, sent_at, raw_payload) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(TO_TIMESTAMP($8::double precision), NOW()), $9::jsonb) ON CONFLICT (whatsapp_message_id) DO NOTHING RETURNING id',
    [conversationId, message.messageId, 'INBOUND', message.type, message.text, message.mediaId, message.caption, message.timestamp || '0', JSON.stringify(message.raw)],
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
  const normalized = normalizePhone(phone)
  if (!normalized) return
  const sql = await getDb()
  await sql.query(
    "UPDATE whatsapp_contacts SET lead_id = (SELECT lead_id FROM leads WHERE regexp_replace(COALESCE(phone, ''), '\\\\D', '', 'g') = $1 ORDER BY updated_at DESC LIMIT 1), updated_at = NOW() WHERE phone = $1",
    [normalized],
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
      for (const status of Array.isArray(change?.value?.statuses) ? change.statuses : []) {
        if (!status?.id) continue
        statuses.push({
          messageId: String(status.id),
          status: String(status.status || 'unknown'),
          timestamp: status.timestamp ? String(status.timestamp) : null,
          recipient: status.recipient_id ? normalizePhone(String(status.recipient_id)) : null,
          raw: status,
        })
      }
    }
  }
  return statuses
}

export async function updateWhatsAppStatus(status: { messageId: string; status: string; timestamp: string | null; recipient: string | null; raw: unknown }) {
  const sql = await getDb()
  await sql.query(
    'UPDATE whatsapp_messages SET delivery_status = $1, delivered_at = CASE WHEN $1 = \\'delivered\\' THEN COALESCE(delivered_at, COALESCE(TO_TIMESTAMP($2::double precision), NOW())) ELSE delivered_at END, read_at = CASE WHEN $1 = \\'read\\' THEN COALESCE(read_at, COALESCE(TO_TIMESTAMP($2::double precision), NOW())) ELSE read_at END, failed_at = CASE WHEN $1 = \\'failed\\' THEN COALESCE(failed_at, COALESCE(TO_TIMESTAMP($2::double precision), NOW())) ELSE failed_at END, error_payload = CASE WHEN $1 = \\'failed\\' THEN $3::jsonb ELSE error_payload END, updated_at = NOW() WHERE whatsapp_message_id = $4',
    [status.status, status.timestamp || '0', JSON.stringify(status.raw), status.messageId],
  )
}
