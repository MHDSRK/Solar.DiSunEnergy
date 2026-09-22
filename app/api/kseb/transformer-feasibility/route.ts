import { NextResponse } from 'next/server'
import { decodeKsebConsumerNumber } from '@/services/kseb/consumerDecoder'
import { calculateFeasibility, getBalanceStatus } from '@/services/kseb/feasibilityEngine'
import { fetchKsebRecap, resolveKsebSection } from '@/services/kseb/recapClient'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { consumerNumber?: string; districtId?: string; district?: string; sectionId?: string; sectionOffice?: string; requestedKw?: number; transformerId?: string; transformerName?: string }
    const requestedKw = Number(body.requestedKw)
    if (!Number.isFinite(requestedKw) || requestedKw <= 0) return NextResponse.json({ success: false, state: 'INVALID_REQUEST', message: 'Enter a valid requested solar capacity.' }, { status: 400 })
    const consumerNumber = body.consumerNumber?.trim() ?? ''
    const decoded = consumerNumber ? decodeKsebConsumerNumber(consumerNumber) : null
    if (consumerNumber && decoded?.reason === 'INVALID_CONSUMER_NUMBER') return NextResponse.json({ success: false, state: 'INVALID_CONSUMER_NUMBER', message: 'Please enter a valid 13-digit KSEB Consumer Number.' }, { status: 400 })

    // Consumer decoding is optional. An unresolved consumer mapping must never
    // prevent a selected section office or explicit sectionId from initiating
    // the authoritative KSEB DTR request.
    const section = await resolveKsebSection({
      sectionId: body.sectionId,
      sectionOffice: body.sectionOffice || (decoded?.valid ? decoded.sectionName : undefined),
    })
    if (!section) return NextResponse.json({ success: false, state: 'SECTION_NOT_IDENTIFIED', message: 'Please select a KSEB Section Office or provide sufficient area information to identify the section.' }, { status: 422 })
    if (body.districtId && section.districtId && String(body.districtId) !== String(section.districtId)) return NextResponse.json({ success: false, state: 'DISTRICT_CONFLICT', message: 'Selected KSEB district and section do not match.' }, { status: 409 })
    if (decoded?.valid && body.sectionOffice && decoded.sectionName.toLocaleLowerCase() !== body.sectionOffice.trim().toLocaleLowerCase()) return NextResponse.json({ success: false, state: 'SECTION_CONFLICT', message: 'Consumer number and selected KSEB section appear to be different.' }, { status: 409 })
    const recap = await fetchKsebRecap({ sectionId: section.sectionId })
    const selectedTransformerId = body.transformerId?.trim()
    const selected = selectedTransformerId ? recap.records.find((record) => String(record.id) === String(selectedTransformerId)) : null
    if (!selected) return NextResponse.json({ success: false, state: 'TRANSFORMER_NOT_SELECTED', message: 'Please select a transformer from the KSEB list.' }, { status: 422 })
    const feasibility = calculateFeasibility(selected.balanceAvailableKw, requestedKw)
    return NextResponse.json({ success: true, status: feasibility.status, section: { sectionId: section.sectionId, sectionCode: section.sectionId, name: section.name, districtId: section.districtId }, transformer: selected, requestedKw, remainingAfterInstallationKw: feasibility.remainingAfterInstallationKw, capacityMessage: feasibility.capacityMessage, balanceStatus: getBalanceStatus(selected), ksebDataTimestamp: recap.checkedAt, retrievedAt: recap.retrievedAt, source: { provider: 'KSEB', url: 'https://wss.kseb.in/selfservices/reCap' } })
  } catch (error) {
    const message = error instanceof Error && error.message === 'KSEB_MALFORMED_RESPONSE' ? 'KSEB returned an unexpected response. Please try again.' : 'KSEB capacity data is temporarily unavailable. Please try again.'
    return NextResponse.json({ success: false, state: 'KSEB_DATA_UNAVAILABLE', message }, { status: 503 })
  }
}
