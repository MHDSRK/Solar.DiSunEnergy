import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { verifyLeadToken } from '@/lib/leadAuth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_DOCUMENTS = new Set(['aadhaar', 'pan', 'bill', 'passbook'])

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'lead-document', 20, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    const form = await request.formData()
    const leadId = String(form.get('leadId') ?? '').trim()
    const leadToken = String(form.get('leadToken') ?? '').trim()
    const documentType = String(form.get('documentType') ?? '').trim()
    const file = form.get('file')

    if (!leadId || !leadToken || !verifyLeadToken(leadId, leadToken)) {
      return NextResponse.json({ success: false, message: 'Invalid or expired lead authorization.' }, { status: 401 })
    }
    if (!ALLOWED_DOCUMENTS.has(documentType)) {
      return NextResponse.json({ success: false, message: 'Invalid document type.' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'A document file is required.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, message: 'Only PDF, JPG, PNG or WEBP files are allowed.' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: 'Each document must be between 1 byte and 4 MB.' }, { status: 400 })
    }

    await ensureLeadTable()
    const exists = await getSql()`SELECT lead_id FROM leads WHERE lead_id = ${leadId} LIMIT 1`
    if (!exists.length) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    await getSql()`
      INSERT INTO lead_documents (lead_id, document_type, file_name, mime_type, size_bytes, file_data, uploaded_at)
      VALUES (${leadId}, ${documentType}, ${file.name.slice(0, 180)}, ${file.type}, ${file.size}, decode(${base64}, 'base64'), NOW())
      ON CONFLICT (lead_id, document_type)
      DO UPDATE SET
        file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        file_data = EXCLUDED.file_data,
        uploaded_at = NOW()
    `
    return NextResponse.json({ success: true, documentType, fileName: file.name })
  } catch (error) {
    console.error('Eligibility document upload failed', error)
    return NextResponse.json({ success: false, message: 'Unable to save the document.' }, { status: 500 })
  }
}
