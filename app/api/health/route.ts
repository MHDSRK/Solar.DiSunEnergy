import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { getMissingProductionConfig } from '@/lib/productionConfig'

export async function GET() {
  const configMissing = getMissingProductionConfig()
  let database = 'ok'
  try {
    await getSql()`SELECT 1`
  } catch {
    database = 'error'
  }

  const ok = database === 'ok'
  return NextResponse.json(
    {
      ok,
      database,
      configuration: {
        missing: configMissing,
        googleSheets: !configMissing.includes('GOOGLE_SHEET_ID') && !configMissing.includes('GOOGLE_SERVICE_ACCOUNT_JSON'),
        whatsapp: !configMissing.includes('WHATSAPP_ACCESS_TOKEN') && !configMissing.includes('WHATSAPP_PHONE_NUMBER_ID') && !configMissing.includes('WHATSAPP_RECIPIENT'),
      },
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
