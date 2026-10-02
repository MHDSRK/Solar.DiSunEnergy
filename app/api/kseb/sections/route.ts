import { NextResponse } from 'next/server'
import { getKsebSections } from '@/services/kseb/recapClient'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

export async function GET(request: Request) {
  const districtId = new URL(request.url).searchParams.get('districtId')
  if (!districtId) return NextResponse.json({ sections: [], message: 'District is required.' }, { status: 400 })
  try {
    const rate = await checkRateLimit(request, 'kseb-sections', 60, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)
    return NextResponse.json({ sections: await getKsebSections(districtId) })
  } catch {
    return NextResponse.json({ sections: [], message: 'KSEB section data is temporarily unavailable.' }, { status: 503 })
  }
}
