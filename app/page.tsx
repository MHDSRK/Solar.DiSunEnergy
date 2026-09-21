'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

// Saved design assets for the next page iteration.
export const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
export const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [isFeasibilityPage, setIsFeasibilityPage] = useState(false)
  const [feasibilityForm, setFeasibilityForm] = useState({ consumerNumber: '', sectionOffice: '', landmark: '', transformerName: '' })
  const [feasibilityErrors, setFeasibilityErrors] = useState<Record<string, string>>({})
  const [feasibilityResult, setFeasibilityResult] = useState<Record<string, unknown> | null>(null)
  const [isCheckingFeasibility, setIsCheckingFeasibility] = useState(false)
  const [calculationMode, setCalculationMode] = useState<'bill' | 'units'>('bill')
  const [form, setForm] = useState({ bill: '', category: '', fullName: '', phone: '', district: '', area: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const sheetRef = useRef<HTMLElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<{ kw: number; roofMin: number; roofMax: number; cost: number; subsidy: number; loan: number; netCost: number } | null>(null)
  useEffect(() => {
    if (!result) return
    requestAnimationFrame(() => {
      const sheet = sheetRef.current
      const result = resultRef.current
      if (!sheet || !result) return
      sheet.scrollTo({ top: Math.max(0, result.offsetTop - 56), behavior: 'smooth' })
    })
  }, [result])
  const keralaDistricts = ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad']

  const validateField = (field: keyof typeof form, value: string) => {
    const message = field === 'bill' && (!value || !/^\d+$/.test(value) || Number(value) <= 0) ? 'Enter a valid amount' : field === 'category' && !value ? 'Select a category' : field === 'fullName' && !value.trim() ? 'Enter your full name' : field === 'phone' && !/^[6-9]\d{9}$/.test(value) ? 'Enter a valid 10-digit phone number' : field === 'district' && !value ? 'Select your district' : field === 'area' && !value.trim() ? 'Enter your area' : ''
    setErrors((current) => ({ ...current, [field]: message }))
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const calculateBillFromUnits = (units: number, category: string) => {
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

  const getRecommendedKw = (rawKw: number) => rawKw <= 3 ? 3 : rawKw < 5 ? 5 : Math.ceil(rawKw)
  const calculateSetupCost = (kw: number) => kw === 1 ? 85000 : kw === 2 ? 150000 : kw === 3 ? 220000 : kw === 5 ? 325000 : 220000 + (kw - 3) * 52500
  const calculateSolarResult = () => {
    const input = Number(form.bill)
    const units = calculationMode === 'units' ? input : (() => {
      const target = Math.max(0, input - 60)
      if (form.category === 'Commercial') return target / 9.5
      let low = 0, high = Math.max(1, target / 3.35)
      while (calculateBillFromUnits(high, form.category) < input) high *= 2
      for (let i = 0; i < 40; i += 1) { const middle = (low + high) / 2; if (calculateBillFromUnits(middle, form.category) < input) low = middle; else high = middle }
      return (low + high) / 2
    })()
    const kw = getRecommendedKw(Number((units / 120).toFixed(2)))
    const cost = calculateSetupCost(kw)
    const subsidy = form.category === 'Domestic' ? kw <= 2 ? kw * 30000 : kw <= 3 ? 60000 + (kw - 2) * 18000 : 78000 : 0
    const loan = 200000
    setResult({ kw, roofMin: kw * 80, roofMax: kw * 120, cost, subsidy, loan, netCost: Math.max(0, cost - subsidy - loan) })
  }

  const validateAndSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.bill || !/^\d+$/.test(form.bill) || Number(form.bill) <= 0) nextErrors.bill = 'Enter a valid amount'
    if (!form.category) nextErrors.category = 'Select a category'
    if (!form.fullName.trim()) nextErrors.fullName = 'Enter your full name'
    if (!/^[6-9]\d{9}$/.test(form.phone)) nextErrors.phone = 'Enter a valid 10-digit phone number'
    if (!form.district.trim()) nextErrors.district = 'Enter your district'
    if (!form.area.trim()) nextErrors.area = 'Enter your area'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      setResult(null)
      setIsCalculating(true)
      requestAnimationFrame(() => sheetRef.current?.scrollTo({ top: sheetRef.current.scrollHeight, behavior: 'smooth' }))
      window.setTimeout(() => {
        calculateSolarResult()
        setIsCalculating(false)
requestAnimationFrame(() => {
          const sheet = sheetRef.current
          const result = resultRef.current
          if (!sheet || !result) return
          sheet.scrollTo({ top: Math.max(0, result.offsetTop - 56), behavior: 'smooth' })
        })
      }, 3000)
    }
  }

  const submitFeasibility = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!/^\d{13}$/.test(feasibilityForm.consumerNumber)) nextErrors.consumerNumber = 'Please enter a valid 13-digit KSEB Consumer Number.'
    if (!feasibilityForm.sectionOffice.trim()) nextErrors.sectionOffice = 'Enter the section office'
    if (!feasibilityForm.landmark.trim()) nextErrors.landmark = 'Enter the area or landmark'
    setFeasibilityErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setIsCheckingFeasibility(true)
    setFeasibilityResult(null)
    try {
      const response = await fetch('/api/kseb/transformer-feasibility', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consumerNumber: feasibilityForm.consumerNumber, sectionOffice: feasibilityForm.sectionOffice, area: feasibilityForm.landmark, transformerName: feasibilityForm.transformerName, requestedKw: result?.kw }) })
      setFeasibilityResult(await response.json())
    } catch { setFeasibilityResult({ success: false, state: 'KSEB_DATA_UNAVAILABLE', message: 'KSEB transformer capacity data is temporarily unavailable.' }) }
    finally { setIsCheckingFeasibility(false) }
  }

  return (
    <main className="relative min-h-dvh overflow-y-auto bg-[#03132f] text-white" aria-label="DiSun Energy International solar calculator">
      <div className="fixed inset-0 bg-[#03132f] bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: `url(${floorImage})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,47,.08)_0%,rgba(3,19,47,.08)_48%,rgba(3,19,47,.18)_100%)]" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-[60] flex h-[64px] items-center justify-between rounded-b-[24px] bg-white px-5 pt-1 shadow-[0_8px_20px_rgba(0,0,0,.24)] sm:px-8">
        <a href="#top" aria-label="DiSun Energy International home" className="h-10 w-14 origin-left overflow-hidden rounded-lg bg-white"><img src={markImage} alt="DiSun Energy International logo" className="h-full w-full object-cover object-center" /></a>
        <div className="flex items-center gap-3 text-[#1260a4]" aria-label="Social links">
          <a href="#facebook" aria-label="Facebook" className="grid size-7 place-items-center rounded-full border-2 border-[#1260a4] text-[#1260a4] transition-transform hover:scale-105"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] fill-current"><path d="M13.5 21.5v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H8v3.1h2.4v8h3.1Z" /></svg></a>
          <a href="#instagram" aria-label="Instagram" className="grid size-7 place-items-center rounded-full border-2 border-[#1260a4] text-[#1260a4] transition-transform hover:scale-105"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2.4"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".9" className="fill-current stroke-none" /></svg></a>
        </div>
      </header>

      <section id="top" className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-5 pt-[92px] text-center sm:pt-28">
        <p className="text-[15px] font-semibold tracking-[0.04em] text-white sm:text-lg">DiSun Energy International</p>
        <h1 className="mt-8 text-[31px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-5xl">POWER YOUR FUTURE<br /><span className="text-[43px] text-[#79d52a] sm:text-6xl">WITH SOLAR</span></h1>
        <p className="mx-auto mt-5 max-w-[320px] text-[13px] leading-[1.45] text-white sm:text-base">Calculate your savings, check eligibility and take the next step towards <strong>Powerful future with SOLAR.</strong></p>
        <dl className="mx-auto mt-10 grid w-full max-w-[370px] grid-cols-3 divide-x divide-white/35"><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Up to<br /><span className="text-xl sm:text-2xl">₹ 78000</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">PM SURYA GHAR<br />SUBSIDY</dt></div><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Up to<br /><span className="text-xl sm:text-2xl">₹ 200000</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">BANK LOAN<br />AVAILABLE</dt></div><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Panels with<br /><span className="text-xl sm:text-2xl">30 YEARS</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">WARRANTY<br />ASSURANCE</dt></div></dl>
        <div className="mt-auto pt-12"><p className="mb-4 text-center text-[14px] font-medium leading-[1.15] tracking-[0.01em] sm:text-lg">How much Power required<br /><span className="text-[20px] font-extrabold sm:text-2xl">for your home?</span></p><button type="button" onClick={() => setIsCalculatorOpen(true)} className="mx-auto flex min-h-12 max-w-[245px] items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold tracking-[0.06em] text-[#06152d] shadow-[0_5px_18px_rgba(255,255,255,.18)] transition-transform hover:scale-[1.03]">CALCULATE NOW <span className="ml-2 text-[#2e8dbe]">&gt;</span></button><p className="mt-5 text-xs text-white/90">By continuing, you agree to our <a className="underline" href="#privacy">Privacy policy</a> and <a className="underline" href="#terms">Terms&amp;Conditions</a></p></div>
      </section>
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#03132f]/95 pt-[78px]" role="dialog" aria-modal="true" aria-labelledby="calculator-title">
          <button type="button" aria-label="Close calculator" className="absolute inset-0 cursor-default" onClick={() => setIsCalculatorOpen(false)} />
          <section ref={sheetRef} className="relative isolate max-h-[calc(100dvh-94px)] w-[calc(100%-24px)] overflow-x-hidden overflow-y-auto rounded-[28px] bg-white px-4 pb-6 pt-2 text-[#071528] shadow-[0_12px_32px_rgba(0,0,0,.28)] animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 z-40 -mx-4 flex h-12 shrink-0 isolate items-center justify-between bg-white px-4 pb-1 pt-0 shadow-[0_3px_8px_rgba(7,21,40,.08)] before:absolute before:-inset-x-1 before:-top-2 before:-z-10 before:h-12 before:bg-white before:content-['']"><span className="text-sm font-semibold text-[#071528]">{isFeasibilityPage ? '2 / 4' : '1 / 4'}</span><div className="flex items-center gap-1" aria-label={`Step ${isFeasibilityPage ? 2 : 1} of 4`}><span className="h-1 w-5 rounded-full bg-[#1260a4]" /><span className={`h-1 w-5 rounded-full ${isFeasibilityPage ? 'bg-[#1260a4]' : 'bg-slate-300'}`} /><span className="h-1 w-5 rounded-full bg-slate-300" /><span className="h-1 w-5 rounded-full bg-slate-300" /></div><button type="button" onClick={() => setIsCalculatorOpen(false)} aria-label="Close calculator" className="grid size-10 place-items-center text-3xl font-light">×</button></div>
            <h2 className={`${isFeasibilityPage ? 'hidden' : ''} relative z-0 mt-4 px-2 text-center text-2xl font-extrabold leading-[1.05] tracking-[-.04em]`}>SOLAR POWER<br />CALCULATOR</h2>
            <p className={isFeasibilityPage ? 'hidden' : 'mt-6 text-center text-lg font-bold'}>CALCULATION BASED ON</p>
            <div className={isFeasibilityPage ? 'hidden' : 'mt-3 grid grid-cols-2 overflow-hidden rounded-t-xl border border-slate-300 text-[9px] font-bold leading-none'}><button type="button" onClick={() => setCalculationMode('bill')} className={`flex min-h-14 items-center justify-center whitespace-nowrap px-2 text-center ${calculationMode === 'bill' ? 'bg-[#159600] text-white' : 'bg-slate-200 text-slate-500'}`}>AVG. MONTHLY BILL (₹)</button><button type="button" onClick={() => setCalculationMode('units')} className={`flex min-h-14 items-center justify-center whitespace-nowrap px-2 text-center ${calculationMode === 'units' ? 'bg-[#159600] text-white' : 'bg-slate-200 text-slate-500'}`}>AVG. MONTHLY UNITS (KW)</button></div>
            <form onSubmit={validateAndSubmit} className={isFeasibilityPage ? 'hidden' : 'border-x border-b border-[#8bd35c] px-3 py-2'} noValidate>
              <div className="grid grid-cols-2 items-start gap-3">
                <label className="block text-[10px] font-medium leading-tight">{calculationMode === 'bill' ? <>AVERAGE MONTHLY<br />ELECTRICITY BILL (₹)</> : <><span className="block whitespace-nowrap">AVERAGE UNIT MONTHLY</span><span className="block whitespace-nowrap">CONSUMED (KW)</span></>}<span className="relative mt-1 block"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium">{calculationMode === 'bill' ? '₹' : 'KW'}</span><input value={form.bill} onChange={(event) => updateField('bill', event.target.value.replace(/\D/g, ''))} className={`h-10 w-full rounded-lg border pl-9 pr-8 text-sm outline-none focus:border-[#159600] ${errors.bill ? 'border-red-500' : 'border-slate-400'}`} inputMode="numeric" aria-invalid={Boolean(errors.bill)} onBlur={(event) => validateField('bill', event.target.value)} /><span className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col"><button type="button" aria-label="Increase value" className="h-4 px-1 text-xs leading-none" onClick={() => updateField('bill', String(Number(form.bill || 0) + 100))}>▲</button><button type="button" aria-label="Decrease value" className="h-4 px-1 text-xs leading-none" onClick={() => updateField('bill', String(Math.max(0, Number(form.bill || 0) - 100)))}>▼</button></span></span>{errors.bill && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.bill}</span>}</label>
                <label className="block text-[10px] font-medium leading-tight">CONNECTION<br />CATEGORY<select value={form.category} data-placeholder={!form.category} onChange={(event) => updateField('category', event.target.value)} onBlur={(event) => validateField('category', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:border-[#159600] ${errors.category ? 'border-red-500' : 'border-slate-400'}`}><option value="" className="text-gray-400">Select</option><option value="Domestic">Domestic</option><option value="Commercial">Commercial</option></select>{errors.category && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.category}</span>}</label>
              </div>
              <p className="mt-1 whitespace-nowrap pt-0 text-[7px] leading-none tracking-[-0.03em] text-slate-500">{calculationMode === 'bill' ? 'Tip: If your KSEB bill is bi-monthly, divide the bill amount by 2 to get your monthly average.' : 'Tip: If your KSEB bill is bi-monthly, divide total units by 2 to get your monthly average.'}</p>
              <div className="mt-3 border-t border-slate-200 pt-3"><div className="space-y-3">
                <label className="block text-[10px] font-medium">FULL NAME<input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} onBlur={(event) => validateField('fullName', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${errors.fullName ? 'border-red-500' : 'border-slate-400'}`} />{errors.fullName && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.fullName}</span>}</label>
                <label className="block text-[10px] font-medium">PHONE NUMBER<input value={form.phone} onChange={(event) => updateField('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={(event) => validateField('phone', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${errors.phone ? 'border-red-500' : 'border-slate-400'}`} inputMode="numeric" maxLength={10} />{errors.phone && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.phone}</span>}</label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-medium">DISTRICT<select value={form.district} data-placeholder={!form.district} onChange={(event) => updateField('district', event.target.value)} onBlur={(event) => validateField('district', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:border-[#159600] ${errors.district ? 'border-red-500' : 'border-slate-400'}`}><option value="" className="text-gray-400">Select district</option>{keralaDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select>{errors.district && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.district}</span>}</label><label className="block text-[10px] font-medium">AREA<input value={form.area} onChange={(event) => updateField('area', event.target.value)} onBlur={(event) => validateField('area', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${errors.area ? 'border-red-500' : 'border-slate-400'}`} />{errors.area && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.area}</span>}</label></div>
                <button type="submit" className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white shadow-none">SUBMIT</button>
                {isCalculating && <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500"><span className="size-3 animate-spin rounded-full border-2 border-[#159600]/25 border-t-[#159600]" />Preparing your solar estimate...</div>}
                {result && <div ref={resultRef} className="mt-0 space-y-3 animate-in fade-in duration-500"><h3 className="-mt-1 text-center text-base font-extrabold leading-tight">Solar Estimate &amp; Financial Summary</h3><div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-center"><div className="border-b border-slate-200 pb-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recommended plant</p><p className="mt-1 text-3xl font-extrabold text-[#168566]">{result.kw} <span className="text-lg">kW</span></p></div><div className="pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Approx. roof area</p><p className="mt-1 text-xl font-extrabold text-[#293244]">{result.roofMin}–{result.roofMax} sq ft</p></div></div><div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-[10px]"><div className="flex justify-between gap-2"><span>Estimated Total Setup Cost:</span><strong>₹ {result.cost.toLocaleString('en-IN')}</strong></div><div className="mt-2 flex justify-between gap-2 text-[#168566]"><span>- PM Surya Ghar Govt Subsidy:<small className="block text-slate-400">(Central Govt Grant)</small></span><strong>-₹ {result.subsidy.toLocaleString('en-IN')}</strong></div><div className="mt-2 flex justify-between gap-2 text-[#168566]"><span>- Maximum Bank Loan:<small className="block text-slate-400">(Up to)</small></span><strong>-₹ {result.loan.toLocaleString('en-IN')}</strong></div><div className="mt-3 flex justify-between gap-2 text-sm font-extrabold"><span>Est. Out-of-Pocket Cost:</span><strong className="text-[#168566]">₹ {result.netCost.toLocaleString('en-IN')}</strong></div></div><div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white p-3 text-sm font-extrabold text-[#168566]"><span>Est. Annual Savings:</span><strong>₹ {(result.kw * 6800).toLocaleString('en-IN')}</strong></div><button type="button" onClick={() => setIsFeasibilityPage(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-[#1260a4] bg-white px-6 text-sm font-extrabold tracking-[0.08em] text-[#1260a4] shadow-none">CHECK FEASIBILITY <span aria-hidden="true" className="text-lg leading-none">→</span></button></div>}
              </div></div>
            </form>
            {isFeasibilityPage && <form onSubmit={submitFeasibility} className="px-2 pb-4 pt-8 text-center"><h2 className="text-2xl font-extrabold leading-tight tracking-[-.04em]">CHECK TRANSFORMER<br />FEASIBILITY</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">Review your solar estimate and continue with a feasibility check for your property.</p><div className="mt-6 space-y-3 text-left"><label className="block text-[10px] font-medium">KSEB CONSUMER NUMBER<input value={feasibilityForm.consumerNumber} onChange={(event) => { setFeasibilityForm((current) => ({ ...current, consumerNumber: event.target.value.replace(/\D/g, '').slice(0, 13) })); setFeasibilityErrors((current) => ({ ...current, consumerNumber: '' })) }} onBlur={() => { if (!/^\d{13}$/.test(feasibilityForm.consumerNumber)) setFeasibilityErrors((current) => ({ ...current, consumerNumber: 'Enter a valid 13-digit consumer number' })) }} className={`mt-1 h-10 w-full rounded-lg border ${feasibilityErrors.consumerNumber ? 'border-red-500' : 'border-slate-400'} px-2 text-sm outline-none focus:border-[#159600]`} required />{feasibilityErrors.consumerNumber && <span className="mt-1 block text-[9px] font-normal text-red-600">{feasibilityErrors.consumerNumber}</span>}</label><div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-medium">KSEB SECTION OFFICE<input value={feasibilityForm.sectionOffice} onChange={(event) => setFeasibilityForm((current) => ({ ...current, sectionOffice: event.target.value }))} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${feasibilityErrors.sectionOffice ? 'border-red-500' : 'border-slate-400'}`} required />{feasibilityErrors.sectionOffice && <span className="mt-1 block text-[9px] font-normal text-red-600">{feasibilityErrors.sectionOffice}</span>}</label><label className="block text-[10px] font-medium">AREA / LANDMARK<input value={feasibilityForm.landmark} onChange={(event) => setFeasibilityForm((current) => ({ ...current, landmark: event.target.value }))} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${feasibilityErrors.landmark ? 'border-red-500' : 'border-slate-400'}`} required />{feasibilityErrors.landmark && <span className="mt-1 block text-[9px] font-normal text-red-600">{feasibilityErrors.landmark}</span>}</label></div><label className="block text-[10px] font-medium">TRANSFORMER IDENTIFICATION NAME (IF AVAILABLE)<input value={feasibilityForm.transformerName} onChange={(event) => setFeasibilityForm((current) => ({ ...current, transformerName: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-400 px-2 text-sm outline-none focus:border-[#159600]" /></label></div><button type="submit" disabled={isCheckingFeasibility} className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white disabled:opacity-60">{isCheckingFeasibility ? 'CHECKING...' : 'SUBMIT'}</button>{isCheckingFeasibility && <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500"><span className="size-3 animate-spin rounded-full border-2 border-[#1260a4]/25 border-t-[#1260a4]" />Checking transformer feasibility...</div>}{feasibilityResult && <div className={`mt-4 rounded-2xl border-2 p-4 text-left text-xs ${feasibilityResult.success ? 'border-[#8bd35c]' : 'border-amber-300'}`}><h3 className="text-base font-extrabold">{Boolean(feasibilityResult.success) ? String((feasibilityResult.feasibility as { status?: string })?.status ?? '').replaceAll('_', ' ') : String(feasibilityResult.message ?? 'KSEB capacity data is unavailable.')}</h3>{Boolean(feasibilityResult.success) && <p className="mt-2 leading-relaxed">Transformer: {String((feasibilityResult.transformer as { transformerName?: string })?.transformerName)}<br />Balance available: {String((feasibilityResult.transformer as { balanceAvailableKw?: number })?.balanceAvailableKw)} kW<br />Requested solar: {String((feasibilityResult.proposal as { requestedKw?: number })?.requestedKw)} kW<br />Remaining after proposal: {String((feasibilityResult.proposal as { remainingAfterProposalKw?: number })?.remainingAfterProposalKw)} kW</p>}<p className="mt-3 text-[10px] text-slate-500">This is a preliminary capacity check based on publicly retrieved KSEB transformer data. Final feasibility and approval remain subject to KSEB&apos;s official process.</p></div>}</form>}
          </section>
        </div>
      )}
    </main>
  )
}

