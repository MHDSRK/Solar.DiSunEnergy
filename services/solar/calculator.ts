export type CalculationMode = 'bill' | 'units'

export function calculateBillFromUnits(units: number, category: string) {
  if (category === 'Commercial') return 60 + units * 9.5
  const slabs = [[50, 3.35], [100, 4.25], [150, 5.35], [200, 7.2], [250, 8.5], [300, 6.75], [350, 7.6], [400, 7.95], [500, 8.25], [Infinity, 9.2]] as const
  let total = 60
  let previous = 0
  for (const [limit, rate] of slabs) {
    total += Math.max(0, Math.min(units, limit) - previous) * rate
    previous = limit
    if (units <= limit) break
  }
  return total
}

export function getRecommendedKw(rawKw: number) {
  return rawKw <= 3 ? 3 : rawKw < 5 ? 5 : Math.ceil(rawKw)
}

export function calculateSetupCost(kw: number) {
  return kw === 1 ? 85000 : kw === 2 ? 150000 : kw === 3 ? 220000 : kw === 5 ? 325000 : 220000 + (kw - 3) * 52500
}

export function calculateSubsidy(kw: number, category: string) {
  if (category !== 'Domestic') return 0
  return kw <= 2 ? kw * 30000 : kw <= 3 ? 60000 + (kw - 2) * 18000 : 78000
}

export function calculateSolarResult(input: number, category: string, mode: CalculationMode) {
  const units = mode === 'units' ? input : (() => {
    const target = Math.max(0, input - 60)
    if (category === 'Commercial') return target / 9.5
    let low = 0
    let high = Math.max(1, target / 3.35)
    while (calculateBillFromUnits(high, category) < input) high *= 2
    for (let i = 0; i < 40; i += 1) {
      const middle = (low + high) / 2
      if (calculateBillFromUnits(middle, category) < input) low = middle
      else high = middle
    }
    return (low + high) / 2
  })()
  const kw = getRecommendedKw(Number((units / 120).toFixed(2)))
  const cost = calculateSetupCost(kw)
  const subsidy = calculateSubsidy(kw, category)
  const loan = 200000
  return {
    kw,
    roofMin: kw * 80,
    roofMax: kw * 120,
    cost,
    subsidy,
    loan,
    netCost: Math.max(0, cost - subsidy - loan),
    monthlyKwh: Number(units.toFixed(2)),
  }
}
