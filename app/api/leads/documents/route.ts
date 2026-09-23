import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { verifyLeadToken } from '@/lib/leadAuth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { notifyLeadEvent } from '@/lib/notifications/leadNotifications'

const MAX_FILE_SIZE = 3 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_DOCUMENTS = new Set(['aadhaar', 'pan', 'bill', 'passbook'])

async function hasValidFileSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const starts = (values: number[]) => values.every((value, index) => bytes[index] === value)
  if (file.type === 'application/pdf') return starts([0x25, 0x50, 0x44, 0x46])
  if (file.type === 'image/jpeg') return starts([0xff, 0xd8, 0xff])
  if (file.type === 'image/png') return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (file.type === 'image/webp') return starts([0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  return false
}

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
      return NextResponse.json({ success: false, message: 'Each document must be between 1 byte and 3 MB.' }, { status: 400 })
    }
    if (!(await hasValidFileSignature(file))) {
      return NextResponse.json({ success: false, message: 'The uploaded file does not match its declared file type.' }, { status: 400 })
    }

    await ensureLeadTable()
    const exists = await getSql()`SELECT lead_id FROM leads WHERE lead_id = ${leadId} LIMIT 1`
    const existingRows = exists as unknown as Record<string, any>[]
    if (!existingRows.length) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const fileData = new Uint8Array(await file.arrayBuffer())
    await getSql()`
      INSERT INTO lead_documents (lead_id, document_type, file_name, mime_type, size_bytes, file_data, uploaded_at)
      VALUES (${leadId}, ${documentType}, ${file.name.slice(0, 180)}, ${file.type}, ${file.size}, ${fileData}, NOW())
      ON CONFLICT (lead_id, document_type)
      DO UPDATE SET
        file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        file_data = EXCLUDED.file_data,
        uploaded_at = NOW()
    `

    const countRows = await getSql()`SELECT COUNT(*)::int AS count FROM lead_documents WHERE lead_id = ${leadId}`
    const documentCount = Number((countRows as unknown as Record<string, unknown>[])[0]?.count ?? 0)
    if (documentCount >= ALLOWED_DOCUMENTS.size) {
      await getSql()`UPDATE leads SET documents_completed_at = COALESCE(documents_completed_at, NOW()), lead_status = CASE WHEN lead_status NOT IN ('CONVERTED','CANCELLED','SITE_VISIT_BOOKED') THEN 'DOCUMENTS_RECEIVED' ELSE lead_status END, updated_at = NOW() WHERE lead_id = ${leadId}`
      const leadRows = await getSql()`SELECT * FROM leads WHERE lead_id = ${leadId} LIMIT 1`
      const lead = (leadRows as unknown as Record<string, unknown>[])[0]
      if (lead) void notifyLeadEvent('documents', lead).catch((error) => console.error('Document notifications failed', error))
    }

    return NextResponse.json({ success: true, documentType, fileName: file.name })
  } catch (error) {
    console.error('Eligibility document upload failed', error)
    return NextResponse.json({ success: false, message: 'Unable to save the document.' }, { status: 500 })
  }
}
