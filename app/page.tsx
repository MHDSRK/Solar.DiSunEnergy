'use client'

import { useState } from 'react'

// Saved design assets for the next page iteration.
export const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
export const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

  return (
    <main className="relative min-h-dvh overflow-y-auto bg-[#03132f] text-white" aria-label="DiSun Energy International solar calculator">
      <div className="fixed inset-0 bg-[#03132f] bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: `url(${floorImage})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,47,.08)_0%,rgba(3,19,47,.08)_48%,rgba(3,19,47,.18)_100%)]" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-30 flex h-[64px] items-center justify-between rounded-b-[24px] bg-white px-5 pt-1 shadow-[0_8px_20px_rgba(0,0,0,.24)] sm:px-8">
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
        <div className="fixed inset-0 z-50 flex items-end bg-[#03132f]/45 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="calculator-title">
          <button type="button" aria-label="Close calculator" className="absolute inset-0 cursor-default" onClick={() => setIsCalculatorOpen(false)} />
          <section className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[34px] bg-white px-5 pb-10 pt-5 text-[#071528] shadow-[0_-12px_32px_rgba(0,0,0,.28)] animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-400">1 / 4</span><button type="button" onClick={() => setIsCalculatorOpen(false)} aria-label="Close calculator" className="grid size-11 place-items-center text-3xl font-light">×</button></div>
            <h2 id="calculator-title" className="mt-3 text-center text-3xl font-extrabold leading-[1.05] tracking-[-.04em]">SUBSIDY &amp; SAVINGS<br />CALCULATOR</h2>
            <p className="mt-12 text-center text-xl font-bold">CALCULATION BASED ON</p>
            <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-t-2xl border border-slate-300 text-sm font-bold"><div className="bg-[#159600] px-3 py-5 text-center text-white">AVG. MONTHLY BILL (₹)</div><div className="bg-slate-200 px-3 py-5 text-center text-slate-500">AVG. MONTHLY UNITS (KWH)</div></div>
            <div className="space-y-5 border-x border-b border-[#8bd35c] px-4 py-6"><label className="block text-xs font-medium">AVERAGE MONTHLY ELECTRICITY BILL (₹)<input className="mt-2 h-14 w-full rounded-xl border-2 border-slate-400 px-3 text-base outline-none focus:border-[#159600]" inputMode="numeric" /></label><label className="block text-xs font-medium">CONNECTION CATEGORY<input className="mt-2 h-14 w-full rounded-xl border-2 border-slate-400 px-3 text-base outline-none focus:border-[#159600]" /></label><p className="border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">Tip: If your KSEB bill is bi-monthly, divide the bill amount by 2 to get your monthly average.</p><div className="grid grid-cols-2 gap-4"><label className="block text-xs font-medium">FULL NAME<input className="mt-2 h-14 w-full rounded-xl border-2 border-slate-400 px-3 text-base outline-none focus:border-[#159600]" /></label><label className="block text-xs font-medium">PHONE NUMBER<input className="mt-2 h-14 w-full rounded-xl border-2 border-slate-400 px-3 text-base outline-none focus:border-[#159600]" inputMode="tel" /></label></div></div>
          </section>
        </div>
      )}
    </main>
  )
}

