import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { ensureAdminTables, getSql } from '@/lib/adminData'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); await ensureAdminTables(); const { id } = await params; const rows = await getSql()`SELECT id, field, old_value, new_value, changed_by_name, changed_by_email, changed_at FROM lead_audit_log WHERE lead_id = ${id} ORDER BY changed_at DESC, id DESC`; return NextResponse.json({ history: rows }) }
  catch (error) { const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'; return NextResponse.json({ message: unauthorized ? 'Unauthorized' : 'Unable to load history.' }, { status: unauthorized ? 401 : 500 }) }
}
