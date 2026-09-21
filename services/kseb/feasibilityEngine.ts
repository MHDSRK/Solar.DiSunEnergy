export type TransformerRecord = { transformerName: string; dtrCapacity90Kw: number; feasibilityIssuedKw: number; gridConnectedKw: number; balanceAvailableKw: number }
export type FeasibilityStatus = 'PRELIMINARILY_FEASIBLE' | 'INSUFFICIENT_CAPACITY'

export function calculateFeasibility(balanceAvailableKw: number, requestedKw: number) {
  const remainingAfterProposalKw = balanceAvailableKw - requestedKw
  return { status: (balanceAvailableKw >= requestedKw ? 'PRELIMINARILY_FEASIBLE' : 'INSUFFICIENT_CAPACITY') as FeasibilityStatus, available: balanceAvailableKw >= requestedKw, remainingAfterProposalKw }
}

export function normalizeCapacity(value: unknown) {
  if (value === null || value === undefined || value === '') return 0
  const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

export function normalizeTransformer(value: Record<string, unknown>): TransformerRecord {
  const dtrCapacity90Kw = normalizeCapacity(value.dtrCapacity90Kw ?? value.capacity90 ?? value.capacity)
  const feasibilityIssuedKw = normalizeCapacity(value.feasibilityIssuedKw ?? value.feasible)
  const gridConnectedKw = normalizeCapacity(value.gridConnectedKw ?? value.regi ?? value.comp_cap)
  const balanceAvailableKw = normalizeCapacity(value.balanceAvailableKw ?? value.balance)
  const calculatedBalance = Math.max(0, dtrCapacity90Kw - feasibilityIssuedKw - gridConnectedKw)
  return { transformerName: String(value.transformerName ?? value.transformer_name ?? ''), dtrCapacity90Kw, feasibilityIssuedKw, gridConnectedKw, balanceAvailableKw: balanceAvailableKw || calculatedBalance }
}

export function getBalanceStatus(record: TransformerRecord) {
  const calculated = Math.max(0, record.dtrCapacity90Kw - record.feasibilityIssuedKw - record.gridConnectedKw)
  return Math.abs(calculated - record.balanceAvailableKw) <= 0.01 ? 'MATCH' : 'DATA_DISCREPANCY'
}
