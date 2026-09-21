'use client'

import { useState, type FormEvent } from 'react'

// Saved design assets for the next page iteration.
export const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
export const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [calculationMode, setCalculationMode] = useState<'bill' | 'units'>('bill')
  const [form, setForm] = useState({ bill: '', category: '', fullName: '', phone: '', district: '', area: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const keralaDistricts = ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad']

  const validateField = (field: keyof typeof form, value: string) => {
    const message = field === 'bill' && (!value || !/^\d+$/.test(value) || Number(value) <= 0) ? 'Enter a valid amount' : field === 'category' && !value ? 'Select a category' : field === 'fullName' && !value.trim() ? 'Enter your full name' : field === 'phone' && !/^[6-9]\d{9}$/.test(value) ? 'Enter a valid 10-digit phone number' : field === 'district' && !value ? 'Select your district' : field === 'area' && !value.trim() ? 'Enter your area' : ''
    setErrors((current) => ({ ...current, [field]: message }))
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
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
        <div className="mt-auto pt-12"><p className="mb-4 text-center text-[14px] font-medium leading-[1.15] tracking-[0.01em] sm:text-lg">How much Power required<br /><span className="text-[20px] font-extrabold sm:text-2xl">for your home?</span></p><button type="button" onClick={() => setIsCalculatorOpen(true)} className="mx-auto flex min-h-12 max-w-[245px] items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold tracking-[0.06em] text-[#06152d] shadow-[0_5px_18px_rgba(255,255,255,.18)] transition-transform hover:scale-[1.03]">CALCULATE NOW <span className="ml-2 text-[#2e8dbe]">&gt;</span></button><p className="mt-5 text-[10px] text-white/90">By continuing, you agree to our <a className="underline" href="#privacy">Privacy policy</a> and <a className="underline" href="#terms">Terms&amp;Conditions</a></p></div>
      </section>
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#03132f]/95 pt-[78px]" role="dialog" aria-modal="true" aria-labelledby="calculator-title">
          <button type="button" aria-label="Close calculator" className="absolute inset-0 cursor-default" onClick={() => setIsCalculatorOpen(false)} />
          <section className="relative isolate max-h-[calc(100dvh-94px)] w-[calc(100%-24px)] overflow-x-hidden overflow-y-auto rounded-[28px] bg-white px-4 pb-6 pt-2 text-[#071528] shadow-[0_12px_32px_rgba(0,0,0,.28)] animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 z-40 -mx-4 flex h-12 shrink-0 isolate items-center justify-between bg-white px-4 pb-1 pt-0 shadow-[0_3px_8px_rgba(7,21,40,.08)] before:absolute before:-inset-x-1 before:-top-2 before:-z-10 before:h-16 before:bg-white before:content-['']"><span className="text-sm font-semibold text-[#071528]">1 / 4</span><div className="flex items-center gap-1" aria-label="Step 1 of 4"><span className="h-1 w-5 rounded-full bg-[#1260a4]" /><span className="h-1 w-5 rounded-full bg-slate-300" /><span className="h-1 w-5 rounded-full bg-slate-300" /><span className="h-1 w-5 rounded-full bg-slate-300" /></div><button type="button" onClick={() => setIsCalculatorOpen(false)} aria-label="Close calculator" className="grid size-10 place-items-center text-3xl font-light">×</button></div>
            <h2 id="calculator-title" className="relative z-0 mt-4 px-2 text-center text-2xl font-extrabold leading-[1.05] tracking-[-.04em]">SUBSIDY &amp; SAVINGS<br />CALCULATOR</h2>
            <p className="mt-6 text-center text-lg font-bold">CALCULATION BASED ON</p>
            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-t-xl border border-slate-300 text-[9px] font-bold leading-none"><button type="button" onClick={() => setCalculationMode('bill')} className={`flex min-h-14 items-center justify-center whitespace-nowrap px-2 text-center ${calculationMode === 'bill' ? 'bg-[#159600] text-white' : 'bg-slate-200 text-slate-500'}`}>AVG. MONTHLY BILL (₹)</button><button type="button" onClick={() => setCalculationMode('units')} className={`flex min-h-14 items-center justify-center whitespace-nowrap px-2 text-center ${calculationMode === 'units' ? 'bg-[#159600] text-white' : 'bg-slate-200 text-slate-500'}`}>AVG. MONTHLY UNITS (KW)</button></div>
            <form onSubmit={validateAndSubmit} className="border-x border-b border-[#8bd35c] px-3 py-2" noValidate><div className="grid grid-cols-2 items-start gap-3"><label className="block text-[10px] font-medium leading-tight">{calculationMode === 'bill' ? <>AVERAGE MONTHLY<br />ELECTRICITY BILL (₹)</> : <>AVERAGE MONTHLY<br />CONSUMED (KW)</>}<span className="relative mt-1 block"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm">{calculationMode === 'bill' ? '₹' : 'KWh'}</span><input value={form.bill} onChange={(event) => updateField('bill', event.target.value.replace(/\D/g, ''))} className={`h-10 w-full rounded-lg border pl-6 pr-8 text-sm outline-none focus:border-[#159600] ${errors.bill ? 'border-red-500' : 'border-slate-400'}`} inputMode="numeric" aria-invalid={Boolean(errors.bill)} onBlur={(event) => validateField('bill', event.target.value)} /><span className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col"><button type="button" aria-label={calculationMode === 'bill' ? 'Increase monthly bill' : 'Increase monthly units'} className="h-4 px-1 text-[10px] leading-none" onClick={() => updateField('bill', String(Number(form.bill || 0) + 100))}>▲</button><button type="button" aria-label={calculationMode === 'bill' ? 'Decrease monthly bill' : 'Decrease monthly units'} className="h-4 px-1 text-[10px] leading-none" onClick={() => updateField('bill', String(Math.max(0, Number(form.bill || 0) - 100)))}>▼</button></span></span>{errors.bill && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.bill}</span>}</label><label className="block text-[10px] font-medium leading-tight">CONNECTION<br />CATEGORY<select value={form.category} onChange={(event) => updateField('category', event.target.value)} onBlur={(event) => validateField('category', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:border-[#159600] ${errors.category ? 'border-red-500' : 'border-slate-400'}`} aria-invalid={Boolean(errors.category)}><option value="">Select</option><option value="domestic">Domestic</option><option value="commercial">Commercial</option></select>{errors.category && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.category}</span>}</label></div><p className="mt-1 whitespace-nowrap pt-0 text-[7px] leading-none tracking-[-0.03em] text-slate-500">Tip: If your KSEB bill is bi-monthly, divide the bill amount by 2 to get your monthly average.</p><div className="mt-3 border-t border-slate-200 pt-3"><div className="space-y-3"><label className="block text-[10px] font-medium">FULL NAME<input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} onBlur={(event) => validateField('fullName', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-400 px-2 text-sm outline-none focus:border-[#159600]" aria-invalid={Boolean(errors.fullName)} />{errors.fullName && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.fullName}</span>}</label><label className="block text-[10px] font-medium">PHONE NUMBER<input value={form.phone} onChange={(event) => updateField('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 h-10 w-full rounded-lg border border-slate-400 px-2 text-sm outline-none focus:border-[#159600]" inputMode="numeric" maxLength={10} aria-invalid={Boolean(errors.phone)} onBlur={(event) => validateField('phone', event.target.value)} />{errors.phone && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.phone}</span>}</label><div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-medium">DISTRICT<select value={form.district} onChange={(event) => updateField('district', event.target.value)} onBlur={(event) => validateField('district', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:border-[#159600] ${errors.district ? 'border-red-500' : 'border-slate-400'}`} aria-invalid={Boolean(errors.district)}><option value="">Select district</option>{keralaDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select>{errors.district && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.district}</span>}</label><label className="block text-[10px] font-medium">AREA<input value={form.area} onChange={(event) => updateField('area', event.target.value)} onBlur={(event) => validateField('area', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-400 px-2 text-sm outline-none focus:border-[#159600]" aria-invalid={Boolean(errors.area)} />{errors.area && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.area}</span>}</label></div><button type="submit" className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white shadow-none transition-transform hover:scale-[1.01]">SUBMIT</button></div></div></form>
          </section>
        </div>
      )}
    </main>
  )
}

