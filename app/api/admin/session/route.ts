import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  try { const admin = await requireAdmin(); return NextResponse.json({ authenticated: true, name: admin.name, email: admin.email }) }
  catch { return NextResponse.json({ authenticated: false }, { status: 401 }) }
}
