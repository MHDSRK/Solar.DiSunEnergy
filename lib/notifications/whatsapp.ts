type WhatsAppResult = { configured: boolean; sent: boolean }

const recipient = () => process.env.WHATSAPP_RECIPIENT?.trim() || '919567398698'

function config() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  if (!accessToken || !phoneNumberId) return null
  return {
    accessToken,
    phoneNumberId,
    version: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v22.0',
  }
}

export async function sendWhatsAppText(message: string): Promise<WhatsAppResult> {
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
      type: 'text',
      text: { preview_url: false, body: message.slice(0, 4000) },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`WhatsApp notification failed (${response.status}): ${details.slice(0, 800)}`)
  }

  return { configured: true, sent: true }
}
