type WhatsAppResult = { configured: boolean; sent: boolean; messageId?: string }

const recipient = () => process.env.WHATSAPP_RECIPIENT?.trim() || '919567398698'

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  if (!accessToken || !phoneNumberId) return null
  return {
    accessToken,
    phoneNumberId,
    version: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v22.0',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || 'disun_new_lead',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_US',
  }
}

function format(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

function templateParameters(lead: Record<string, unknown>) {
  return [
    format(lead.lead_id),
    format(lead.name),
    format(lead.phone),
    format(lead.district),
    format(lead.area),
    format(lead.bill),
    format(lead.connection_category || 'Solar'),
    format(lead.recommended_kw),
  ]
}

export async function sendWhatsAppLeadTemplate(lead: Record<string, unknown>): Promise<WhatsAppResult> {
  const current = config()
  if (!current) return { configured: false, sent: false }

  const response = await fetch(`https://graph.facebook.com/${current.version}/${current.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${current.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient(),
      type: 'template',
      template: {
        name: current.templateName,
        language: { code: current.templateLanguage },
        components: [{
          type: 'body',
          parameters: templateParameters(lead).map((text) => ({ type: 'text', text })),
        }],
      },
    }),
    cache: 'no-store',
  })

  const details = await response.text()
  if (!response.ok) {
    throw new Error(`WhatsApp template notification failed (${response.status}): ${details.slice(0, 1000)}`)
  }

  let data: { messages?: Array<{ id?: string }> } = {}
  try { data = JSON.parse(details) as typeof data } catch {}
  return { configured: true, sent: true, messageId: data.messages?.[0]?.id }
}
