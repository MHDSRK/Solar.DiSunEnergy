import { NextResponse } from 'next/server'
import { getKsebHealth } from '@/services/kseb/recapClient'
import { sectionRegistryCount } from '@/services/kseb/sectionRegistry'

export async function GET() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not available' }, { status: 404 })
  return NextResponse.json({ ...getKsebHealth(), sectionRegistryLoaded: sectionRegistryCount > 0, sectionRegistryCount })
}
