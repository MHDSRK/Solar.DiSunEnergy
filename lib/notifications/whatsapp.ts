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
    version: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v26.0',
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

async function uploadTemplateImage(
  current: ReturnType<typeof config>,
  imageUrl: string,
) {
  if (!current) throw new Error('WhatsApp is not configured.')

  let imageResponse: Response
  try {
    imageResponse = await fetch(imageUrl, { cache: 'no-store' })
  } catch (error) {
    throw new Error('Unable to fetch WHATSAPP_TEMPLATE_IMAGE_URL before sending the template: ' + (error instanceof Error ? error.message : String(error)))
  }
  if (!imageResponse.ok) {
    throw new Error('WHATSAPP_TEMPLATE_IMAGE_URL returned HTTP ' + imageResponse.status + '. Use a stable public HTTPS image URL.')
  }

  const contentType = imageResponse.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png'
  if (!contentType.startsWith('image/')) {
    throw new Error('WHATSAPP_TEMPLATE_IMAGE_URL did not return an image (Content-Type: ' + contentType + ').')
  }

  const bytes = await imageResponse.arrayBuffer()
  if (!bytes.byteLength) throw new Error('WHATSAPP_TEMPLATE_IMAGE_URL returned an empty image.')

  const form = new FormData()
  form.append('messaging_product', 'whatsapp')
  form.append('file', new Blob([bytes], { type: contentType }), 'disun-template-header.' + (contentType.split('/')[1] || 'png'))

  const response = await fetch(
    'https://graph.facebook.com/' + current.version + '/' + current.phoneNumberId + '/media',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + current.accessToken },
      body: form,
      cache: 'no-store',
    },
  )
  const details = await response.text()
  if (!response.ok) {
    let apiCode: string | undefined
    try {
      const parsed = JSON.parse(details) as { error?: { code?: number | string } }
      if (parsed.error?.code !== undefined) apiCode = String(parsed.error.code)
    } catch {}
    const error = new Error('WhatsApp template image upload failed (' + response.status + '): ' + details.slice(0, 1000)) as Error & { whatsappCode?: string }
    error.whatsappCode = apiCode
    throw error
  }

  const data = JSON.parse(details) as { id?: string }
  if (!data.id) throw new Error('WhatsApp template image upload succeeded but returned no media ID.')
  return data.id
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

  if (!imageUrl) {
    throw new Error('WHATSAPP_TEMPLATE_IMAGE_URL is required for the approved image-header template.')
  }

  const imageMediaId = await uploadTemplateImage(current, imageUrl)
  const components = [{
    type: 'header',
    parameters: [{ type: 'image', image: { id: imageMediaId } }],
  }]
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
    let apiCode: string | undefined
    try {
      const parsed = JSON.parse(details) as { error?: { code?: number | string } }
      if (parsed.error?.code !== undefined) apiCode = String(parsed.error.code)
    } catch {}
    const error = new Error(`WhatsApp template notification failed (${response.status}): ${details.slice(0, 1000)}`) as Error & { whatsappCode?: string }
    error.whatsappCode = apiCode
    throw error
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

export async function sendWhatsAppLeadNotification(lead: Record<string, unknown>): Promise<WhatsAppResult> {
  const current = config()
  if (!current) return { configured: false, sent: false }

  const notificationPhone = normalizeWhatsAppPhone(process.env.WHATSAPP_LEAD_NOTIFICATION_PHONE?.trim() || '')
  if (!notificationPhone || notificationPhone.length < 11) {
    throw new Error('WHATSAPP_LEAD_NOTIFICATION_PHONE is required for automatic lead notifications.')
  }

  const templateName = process.env.WHATSAPP_LEAD_NOTIFICATION_TEMPLATE_NAME?.trim() || 'disun_lead_notification'
  const templateLanguage = process.env.WHATSAPP_LEAD_NOTIFICATION_TEMPLATE_LANGUAGE?.trim() || 'en_US'

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: notificationPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: format(lead.lead_id) },
          { type: 'text', text: format(lead.name) },
          { type: 'text', text: format(lead.phone) },
          { type: 'text', text: format(lead.district) },
          { type: 'text', text: format(lead.area) },
          { type: 'text', text: format(lead.bill) },
          { type: 'text', text: format(lead.monthly_kwh) },
          { type: 'text', text: format(lead.connection_category) },
          { type: 'text', text: format(lead.recommended_kw) },
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
    let apiCode: string | undefined
    try {
      const parsed = JSON.parse(details) as { error?: { code?: number | string } }
      if (parsed.error?.code !== undefined) apiCode = String(parsed.error.code)
    } catch {}
    const error = new Error(`WhatsApp lead notification failed (${response.status}): ${details.slice(0, 1000)}`) as Error & { whatsappCode?: string }
    error.whatsappCode = apiCode
    throw error
  }

  let data: { messages?: Array<{ id?: string }> } = {}
  try {
    data = JSON.parse(details) as typeof data
  } catch {}

  const messageId = data.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp lead notification was accepted but returned no message ID.')

  const conversation = await ensureWhatsAppConversation(notificationPhone, String(lead.lead_id || ''))
  await storeWhatsAppOutboundMessage({
    conversationId: conversation.conversationId,
    messageId,
    messageType: 'template',
    body: null,
    deliveryStatus: 'accepted',
    rawPayload: { request: payload, response: data },
  })

  return { configured: true, sent: true, messageId, recipient: notificationPhone }
}

export async function sendWhatsAppTextMessage(
  lead: Record<string, unknown>,
  body: string,
): Promise<WhatsAppResult> {
  const current = config()
  if (!current) return { configured: false, sent: false }
  const recipient = normalizeWhatsAppPhone(String(lead.phone || ''))
  const messageBody = body.trim()
  if (!recipient || recipient.length < 11) throw new Error('Lead does not have a valid WhatsApp phone number.')
  if (!messageBody) throw new Error('Message text is required.')

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: { preview_url: true, body: messageBody },
  }

  const response = await fetch(
    'https://graph.facebook.com/' + current.version + '/' + current.phoneNumberId + '/messages',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + current.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    },
  )

  const details = await response.text()
  if (!response.ok) {
    let apiCode: string | undefined
    try {
      const parsed = JSON.parse(details) as { error?: { code?: number | string } }
      if (parsed.error?.code !== undefined) apiCode = String(parsed.error.code)
    } catch {}
    const error = new Error('WhatsApp text message failed (' + response.status + '): ' + details.slice(0, 1000)) as Error & { whatsappCode?: string }
    error.whatsappCode = apiCode
    throw error
  }

  let data: { messages?: Array<{ id?: string }> } = {}
  try { data = JSON.parse(details) as typeof data } catch {}
  const messageId = data.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp text message was accepted but returned no message ID.')

  const conversation = await ensureWhatsAppConversation(recipient, String(lead.lead_id || ''))
  await storeWhatsAppOutboundMessage({
    conversationId: conversation.conversationId,
    messageId,
    messageType: 'text',
    body: messageBody,
    deliveryStatus: 'accepted',
    rawPayload: { request: payload, response: data },
  })

  return { configured: true, sent: true, messageId, recipient }
}

export async function sendWhatsAppPdf(
  lead: Record<string, unknown>,
  file: Blob & { name?: string },
  caption?: string,
): Promise<WhatsAppResult> {
  const current = config()
  if (!current) return { configured: false, sent: false }
  const recipient = normalizeWhatsAppPhone(String(lead.phone || ''))
  if (!recipient || recipient.length < 11) throw new Error('Lead does not have a valid WhatsApp phone number.')
  if (file.type !== 'application/pdf') throw new Error('Only PDF files can be sent through this action.')
  const filename = String(file.name || 'DiSun-Solar-Proposal.pdf').trim() || 'DiSun-Solar-Proposal.pdf'

  const mediaForm = new FormData()
  mediaForm.append('messaging_product', 'whatsapp')
  mediaForm.append('file', file, filename)

  const uploadResponse = await fetch(
    'https://graph.facebook.com/' + current.version + '/' + current.phoneNumberId + '/media',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + current.accessToken },
      body: mediaForm,
      cache: 'no-store',
    },
  )
  const uploadDetails = await uploadResponse.text()
  if (!uploadResponse.ok) {
    throw new Error('WhatsApp PDF upload failed (' + uploadResponse.status + '): ' + uploadDetails.slice(0, 1000))
  }

  let uploadData: { id?: string } = {}
  try { uploadData = JSON.parse(uploadDetails) as typeof uploadData } catch {}
  if (!uploadData.id) throw new Error('WhatsApp PDF upload succeeded but returned no media ID.')

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'document',
    document: {
      id: uploadData.id,
      caption: caption?.trim() || undefined,
      filename,
    },
  }

  const response = await fetch(
    'https://graph.facebook.com/' + current.version + '/' + current.phoneNumberId + '/messages',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + current.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    },
  )
  const details = await response.text()
  if (!response.ok) {
    let apiCode: string | undefined
    try {
      const parsed = JSON.parse(details) as { error?: { code?: number | string } }
      if (parsed.error?.code !== undefined) apiCode = String(parsed.error.code)
    } catch {}
    const error = new Error('WhatsApp PDF message failed (' + response.status + '): ' + details.slice(0, 1000)) as Error & { whatsappCode?: string }
    error.whatsappCode = apiCode
    throw error
  }

  let data: { messages?: Array<{ id?: string }> } = {}
  try { data = JSON.parse(details) as typeof data } catch {}
  const messageId = data.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp PDF message was accepted but returned no message ID.')

  const conversation = await ensureWhatsAppConversation(recipient, String(lead.lead_id || ''))
  await storeWhatsAppOutboundMessage({
    conversationId: conversation.conversationId,
    messageId,
    messageType: 'document',
    body: caption?.trim() || filename,
    rawPayload: { request: payload, response: data, mediaId: uploadData.id, filename },
    deliveryStatus: 'accepted',
  })

  return { configured: true, sent: true, messageId, recipient }
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
    let apiCode: string | undefined
    try {
      const parsed = JSON.parse(details) as { error?: { code?: number | string } }
      if (parsed.error?.code !== undefined) apiCode = String(parsed.error.code)
    } catch {}
    const error = new Error(`WhatsApp follow-up reminder failed (${response.status}): ${details.slice(0, 1000)}`) as Error & { whatsappCode?: string }
    error.whatsappCode = apiCode
    throw error
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
