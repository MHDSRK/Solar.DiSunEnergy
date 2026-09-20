// Saved design assets for the next page iteration.
export const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
export const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050607] text-[#f5f5f2]" aria-label="Solar and battery plan">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_45%,rgba(23,111,89,.2),transparent_34%),linear-gradient(180deg,#050607_0%,#080a0b_100%)]" aria-hidden="true" />
      <div className="absolute inset-x-[-25%] bottom-[-8%] h-[60%] opacity-35 mix-blend-screen" style={{ backgroundImage: `url(${floorImage})`, backgroundPosition: 'center bottom', backgroundSize: 'cover' }} aria-hidden="true" />
      <header className="relative z-10 flex h-14 items-center justify-between border-b border-white/15 px-5 text-white sm:px-8">
        <button type="button" aria-label="Switch to light mode" className="grid size-8 place-items-center text-xl text-white/85">☼</button>
        <a href="#top" aria-label="currentundo home" className="text-[16px] font-medium tracking-tight"><span className="text-red-500">⚡</span> currentundo?</a>
        <div className="flex items-center gap-5"><button type="button" className="text-[9px] text-white/80">EN</button><button type="button" aria-label="Refresh page" className="text-xl text-white/85">↻</button></div>
      </header>
      <section id="top" className="relative z-10 mx-auto flex min-h-[calc(100dvh-56px)] max-w-xl flex-col px-5 pb-7 pt-28 text-center sm:pt-32">
        <p className="text-[10px] font-semibold tracking-[0.32em] text-white/55">CURRENTUNDO ENERGY</p>
        <h1 className="mt-5 text-[39px] font-medium leading-none tracking-[-0.06em] sm:text-6xl">Solar &amp; Battery</h1>
        <p className="mx-auto mt-6 max-w-[350px] text-[16px] leading-[1.75] text-white/70 sm:text-lg">Power your Kerala home with rooftop solar and battery backup. Get a right-sized, non-binding plan in minutes — then a partner survey before any final quote.</p>
        <dl className="mx-auto mt-10 grid w-full max-w-[370px] grid-cols-3 divide-x divide-white/15"><div className="px-2"><dd className="text-[17px] font-semibold">Right-sized</dd><dt className="mt-2 text-[10px] leading-[1.5] tracking-[0.13em] text-white/55">SYSTEM &amp;<br />BATTERY</dt></div><div className="px-2"><dd className="text-[17px] font-semibold">Up to ₹78,000</dd><dt className="mt-2 text-[10px] leading-[1.5] tracking-[0.13em] text-white/55">PM SURYA GHAR<br />SUBSIDY</dt></div><div className="px-2"><dd className="text-[17px] font-semibold">No deposit</dd><dt className="mt-2 text-[10px] leading-[1.5] tracking-[0.13em] text-white/55">FREE ESTIMATE</dt></div></dl>
        <div className="mt-auto pt-16"><div className="mx-auto mb-7 flex items-center justify-center gap-10 text-2xl font-semibold tracking-[-0.08em] text-white/80"><span>adani</span><span className="h-7 w-px bg-white/20" /><span className="tracking-[-0.12em]">Deye</span></div><a href="#order" className="flex min-h-12 items-center justify-center rounded-full bg-white text-xs font-semibold tracking-[0.13em] text-[#101112] transition-transform hover:scale-[1.02]">ORDER NOW</a><a href="#feasibility" className="mt-4 block text-[13px] text-white/80 underline-offset-4 hover:underline">Check KSEB solar feasibility</a><p className="mt-6 text-[10px] text-white/45">No commitment · KSEB &amp; PM Surya Ghar guidance · Kerala only</p></div>
      </section>
    </main>
  )
}

