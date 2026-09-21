import { NextResponse } from 'next/server'
import { fetchKsebRecap } from '@/services/kseb/recapClient'

export async function GET(request: Request) {
  const sectionId = new URL(request.url).searchParams.get('sectionId')
  if (!sectionId) return NextResponse.json({ transformers: [], message: 'Section is required.' }, { status: 400 })
  try {
    const recap = await fetchKsebRecap({ sectionId })
    return NextResponse.json({
      transformers: recap.records.map((record) => ({ ...record })),
      ksebDataTimestamp: recap.checkedAt,
      retrievedAt: recap.retrievedAt,
    })
  } catch {
    return NextResponse.json({ transformers: [], message: 'KSEB transformer data is temporarily unavailable.' }, { status: 503 })
  }
}
