import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  try { await requireAdmin(); return NextResponse.json({ authenticated: true }) }
  catch { return NextResponse.json({ authenticated: false }, { status: 401 }) }
}
