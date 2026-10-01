import { NextResponse } from 'next/server'
import { getSql, ensureLeadTable } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import {
  sendWhatsAppLeadTemplate,
  sendWhatsAppPdf,
  sendWhatsAppTextMessage,
} from '@/lib/notifications/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getLead(leadId: string) {
  await ensureLeadTable()
  const rows = await getSql().query(
    'SELECT * FROM leads WHERE lead_id = $1 LIMIT 1',
    [leadId],
  ) as Record<string, any>[]
  return rows[0] || null
}

function errorResponse(error: unknown) {
  const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
  const whatsappCode = error && typeof error === 'object' && 'whatsappCode' in error
    ? String((error as { whatsappCode?: unknown }).whatsappCode || '')
    : ''
  const message = error instanceof Error ? error.message : 'Unable to send WhatsApp message.'

  if (unauthorized) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  if (whatsappCode === '131047') {
    return NextResponse.json({
      success: false,
      requiresTemplate: true,
      message: 'WhatsApp requires an approved template for this customer conversation.',
    }, { status: 409 })
  }

  return NextResponse.json({ success: false, message }, { status: 500 })
}

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const contentType = request.headers.get('content-type') || ''
    let leadId = ''
    let mode = 'template'
    let bodyText = ''
    let caption = ''
    let file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      leadId = String(form.get('leadId') || '').trim()
      mode = String(form.get('mode') || 'document').trim()
      bodyText = String(form.get('message') || '')
      caption = String(form.get('caption') || '')
      const candidate = form.get('file')
      if (candidate instanceof File) file = candidate
    } else {
      const body = await request.json()
      leadId = String(body?.leadId || '').trim()
      mode = String(body?.mode || 'template').trim()
      bodyText = String(body?.message || '')
      caption = String(body?.caption || '')
    }

    if (!leadId) {
      return NextResponse.json({ success: false, message: 'Lead ID is required.' }, { status: 400 })
    }

    const lead = await getLead(leadId)
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })
    }

    if (!String(lead.phone || '').replace(/\D/g, '')) {
      return NextResponse.json({ success: false, message: 'This lead does not have a phone number.' }, { status: 400 })
    }

    if (mode === 'text') {
      const result = await sendWhatsAppTextMessage(lead, bodyText)
      if (!result.sent) {
        return NextResponse.json({ success: false, configured: result.configured, message: 'WhatsApp integration is not configured.' }, { status: 503 })
      }
      return NextResponse.json({ success: true, mode, messageId: result.messageId, recipient: result.recipient })
    }

    if (mode === 'document') {
      if (!file) return NextResponse.json({ success: false, message: 'Please select a PDF file.' }, { status: 400 })
      if (file.type !== 'application/pdf') return NextResponse.json({ success: false, message: 'Only PDF files can be sent.' }, { status: 400 })
      if (file.size > 4 * 1024 * 1024) return NextResponse.json({ success: false, message: 'PDF is too large. Please use a PDF under 4 MB.' }, { status: 413 })
      const result = await sendWhatsAppPdf(lead, file, caption)
      if (!result.sent) {
        return NextResponse.json({ success: false, configured: result.configured, message: 'WhatsApp integration is not configured.' }, { status: 503 })
      }
      return NextResponse.json({ success: true, mode, messageId: result.messageId, recipient: result.recipient })
    }

    if (mode === 'template') {
      const result = await sendWhatsAppLeadTemplate(lead)
      if (!result.sent) {
        return NextResponse.json({ success: false, configured: result.configured, message: 'WhatsApp integration is not configured.' }, { status: 503 })
      }
      return NextResponse.json({ success: true, mode, messageId: result.messageId, recipient: result.recipient })
    }

    return NextResponse.json({ success: false, message: 'Unsupported WhatsApp send mode.' }, { status: 400 })
  } catch (error) {
    return errorResponse(error)
  }
}
