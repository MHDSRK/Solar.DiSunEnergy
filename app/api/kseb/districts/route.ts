import { NextResponse } from 'next/server'
import { getKsebDistricts } from '@/services/kseb/recapClient'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

export async function GET(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'kseb-districts', 30, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)
    return NextResponse.json({ districts: await getKsebDistricts() })
  } catch {
    return NextResponse.json({ districts: [], message: 'KSEB district data is temporarily unavailable.' }, { status: 503 })
  }
}
