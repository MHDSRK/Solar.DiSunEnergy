import { NextResponse } from 'next/server'
import { decodeKsebConsumerNumber } from '@/services/kseb/consumerDecoder'
import { calculateFeasibility, getBalanceStatus } from '@/services/kseb/feasibilityEngine'
import { matchTransformers } from '@/services/kseb/transformerMatcher'
import { getRecapProvider } from '@/services/kseb/providers/ksebRecapProvider'
import { findSectionByName } from '@/services/kseb/sectionRegistry'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { consumerNumber?: string; sectionOffice?: string; area?: string; requestedKw?: number; transformerName?: string }
    const decoded = decodeKsebConsumerNumber(body.consumerNumber ?? '')
    if (!decoded.valid) return NextResponse.json({ success: false, state: decoded.reason, message: decoded.reason === 'INVALID_CONSUMER_NUMBER' ? 'Please enter a valid 13-digit KSEB Consumer Number.' : 'We could not automatically identify the KSEB section from this Consumer Number.' }, { status: 400 })
    const selectedSection = findSectionByName(body.sectionOffice ?? '')
    if (selectedSection && selectedSection.sectionCode !== decoded.sectionCode) return NextResponse.json({ success: false, state: 'SECTION_MISMATCH', message: `The Consumer Number appears to belong to ${decoded.sectionName}. Please verify your Consumer Number or Section Office.` }, { status: 400 })
    if (!body.area?.trim() || !Number.isFinite(Number(body.requestedKw)) || Number(body.requestedKw) <= 0) return NextResponse.json({ success: false, state: 'INVALID_REQUEST' }, { status: 400 })
    if (!decoded.district) return NextResponse.json({ success: false, state: 'SECTION_DISTRICT_UNRESOLVED', message: 'The section was identified, but its district is not available in the source registry.' }, { status: 422 })
    const recap = await getRecapProvider().getTransformerData({ district: decoded.district, section: decoded.sectionName })
    const matched = matchTransformers(recap.records, body.area, body.transformerName)
    if (matched.status !== 'MATCH') return NextResponse.json({ success: false, state: matched.status === 'NO_MATCH' ? 'TRANSFORMER_NOT_IDENTIFIED' : 'MULTIPLE_TRANSFORMERS', matches: matched.matches.map((record) => record.transformerName) }, { status: 422 })
    const requestedKw = Number(body.requestedKw)
    const feasibility = calculateFeasibility(matched.record.balanceAvailableKw, requestedKw)
    return NextResponse.json({ success: true, section: { code: decoded.sectionCode, name: decoded.sectionName, district: decoded.district }, area: body.area, transformer: matched.record, balanceStatus: getBalanceStatus(matched.record), proposal: { requestedKw, remainingAfterProposalKw: feasibility.remainingAfterProposalKw }, feasibility, source: { provider: 'KSEB', checkedAt: recap.checkedAt, url: 'https://wss.kseb.in/selfservices/reCap' } })
  } catch {
    return NextResponse.json({ success: false, state: 'KSEB_DATA_UNAVAILABLE', message: 'KSEB transformer capacity data is temporarily unavailable.' }, { status: 503 })
  }
}
