import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

const allowed = new Set(['aadhaar', 'pan', 'bill', 'passbook'])

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const url = new URL(request.url)
    const leadId = url.searchParams.get('leadId')?.trim() || ''
    const documentType = url.searchParams.get('documentType')?.trim() || ''
    if (!leadId || !allowed.has(documentType)) {
      return NextResponse.json({ success: false, message: 'Invalid document request.' }, { status: 400 })
    }

    await ensureLeadTable()
    const rows = await getSql()`
      SELECT file_name, mime_type, encode(file_data, 'base64') AS file_base64
      FROM lead_documents
      WHERE lead_id = ${leadId} AND document_type = ${documentType}
      LIMIT 1
    `
    if (!rows.length) return NextResponse.json({ success: false, message: 'Document not found.' }, { status: 404 })

    const row = rows[0] as { file_name: string; mime_type: string; file_base64: string }
    const bytes = Uint8Array.from(Buffer.from(row.file_base64, 'base64'))
    return new Response(bytes, {
      headers: {
        'Content-Type': row.mime_type,
        'Content-Disposition': `inline; filename="${row.file_name.replace(/["\\\\]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Admin document download failed', error)
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to load document.' }, { status: unauthorized ? 401 : 500 })
  }
}
