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
  const feasibilityIssuedKw = parseKw(value.feasible)
  const gridConnectedKw = parseKw(value.regi)
  const balanceAvailableKw = parseKw(value.comp_cap)
  const dtrCapacityKva = parseKw(value.capacity)
  if ([allowedCapacityKw, feasibilityIssuedKw, gridConnectedKw, balanceAvailableKw, dtrCapacityKva].some((item) => item === null)) return null
  return { id: String(value.id ?? ''), transformerName: String(value.transformer_name ?? '').trim(), feederName: String(value.feeder_name ?? '').trim(), dtrCapacityKva: dtrCapacityKva!, allowedCapacityKw: allowedCapacityKw!, feasibilityIssuedKw: feasibilityIssuedKw!, gridConnectedKw: gridConnectedKw!, balanceAvailableKw: balanceAvailableKw! }
}

export function calculateFeasibility(balanceAvailableKw: number, requestedKw: number) {
  return { status: (balanceAvailableKw >= requestedKw ? 'PRELIMINARILY_FEASIBLE' : 'INSUFFICIENT_CAPACITY') as FeasibilityStatus, available: balanceAvailableKw >= requestedKw, remainingAfterInstallationKw: balanceAvailableKw - requestedKw }
}

export function getBalanceStatus(record: TransformerRecord) {
  const calculated = record.allowedCapacityKw - record.feasibilityIssuedKw - record.gridConnectedKw
  return Math.abs(calculated - record.balanceAvailableKw) <= 0.01 ? 'MATCH' : 'DATA_DISCREPANCY'
}
