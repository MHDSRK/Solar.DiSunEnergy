'use client'

import { useEffect, useState } from 'react'

type Report = { funnel: Array<{status:string; source:string; count:number}>; payments: Array<{recorded_by_name:string; collected:string; entries:number}>; stages: Array<{stage:string; leads:number}> }

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { fetch('/api/admin/reports').then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load reports'); setReport(data) }).catch(error => setError(error.message)) }, [])
  if (error) return <main className="grid min-h-dvh place-items-center bg-[#03132f] p-5 text-white">{error}</main>
  if (!report) return <main className="grid min-h-dvh place-items-center bg-[#03132f] text-white">Loading reports…</main>
  return <main className="min-h-dvh bg-[#03132f] p-4 text-[#071528] sm:p-6"><div className="mx-auto max-w-4xl"><header className="mb-4 rounded-[24px] bg-white p-5"><a href="/admin" className="text-xs font-bold text-[#1260a4]">← Admin</a><h1 className="mt-3 text-2xl font-extrabold text-[#1260a4]">Reports</h1><p className="text-xs text-slate-500">Funnel, collections, and project stage overview</p></header><div className="grid gap-4 md:grid-cols-3"><section className="rounded-2xl bg-white p-4"><h2 className="font-extrabold text-[#1260a4]">Funnel</h2><div className="mt-3 grid gap-2">{report.funnel.map(item => <div className="flex justify-between rounded-lg bg-slate-50 p-2 text-xs" key={`${item.status}-${item.source}`}><span>{item.status} · {item.source}</span><b>{item.count}</b></div>)}</div></section><section className="rounded-2xl bg-white p-4"><h2 className="font-extrabold text-[#1260a4]">Payments</h2><div className="mt-3 grid gap-2">{report.payments.map(item => <div className="rounded-lg bg-slate-50 p-2 text-xs" key={item.recorded_by_name}><div className="font-semibold">{item.recorded_by_name}</div><div>₹ {item.collected} · {item.entries} entries</div></div>)}</div></section><section className="rounded-2xl bg-white p-4"><h2 className="font-extrabold text-[#1260a4]">Project stages</h2><div className="mt-3 grid gap-2">{report.stages.map(item => <div className="flex justify-between rounded-lg bg-slate-50 p-2 text-xs" key={item.stage}><span>{item.stage.replaceAll('_', ' ')}</span><b>{item.leads}</b></div>)}</div></section></div></div></main>
}
