import { NextResponse } from 'next/server'
import { getKsebDistricts } from '@/services/kseb/recapClient'

export async function GET() {
  try { return NextResponse.json({ districts: await getKsebDistricts() }) }
  catch { return NextResponse.json({ districts: [], message: 'KSEB district data is temporarily unavailable.' }, { status: 503 }) }
}
