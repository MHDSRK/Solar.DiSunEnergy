import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
export async function GET() {
  try { const identity = await requireAdmin(); return NextResponse.json({ authenticated: true, ...identity }) }
  catch { return NextResponse.json({ authenticated: false }, { status: 401 }) }
}
