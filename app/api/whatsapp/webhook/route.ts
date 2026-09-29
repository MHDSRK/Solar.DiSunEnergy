import { NextResponse } from 'next/server'
import {
  linkWhatsAppContactToLead,
  parseWhatsAppInbound,
  parseWhatsAppStatuses,
  storeWhatsAppMessage,
  updateWhatsAppStatus,
  verifyWhatsAppSignature,
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
    const messages = parseWhatsAppInbound(body)
    const statuses = parseWhatsAppStatuses(body)

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
