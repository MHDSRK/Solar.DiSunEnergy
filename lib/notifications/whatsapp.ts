import {
  ensureWhatsAppConversation,
  normalizeWhatsAppPhone,
  storeWhatsAppOutboundMessage,
} from '@/lib/whatsapp'

type WhatsAppResult = {
  configured: boolean
  sent: boolean
  messageId?: string
  recipient?: string
}

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || 'disun_welcome_message'
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en'
  const imageUrl = process.env.WHATSAPP_TEMPLATE_IMAGE_URL?.trim()

  if (!accessToken || !phoneNumberId) return null

  return {
    accessToken,
    phoneNumberId,
    version: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v22.0',
    templateName,
    templateLanguage,
    imageUrl,
  }
}

function format(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

function formatFollowupDateTime(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function buildTemplateComponents(imageUrl: string | undefined) {
  if (!imageUrl) {
    throw new Error('WHATSAPP_TEMPLATE_IMAGE_URL is required for the approved image-header template.')
  }

  return [{
    type: 'header',
    parameters: [{ type: 'image', image: { link: imageUrl } }],
  }]
}

async function sendTemplate(
  lead: Record<string, unknown>,
  options?: { templateName?: string; templateLanguage?: string; imageUrl?: string },
): Promise<WhatsAppResult> {
  const current = config()
  if (!current) return { configured: false, sent: false }

  const recipient = normalizeWhatsAppPhone(String(lead.phone || ''))
  if (!recipient || recipient.length < 11) {
    throw new Error('Lead does not have a valid WhatsApp phone number.')
  }

  const templateName = options?.templateName || current.templateName
  const templateLanguage = options?.templateLanguage || current.templateLanguage
  const imageUrl = options?.imageUrl || current.imageUrl

  const components = buildTemplateComponents(imageUrl)
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components,
    },
  }

  const response = await fetch(
    `https://graph.facebook.com/${current.version}/${current.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${current.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    },
  )

  const details = await response.text()
  if (!response.ok) {
    throw new Error(`WhatsApp template notification failed (${response.status}): ${details.slice(0, 1000)}`)
  }

  let data: { messages?: Array<{ id?: string }> } = {}
  try {
    data = JSON.parse(details) as typeof data
  } catch {}

  const messageId = data.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp API accepted the request but returned no message ID.')

  const conversation = await ensureWhatsAppConversation(recipient, String(lead.lead_id || ''))
  await storeWhatsAppOutboundMessage({
    conversationId: conversation.conversationId,
    messageId,
    messageType: 'template',
    body: null,
    deliveryStatus: 'accepted',
    rawPayload: { request: payload, response: data },
  })

  return { configured: true, sent: true, messageId, recipient }
}

export async function sendWhatsAppLeadTemplate(lead: Record<string, unknown>): Promise<WhatsAppResult> {
  return sendTemplate(lead)
}

export async function sendWhatsAppFollowupReminder(followup: Record<string, unknown>): Promise<WhatsAppResult> {
  const current = config()
  if (!current) return { configured: false, sent: false }

  const recipient = normalizeWhatsAppPhone(String(followup.phone || ''))
  if (!recipient || recipient.length < 11) {
    throw new Error('Follow-up does not have a valid WhatsApp phone number.')
  }

  const templateName = process.env.WHATSAPP_FOLLOWUP_TEMPLATE_NAME?.trim() || 'disun_followup_reminder'
  const templateLanguage = process.env.WHATSAPP_FOLLOWUP_TEMPLATE_LANGUAGE?.trim() || 'en_US'
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: format(followup.name) },
          { type: 'text', text: formatFollowupDateTime(followup.follow_up_at) },
          { type: 'text', text: format(followup.note) },
        ],
      }],
    },
  }

  const response = await fetch(
    `https://graph.facebook.com/${current.version}/${current.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${current.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    },
  )

  const details = await response.text()
  if (!response.ok) {
    throw new Error(`WhatsApp follow-up reminder failed (${response.status}): ${details.slice(0, 1000)}`)
  }

  let data: { messages?: Array<{ id?: string }> } = {}
  try {
    data = JSON.parse(details) as typeof data
  } catch {}

  const messageId = data.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp follow-up accepted the request but returned no message ID.')

  const conversation = await ensureWhatsAppConversation(recipient, String(followup.lead_id || ''))
  await storeWhatsAppOutboundMessage({
    conversationId: conversation.conversationId,
    messageId,
    messageType: 'template',
    body: null,
    deliveryStatus: 'accepted',
    rawPayload: { request: payload, response: data },
  })

  return { configured: true, sent: true, messageId, recipient }
}
