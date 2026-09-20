'use client'

import { useState } from 'react'

// Saved design assets for the next page iteration.
export const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
export const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  const [scrollProgress, setScrollProgress] = useState(0)

  return (
    <main className="relative min-h-dvh overflow-y-auto bg-[#03132f] text-white" aria-label="DiSun Energy International solar calculator" onScroll={(event) => setScrollProgress(Math.min(1, event.currentTarget.scrollTop / 150))}>
      <div className="absolute inset-0 bg-[#03132f] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${floorImage})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,47,.08)_0%,rgba(3,19,47,.08)_48%,rgba(3,19,47,.18)_100%)]" aria-hidden="true" />

      <header className="sticky top-0 z-20 flex h-[64px] origin-top items-center justify-between rounded-b-[24px] bg-white px-5 pt-1 shadow-[0_8px_20px_rgba(0,0,0,.24)] transition-[height,transform] duration-0 sm:px-8" style={{ height: `${64 - scrollProgress * 20}px`, transform: `scale(${1 - scrollProgress * 0.08})`, transformOrigin: 'top center' }}>
        <a href="#top" aria-label="DiSun Energy International home" className="h-10 w-14 origin-left overflow-hidden rounded-lg bg-white transition-transform duration-75" style={{ transform: `scale(${1 - scrollProgress * 0.18})` }}><img src={markImage} alt="DiSun Energy International logo" className="h-full w-full object-cover object-center" /></a>
        <div className="flex origin-right items-center gap-4 text-[#1260a4] transition-transform duration-75" style={{ transform: `scale(${1 - scrollProgress * 0.18})` }} aria-label="Social links">
          <a href="#facebook" aria-label="Facebook" className="grid size-8 place-items-center rounded-full bg-[#1260a4] text-white transition-transform hover:scale-110"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H8v3.1h2.4v8h3.1Z" /></svg></a>
          <a href="#instagram" aria-label="Instagram" className="grid size-8 place-items-center rounded-full bg-white text-[#1260a4] transition-transform hover:scale-110"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" className="fill-current stroke-none" /></svg></a>
        </div>
      </header>

      <section id="top" className="relative z-10 mx-auto flex min-h-[calc(100dvh-64px)] max-w-xl flex-col px-5 pb-6 pt-20 text-center sm:pt-24">
        <p className="text-[15px] font-semibold tracking-[0.04em] text-white sm:text-lg">DiSun Energy International</p>
        <h1 className="mt-8 text-[31px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-5xl">POWER YOUR FUTURE<br /><span className="text-[43px] text-[#79d52a] sm:text-6xl">WITH SOLAR</span></h1>
        <p className="mx-auto mt-5 max-w-[320px] text-[13px] leading-[1.45] text-white sm:text-base">Calculate your savings, check eligibility and take the next step towards <strong>Powerful future with SOLAR.</strong></p>
        <dl className="mx-auto mt-10 grid w-full max-w-[370px] grid-cols-3 divide-x divide-white/35"><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Up to<br /><span className="text-xl sm:text-2xl">₹ 78000</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">PM SURYA GHAR<br />SUBSIDY</dt></div><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Up to<br /><span className="text-xl sm:text-2xl">₹ 200000</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">BANK LOAN<br />AVAILABLE</dt></div><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Panels with<br /><span className="text-xl sm:text-2xl">30 YEARS</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">WARRANTY<br />ASSURANCE</dt></div></dl>
        <div className="mt-auto pt-12"><p className="mb-4 text-[14px] font-bold uppercase tracking-[0.02em] sm:text-lg">HOW MUCH POWER NEED TO MY HOME?</p><a href="#calculate" className="mx-auto flex min-h-12 max-w-[245px] items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold tracking-[0.06em] text-[#06152d] shadow-[0_5px_18px_rgba(255,255,255,.18)] transition-transform hover:scale-[1.03]">CALCULATE NOW <span className="ml-2 text-[#2e8dbe]">&gt;</span></a><p className="mt-5 text-[10px] text-white/90">By continuing, you agree to our <a className="underline" href="#privacy">Privacy policy</a> and <a className="underline" href="#terms">Terms&amp;Conditions</a></p></div>
      </section>
      <div className="relative z-10 h-28 bg-[#03132f]" aria-hidden="true" />
    </main>
  )
}

