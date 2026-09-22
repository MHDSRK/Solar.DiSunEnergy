import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const leads = await getSql()`SELECT * FROM leads ORDER BY created_at DESC`
    const stats = {
      total: leads.length,
      contact: leads.filter((x: any) => x.name || x.phone).length,
      calculated: leads.filter((x: any) => x.recommended_kw !== null).length,
      feasibility: leads.filter((x: any) => x.feasibility_status !== null).length,
    }
    return NextResponse.json({ success: true, leads, stats })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to load leads.' }, { status: unauthorized ? 401 : 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const body = await request.json().catch(() => ({}))
    if (body.all === true) {
      if (body.confirmation !== 'DELETE ALL') return NextResponse.json({ success: false, message: 'Type DELETE ALL to confirm.' }, { status: 400 })
      await getSql()`DELETE FROM leads`
      return NextResponse.json({ success: true })
    }
    const ids = Array.isArray(body.leadIds) ? body.leadIds.map(String).filter(Boolean) : []
    if (!ids.length) return NextResponse.json({ success: false, message: 'No leads selected.' }, { status: 400 })
    for (const id of ids) await getSql()`DELETE FROM leads WHERE lead_id = ${id}`
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to delete leads.' }, { status: unauthorized ? 401 : 500 })
  }
}
