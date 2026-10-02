import { NextResponse } from 'next/server'
import {
  linkWhatsAppContactToLead,
  parseWhatsAppInbound,
  parseWhatsAppStatuses,
  storeWhatsAppMessage,
  updateWhatsAppStatus,
  verifyWhatsAppSignature,
  storeWhatsAppWebhookEvent,
} from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  return NextResponse.json({ success: false, message: 'Webhook verification failed.' }, { status: 403 })
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json({ success: false, message: 'Invalid webhook signature.' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON.' }, { status: 400 })
  }

  try {
    if (body?.object !== 'whatsapp_business_account') {
      return NextResponse.json({ success: false, message: 'Unsupported webhook object.' }, { status: 400 })
    }

    const expectedPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    if (expectedPhoneNumberId) {
      for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
        for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
          const receivedPhoneNumberId = String(change?.value?.metadata?.phone_number_id || '')
          if (receivedPhoneNumberId && receivedPhoneNumberId !== expectedPhoneNumberId) {
            return NextResponse.json({ success: false, message: 'Webhook phone number mismatch.' }, { status: 400 })
          }
        }
      }
    }

    const messages = parseWhatsAppInbound(body)
    const statuses = parseWhatsAppStatuses(body)
    const changes = Array.isArray(body?.entry)
      ? body.entry.flatMap((entry: any) => Array.isArray(entry?.changes) ? entry.changes : [])
      : []

    for (const change of changes) {
      const value = change?.value
      const phoneNumberId = String(value?.metadata?.phone_number_id || '')
      for (const message of Array.isArray(value?.messages) ? value.messages : []) {
        await storeWhatsAppWebhookEvent({
          eventType: 'message',
          messageId: message?.id ? String(message.id) : null,
          phoneNumberId,
          payload: message,
        })
      }
      for (const status of Array.isArray(value?.statuses) ? value.statuses : []) {
        await storeWhatsAppWebhookEvent({
          eventType: 'status:' + String(status?.status || 'unknown'),
          messageId: status?.id ? String(status.id) : null,
          phoneNumberId,
          payload: status,
        })
      }
    }

    for (const message of messages) {
      const result = await storeWhatsAppMessage(message)
      if (result.stored) await linkWhatsAppContactToLead(message.from)
    }

    for (const status of statuses) {
      await updateWhatsAppStatus(status)
    }

    return NextResponse.json({ success: true, messages: messages.length, statuses: statuses.length })
  } catch (error) {
    console.error('WhatsApp webhook processing failed', error)
    return NextResponse.json({ success: false, message: 'Webhook processing failed.' }, { status: 500 })
  }
}
