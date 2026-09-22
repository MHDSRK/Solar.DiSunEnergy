export type TransformerRecord = {
  id: string
  transformerName: string
  feederName: string
  dtrCapacityKva: number
  allowedCapacityKw: number
  feasibilityIssuedKw: number
  gridConnectedKw: number
  balanceAvailableKw: number
}

export type FeasibilityStatus = 'PRELIMINARILY_FEASIBLE' | 'INSUFFICIENT_CAPACITY'

export function parseKw(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeTransformer(value: Record<string, unknown>): TransformerRecord | null {
  const allowedCapacityKw = parseKw(value.allowed_cap)
  const gridConnectedKw = parseKw(value.comp_cap)
  const balanceAvailableKw = parseKw(value.regi)
  const dtrCapacityKva = parseKw(value.capacity)

  // KSEB's reCap payload field names do not line up with the visible table
  // labels. The authoritative table relationship is:
  // 90% DTR capacity = feasibility issued + grid connected + balance available.
  // Derive feasibility issued from the other three displayed values so the
  // website result matches KSEB's published table.
  const feasibilityIssuedKw =
    allowedCapacityKw !== null && gridConnectedKw !== null && balanceAvailableKw !== null
      ? Math.max(0, allowedCapacityKw - gridConnectedKw - balanceAvailableKw)
      : null

  if ([allowedCapacityKw, feasibilityIssuedKw, gridConnectedKw, balanceAvailableKw, dtrCapacityKva].some((item) => item === null)) return null

  return {
    id: String(value.id ?? ''),
    transformerName: String(value.transformer_name ?? '').trim(),
    feederName: String(value.feeder_name ?? '').trim(),
    dtrCapacityKva: dtrCapacityKva!,
    allowedCapacityKw: allowedCapacityKw!,
    feasibilityIssuedKw: feasibilityIssuedKw!,
    gridConnectedKw: gridConnectedKw!,
    balanceAvailableKw: balanceAvailableKw!,
  }
}

export function calculateFeasibility(balanceAvailableKw: number, requestedKw: number) {
  return { status: (balanceAvailableKw >= requestedKw ? 'PRELIMINARILY_FEASIBLE' : 'INSUFFICIENT_CAPACITY') as FeasibilityStatus, available: balanceAvailableKw >= requestedKw, remainingAfterInstallationKw: balanceAvailableKw - requestedKw, capacityMessage: balanceAvailableKw > 40 ? 'CAPACITY APPEARS AVAILABLE' : 'CRITICAL, CAPACITY ABOUT TO END SOON' }
}

export function getBalanceStatus(_record: TransformerRecord) {
  return 'KSEB_REPORTED' as const
}
