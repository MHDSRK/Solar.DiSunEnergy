'use client'

import { useEffect, useMemo, useState } from 'react'

type Lead = Record<string, any>

const fmt = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value)
const dateFmt = (value: unknown) => value ? new Date(String(value)).toLocaleString('en-IN') : '—'

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState({ total: 0, contact: 0, calculated: 0, feasibility: 0 })
  const [selected, setSelected] = useState<string[]>([])
  const [detail, setDetail] = useState<Lead | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [retrying, setRetrying] = useState('')

  const load = async () => {
    setBusy(true); setMessage('')
    const response = await fetch('/api/admin/leads', { cache: 'no-store' })
    if (response.status === 401) { setAuthenticated(false); setBusy(false); return }
    const data = await response.json()
    setLeads(data.leads ?? []); setStats(data.stats ?? stats); setSelected([])
    setAuthenticated(true); setBusy(false)
  }

  useEffect(() => { fetch('/api/admin/session').then(r => { setAuthenticated(r.ok); if (r.ok) load() }) }, [])

  const allSelected = leads.length > 0 && selected.length === leads.length
  const selectedCount = selected.length
  const toggleAll = () => setSelected(allSelected ? [] : leads.map(x => x.lead_id))
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])

  const deleteSelected = async () => {
    if (!selectedCount) return
    if (!window.confirm(`Delete ${selectedCount} selected lead(s)? This cannot be undone.`)) return
    setBusy(true)
    const r = await fetch('/api/admin/leads', { method: 'DELETE', headers: {'content-type':'application/json'}, body: JSON.stringify({ leadIds: selected }) })
    const d = await r.json()
    setMessage(d.message ?? (r.ok ? 'Selected leads deleted.' : 'Delete failed.'))
    await load()
  }

  const deleteAll = async () => {
    const confirmation = window.prompt('This permanently deletes ALL leads. Type DELETE ALL to continue.')
    if (confirmation !== 'DELETE ALL') return
    setBusy(true)
    const r = await fetch('/api/admin/leads', { method: 'DELETE', headers: {'content-type':'application/json'}, body: JSON.stringify({ all: true, confirmation }) })
    const d = await r.json()
    setMessage(d.message ?? (r.ok ? 'All leads deleted.' : 'Delete failed.'))
    await load()
  }

  const deleteOne = async () => {
    if (!detail) return
    if (!window.confirm(`Delete lead ${detail.lead_id}? This cannot be undone.`)) return
    setBusy(true)
    const r = await fetch('/api/admin/leads', { method: 'DELETE', headers: {'content-type':'application/json'}, body: JSON.stringify({ leadIds: [detail.lead_id] }) })
    const d = await r.json()
    setDetail(null); setMessage(d.message ?? (r.ok ? 'Lead deleted.' : 'Delete failed.')); await load()
  }

  const retryNotification = async (leadId: string, event: string) => {
    setRetrying(leadId + ':' + event)
    try {
      const response = await fetch('/api/admin/notifications/retry', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ leadId, event }) })
      const data = await response.json().catch(() => ({}))
      setMessage(data.message ?? (response.ok ? 'Notification retry completed.' : 'Notification retry failed.'))
      await load()
      if (detail?.lead_id === leadId) setDetail((current) => current ? leads.find((lead) => lead.lead_id === leadId) ?? current : current)
    } finally { setRetrying('') }
  }

  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); setAuthenticated(false); setLeads([]); setDetail(null) }

  if (authenticated === null) return <div className="min-h-dvh bg-[#03132f] grid place-items-center text-white">Loading…</div>

  if (!authenticated) return (
    <main className="min-h-dvh bg-[#03132f] grid place-items-center p-5">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-[#071528] shadow-[0_12px_32px_rgba(0,0,0,.28)]">
        <div className="mx-auto h-12 w-16 overflow-hidden rounded-xl bg-white"><img src={`https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg`} alt="DiSun" className="h-full w-full object-cover" /></div>
        <h1 className="mt-5 text-center text-2xl font-extrabold">ADMIN LOGIN</h1>
        <p className="mt-1 text-center text-[10px] text-slate-500">DiSun Energy International</p>
        <form className="mt-6 space-y-3" onSubmit={async e => { e.preventDefault(); setLoginError(''); const r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})}); const d=await r.json(); if(!r.ok){setLoginError(d.message||'Login failed.');return} setAuthenticated(true); await load() }}>
          <label className="block text-[10px] font-medium">EMAIL<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" className="mt-1 h-10 w-full rounded-lg border border-slate-400 px-2 text-sm outline-none focus:border-[#159600]" /></label>
          <label className="block text-[10px] font-medium">PASSWORD<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-1 h-10 w-full rounded-lg border border-slate-400 px-2 text-sm outline-none focus:border-[#159600]" /></label>
          {loginError && <p className="text-[9px] text-red-600">{loginError}</p>}
          <button className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-[#1260a4] text-sm font-extrabold tracking-[.08em] text-white">LOGIN</button>
        </form>
      </div>
    </main>
  )

  return (
    <main className="min-h-dvh bg-[#03132f] p-4 text-[#071528] sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(0,0,0,.2)]">
          <div><h1 className="text-xl font-extrabold text-[#1260a4]">DiSun ADMIN</h1><p className="text-[10px] text-slate-500">Lead Management</p></div>
          <div className="flex gap-2"><button onClick={load} className="rounded-full border-2 border-[#1260a4] px-4 py-2 text-xs font-extrabold text-[#1260a4]">REFRESH</button><button onClick={logout} className="rounded-full bg-[#1260a4] px-4 py-2 text-xs font-extrabold text-white">LOGOUT</button></div>
        </header>
        {message && <div className="mb-4 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#1260a4]">{message}</div>}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[stats.total,'TOTAL LEADS'],[stats.contact,'CONTACT DETAILS'],[stats.calculated,'CALCULATED LEADS'],[stats.feasibility,'FEASIBILITY CHECKED']].map(([n,l])=><div key={String(l)} className="rounded-2xl bg-white p-4 shadow-[0_6px_18px_rgba(0,0,0,.12)]"><p className="text-2xl font-extrabold text-[#1260a4]">{n}</p><p className="mt-1 text-[9px] font-bold tracking-wide text-slate-500">{l}</p></div>)}
        </section>
        <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,.15)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select All</label>
            <div className="flex gap-2"><button disabled={!selectedCount} onClick={deleteSelected} className="rounded-full border border-red-500 px-3 py-2 text-[10px] font-extrabold text-red-600 disabled:opacity-40">🗑 DELETE SELECTED ({selectedCount})</button><button onClick={deleteAll} className="rounded-full bg-red-600 px-3 py-2 text-[10px] font-extrabold text-white">🗑 DELETE ALL</button></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-[#f2f7fb] text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="p-3"></th><th className="p-3">Date/Time</th><th className="p-3">Lead ID</th><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">District</th><th className="p-3">Category</th><th className="p-3">Consumption</th><th className="p-3">Solar</th><th className="p-3">Transformer</th><th className="p-3">Status</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.lead_id} onClick={()=>setDetail(lead)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="p-3" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.includes(lead.lead_id)} onChange={()=>toggle(lead.lead_id)} /></td><td className="p-3">{dateFmt(lead.created_at)}</td><td className="p-3 font-bold text-[#1260a4]">{lead.lead_id}</td><td className="p-3">{fmt(lead.name)}</td><td className="p-3">{fmt(lead.phone)}</td><td className="p-3">{fmt(lead.district)}</td><td className="p-3">{fmt(lead.connection_category)}</td><td className="p-3">{lead.monthly_kwh !== null ? `${lead.monthly_kwh} kWh` : lead.bill !== null ? `₹ ${lead.bill}` : '—'}</td><td className="p-3">{lead.recommended_kw !== null ? `${lead.recommended_kw} kW` : '—'}</td><td className="p-3">{fmt(lead.transformer)}</td><td className="p-3 font-semibold">{fmt(lead.lead_status ?? (lead.feasibility_status ?? (lead.recommended_kw !== null ? 'CALCULATED' : 'NEW')))}</td></tr>)}</tbody></table>
          </div>
          {!leads.length && <div className="p-10 text-center text-sm text-slate-500">{busy ? 'Loading…' : 'No leads yet.'}</div>}
        </section>
        {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#03132f]/70 p-4" onClick={()=>setDetail(null)}><aside className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 text-[#071528] shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold text-[#1260a4]">{detail.lead_id}</h2><button onClick={()=>setDetail(null)} className="text-3xl font-light">×</button></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs">{Object.entries(detail).filter(([key])=>key !== 'documents' && key !== 'site_visit' && key !== 'notifications').map(([key,value])=><div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-[8px] font-bold uppercase text-slate-400">{key.replaceAll('_',' ')}</p><p className="mt-1 break-words font-semibold">{fmt(value)}</p></div>)}</div>{Array.isArray(detail.documents) && detail.documents.length > 0 && <section className="mt-4 rounded-2xl border border-slate-200 p-3"><h3 className="text-xs font-extrabold text-[#1260a4]">ELIGIBILITY DOCUMENTS</h3><div className="mt-2 grid gap-2">{detail.documents.map((doc: any)=><a key={doc.document_type} href={'/api/admin/documents?leadId='+encodeURIComponent(detail.lead_id)+'&documentType='+encodeURIComponent(doc.document_type)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold"><span>{doc.document_type.toUpperCase()} — {doc.file_name}</span><span className="text-[#1260a4]">VIEW</span></a>)}</div></section>}{Array.isArray(detail.notifications) && detail.notifications.length > 0 && <section className="mt-4 rounded-2xl border border-slate-200 p-3"><h3 className="text-xs font-extrabold text-[#1260a4]">NOTIFICATIONS</h3><div className="mt-2 grid gap-2">{detail.notifications.map((notification: any)=><div key={notification.event_key+'-'+notification.channel} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px]"><div><p className="font-bold">{notification.channel}</p><p className="text-slate-500">{notification.event_key.split(':').slice(1).join(':')} · {notification.status} · {notification.attempts} attempt(s)</p>{notification.last_error && <p className="mt-1 text-red-600">{notification.last_error}</p>}</div>{notification.status !== 'SENT' && <button disabled={retrying===detail.lead_id+':'+notification.event_key.split(':').slice(1).join(':').toLowerCase()} onClick={()=>retryNotification(detail.lead_id, notification.event_key.split(':').slice(1).join(':').toLowerCase())} className="shrink-0 rounded-full border border-[#1260a4] px-3 py-1 font-bold text-[#1260a4] disabled:opacity-50">RETRY</button>}</div>)}</div></section>}{detail.site_visit && <section className="mt-4 rounded-2xl border border-slate-200 p-3"><h3 className="text-xs font-extrabold text-[#1260a4]">SITE VISIT</h3><div className="mt-2 grid grid-cols-2 gap-2 text-xs">{Object.entries(detail.site_visit).filter(([key])=>key !== 'lead_id').map(([key,value])=><div key={key} className="rounded-xl bg-slate-50 p-2"><p className="text-[8px] font-bold uppercase text-slate-400">{key.replaceAll('_',' ')}</p><p className="mt-1 break-words font-semibold">{fmt(value)}</p></div>)}</div></section>}<button onClick={deleteOne} className="mt-5 w-full rounded-full bg-red-600 py-3 text-xs font-extrabold text-white">🗑 DELETE LEAD</button></aside></div>}
      </div>
    </main>
  )
}
