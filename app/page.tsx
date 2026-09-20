const floorImage =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
const markImage =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020f25] text-white">
      <section className="relative flex min-h-screen flex-col">
        <div
          className="absolute inset-0 bg-cover bg-bottom bg-no-repeat"
          style={{ backgroundImage: `url(${floorImage})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#020f25_0%,rgba(2,15,37,.92)_44%,rgba(2,15,37,.38)_100%)]" aria-hidden="true" />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
          <a href="#top" className="flex items-center gap-3" aria-label="Nexora home">
            <span className="grid size-9 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-sm font-bold text-cyan-200">N</span>
            <span className="text-sm font-semibold uppercase tracking-[0.24em]">Nexora</span>
          </a>
          <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.2em] text-slate-300 sm:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-cyan-200" href="#mission">Mission</a>
            <a className="transition-colors hover:text-cyan-200" href="#contact">Contact</a>
          </nav>
          <a href="#contact" className="rounded-full border border-cyan-200/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-200 hover:text-[#020f25]">Connect</a>
        </header>

        <div id="top" className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-12 text-center sm:pb-40">
          <div className="mb-8 w-48 overflow-hidden rounded-2xl border border-white/25 bg-white shadow-[0_0_50px_rgba(43,151,255,.2)] sm:w-60">
            <img src={markImage} alt="Nexora geometric hexagon mark" className="block h-auto w-full" />
          </div>
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.38em] text-cyan-200">The next connected frontier</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.96] tracking-[-0.06em] text-white sm:text-7xl">Build what&apos;s<br /><span className="text-cyan-300">next.</span></h1>
          <p className="mt-7 max-w-md text-base leading-7 text-slate-300 sm:text-lg">A new space for bold ideas, intelligent systems, and the people shaping tomorrow.</p>
          <a href="#mission" className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-300 px-7 text-sm font-bold uppercase tracking-[0.16em] text-[#021126] transition-transform hover:scale-105">Explore Nexora</a>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 px-5 py-5 text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:px-10">
          <span>01 / 03</span><span className="hidden sm:inline">Intelligence · Design · Motion</span><span>Scroll to discover ↓</span>
        </div>
      </section>

      <section id="mission" className="relative z-10 mx-auto max-w-5xl px-6 py-24 sm:px-10 sm:py-32">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Our mission</p>
        <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-white sm:text-5xl">Turning complex systems into clear, human experiences.</h2>
        <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400">Nexora is a studio for the future-minded. We bring strategy, technology, and visual thinking together to make ambitious work feel inevitable.</p>
      </section>

      <footer id="contact" className="border-t border-white/10 px-6 py-8 text-sm text-slate-400 sm:px-10"><div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-white">NEXORA / 2026</span><a href="mailto:hello@nexora.studio" className="transition-colors hover:text-cyan-200">hello@nexora.studio</a></div></footer>
    </main>
  )
}

