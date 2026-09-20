const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#02122d] text-white">
      <section className="relative min-h-[715px] bg-[#02122d]">
        <div className="absolute inset-x-0 bottom-0 h-[57%] bg-cover bg-bottom" style={{ backgroundImage: `url(${floorImage})` }} aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#02122d_0%,#02122d_43%,rgba(2,18,45,.72)_69%,rgba(2,18,45,.2)_100%)]" aria-hidden="true" />
        <header className="relative z-10 flex h-[59px] items-center justify-between rounded-b-[22px] bg-white px-4 shadow-[0_8px_18px_rgba(0,0,0,.2)]">
          <a href="#top" aria-label="Solar home" className="h-9 w-12 overflow-hidden rounded-md"><img src={markImage} alt="Solar company logo" className="h-full w-full object-cover object-center" /></a>
          <div className="flex items-center gap-3 text-[#1260a4]" aria-label="Social links"><a href="#facebook" aria-label="Facebook" className="grid size-5 place-items-center rounded-full bg-[#1765a5] text-sm font-bold text-white">f</a><a href="#instagram" aria-label="Instagram" className="grid size-5 place-items-center rounded-md border-2 border-[#1765a5] text-[11px] font-bold">◎</a></div>
        </header>
        <div id="top" className="relative z-10 flex flex-col items-center px-6 pt-[101px] text-center">
          <h1 className="text-[25px] font-extrabold leading-[1.08] tracking-[-.04em] sm:text-4xl">POWER YOUR FUTURE<br /><span className="text-[40px] text-[#7bd52b] sm:text-6xl">WITH SOLAR</span></h1>
          <p className="mt-3 max-w-[250px] text-[12px] font-medium leading-[1.35] text-white">Calculate your savings, check eligibility<br />and take the next step towards<br /><strong>Powerful future with SOLAR.</strong></p>
          <p className="mt-[82px] text-[12px] font-bold tracking-wide text-white">GO SOLAR <span className="text-[#76ce30]">|</span> GENERATE POWER <span className="text-[#76ce30]">|</span> REDUCE BILLS</p>
        </div>
        <div className="absolute bottom-[-1px] left-0 right-0 z-20 rounded-t-[23px] bg-white px-5 pb-8 pt-5 text-center text-[#071528] shadow-[0_-5px_18px_rgba(0,0,0,.22)]">
          <a href="#book" className="inline-flex min-h-[51px] items-center rounded-full border-[3px] border-[#0a1b2f] bg-[#071528] px-6 text-[18px] font-extrabold text-white shadow-[inset_0_0_0_2px_white]">GET STARTED <span className="ml-2 text-[#73c934]">&gt;</span></a>
          <p className="mt-5 text-[10px] font-medium">By continuing, you agree to our <a className="text-[#315477] underline" href="#privacy">Privacy policy</a> and <a className="text-[#315477] underline" href="#terms">Terms&amp;Conditions</a></p>
        </div>
      </section>
      <section id="book" className="bg-white px-0 pb-8 pt-8"><div className="mx-auto flex max-w-[390px] items-center gap-3 rounded-t-[17px] border border-[#d9dde5] bg-white px-8 py-4 text-[#182433] shadow-[0_-5px_13px_rgba(0,0,0,.25)]"><span className="text-3xl text-[#e7bf2e]">☀</span><div className="flex-1"><h2 className="text-[14px] font-bold">Ready to Go Solar?</h2><p className="text-[10px] text-[#555]">Book your free site visit Now</p></div><a href="mailto:hello@solar.com" className="rounded-full border-2 border-[#62a82a] bg-[#36a21d] px-3 py-2 text-[10px] font-bold text-white shadow-[inset_0_0_0_2px_white]">BOOK VISIT &gt;</a></div></section>
    </main>
  )
}

