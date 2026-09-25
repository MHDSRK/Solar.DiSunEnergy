'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3, History, Plus, Trash2, X, Check, ChevronDown, CalendarDays } from 'lucide-react'

type Row = Record<string, any>

const STAGES = ['SITE_SURVEY','MATERIAL_ORDERED','INSTALLATION_STARTED','INSTALLATION_COMPLETE','NET_METER_APPLIED','COMMISSIONED']

const dt = (v: any) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const dateOnly = (v: any) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const stageLabel = (v: string) => String(v || 'SITE_SURVEY').replaceAll('_', ' ').replace(/\\b\\w/g, x => x.toUpperCase())

export default function Admin() {
  const [session, setSession] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [leads, setLeads] = useState<Row[]>([])
  const [audit, setAudit] = useState<Row[]>([])
  const [followups, setFollowups] = useState<Row[]>([])
  const [payments, setPayments] = useState<Row[]>([])
  const [stages, setStages] = useState<Row[]>([])
  const [tab, setTab] = useState<'SCHEDULE'|'LEADS'|'FOLLOWUPS'>('LEADS')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [stageLead, setStageLead] = useState<string | null>(null)
  const [customStageOpen, setCustomStageOpen] = useState(false)
  const [customStage, setCustomStage] = useState('')
  const [form, setForm] = useState({
    name:'', phone:'', district:'', area:'', bill:'', monthly_kwh:'',
    connection_category:'Domestic', recommended_kw:''
  })

  const load = async () => {
    const r = await fetch('/api/admin/leads', { cache:'no-store' })
    const d = await r.json()
    if (r.ok) {
      setLeads(d.leads || [])
      setAudit(d.audit || [])
      setFollowups(d.followups || [])
      setPayments(d.payments || [])
      setStages(d.stages || [])
    }
  }

  useEffect(() => {
    fetch('/api/admin/session').then(async r => {
      const d = await r.json()
      setSession(d)
      if (d.authenticated) load()
    })
  }, [])

  const login = async (e:any) => {
    e.preventDefault()
    setErr('')
    const r = await fetch('/api/admin/login', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ password })
    })
    const d = await r.json()
    if (!r.ok) { setErr(d.message || 'Login failed'); return }
    setSession(d)
    setPassword('')
    load()
  }

  const stageNames = useMemo(() => {
    const custom = stages.map(x => String(x.stage || '')).filter(Boolean)
    return [...new Set([...STAGES, ...custom])]
  }, [stages])

  const currentStage = (leadId:string) => {
    const rows = stages.filter(x => x.lead_id === leadId).sort((a,b) => new Date(a.stage_at).getTime() - new Date(b.stage_at).getTime())
    return rows.at(-1)?.stage || 'SITE_SURVEY'
  }

  const paid = (leadId:string) => payments.filter(p => p.lead_id === leadId).reduce((n,p) => n + Number(p.amount || 0), 0)

  const toggleSelect = (id:string) => setSelectedIds(x => x.includes(id) ? x.filter(y => y !== id) : [...x, id])
  const allSelected = leads.length > 0 && selectedIds.length === leads.length
  const toggleAll = () => setSelectedIds(allSelected ? [] : leads.map(x => String(x.lead_id)))

  const deleteSelected = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Delete ${selectedIds.length} selected lead(s)? This cannot be undone.`)) return
    const r = await fetch('/api/admin/leads', {
      method:'DELETE',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ leadIds:selectedIds })
    })
    const d = await r.json()
    setNotice(d.message || (r.ok ? `${selectedIds.length} lead(s) deleted.` : 'Delete failed.'))
    if (r.ok) {
      setSelectedIds([])
      setDeleteMode(false)
      setExpandedId(null)
      load()
    }
  }

  const create = async (e:any) => {
    e.preventDefault()
    const r = await fetch('/api/admin/leads', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(form)
    })
    const d = await r.json()
    if (!r.ok) { setNotice(d.message || 'Failed to create lead.'); return }
    setNotice('Lead added successfully.')
    setForm({name:'',phone:'',district:'',area:'',bill:'',monthly_kwh:'',connection_category:'Domestic',recommended_kw:''})
    setNewLeadOpen(false)
    setTab('LEADS')
    await load()
  }

  const updateStage = async (leadId:string, stage:string) => {
    const r = await fetch('/api/admin/stages', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ leadId, stage })
    })
    const d = await r.json()
    if (!r.ok) { setNotice(d.message || 'Could not update stage.'); return }
    setStageLead(null)
    setCustomStageOpen(false)
    setCustomStage('')
    await load()
  }

  const addCustomStage = async () => {
    const value = customStage.trim().toUpperCase().replace(/\\s+/g, '_')
    if (!value || !stageLead) return
    await updateStage(stageLead, value)
  }

  const todayFollowups = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0)
    const end = new Date(); end.setHours(23,59,59,999)
    return followups.filter(x => x.status === 'PENDING' && new Date(x.follow_up_at) >= start && new Date(x.follow_up_at) <= end)
  }, [followups])

  if (session === null) return <main className="min-h-dvh grid place-items-center bg-slate-950 text-white">Loading…</main>

  if (!session.authenticated) return (
    <main className="min-h-dvh grid place-items-center bg-slate-950 p-5">
      <form onSubmit={login} className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">DiSun</p>
          <h1 className="mt-1 text-2xl font-black">ADMIN v2</h1>
        </div>
        <input required autoFocus type="password" placeholder="Enter admin password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500" />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button className="mt-4 w-full rounded-2xl bg-sky-600 py-3 font-bold text-white">LOGIN</button>
      </form>
    </main>
  )

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-dvh max-w-5xl">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">DiSun Energy</p>
              <h1 className="text-xl font-black sm:text-2xl">Admin Panel</h1>
              <p className="text-[11px] text-slate-500">Signed in as <b>{session.name}</b></p>
            </div>
            <div className="flex items-center gap-1">
              <button title="History" onClick={()=>setHistoryOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-slate-100"><History size={19}/></button>
              <button title="Delete leads" onClick={()=>{setDeleteMode(x=>!x);setSelectedIds([])}} className={`grid size-10 place-items-center rounded-full ${deleteMode?'bg-red-50 text-red-600':'hover:bg-slate-100'}`}><Trash2 size={19}/></button>
              <button onClick={async()=>{await fetch('/api/admin/logout',{method:'POST'});location.reload()}} className="ml-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white">Logout</button>
            </div>
          </div>

          <nav className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
            {[
              ['SCHEDULE', `Today's Schedule`, todayFollowups.length],
              ['LEADS', 'All Leads', leads.length],
              ['FOLLOWUPS', 'Followups', followups.filter(x=>x.status==='PENDING').length]
            ].map(([key,label,count]) => (
              <button key={String(key)} onClick={()=>setTab(key as any)} className={`rounded-xl px-2 py-2 text-[11px] font-bold sm:text-xs ${tab===key?'bg-white text-sky-700 shadow-sm':'text-slate-500'}`}>
                {label}<span className="ml-1 text-[10px] opacity-60">({count})</span>
              </button>
            ))}
          </nav>
        </header>

        <section className="px-3 py-3 sm:px-6">
          {notice && <div className="mb-3 flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={16}/></button></div>}

          {tab === 'LEADS' && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {deleteMode && <button title="Select all" onClick={toggleAll} className="grid size-9 place-items-center rounded-xl border bg-white">{allSelected?<Check size={17}/>:<span className="text-sm">□</span>}</button>}
                  <div>
                    <h2 className="text-lg font-black">All Leads</h2>
                    <p className="text-xs text-slate-500">{leads.length} total leads</p>
                  </div>
                </div>
                <button onClick={()=>setNewLeadOpen(true)} title="Add new lead" className="grid size-11 place-items-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-200"><Plus size={23}/></button>
              </div>

              {deleteMode && selectedIds.length > 0 && (
                <div className="sticky top-[126px] z-20 mb-3 flex items-center justify-between rounded-2xl bg-red-600 px-4 py-3 text-white shadow-lg">
                  <span className="text-sm font-bold">{selectedIds.length} selected</span>
                  <button onClick={deleteSelected} className="rounded-full bg-white px-4 py-2 text-xs font-black text-red-600">DELETE</button>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-[1fr_1fr_auto] border-b bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-4">
                  <div className="flex items-center gap-2">{deleteMode && <span className="w-8"/>}Name</div>
                  <div>Stage</div>
                  <div className="w-24 text-right">Payment</div>
                </div>

                {leads.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No leads yet.</div>}

                {leads.map(l => {
                  const id = String(l.lead_id)
                  const expanded = expandedId === id
                  const stage = currentStage(id)
                  return (
                    <div key={id} className="border-b last:border-0">
                      <div className="grid min-h-16 grid-cols-[1fr_1fr_auto] items-center gap-2 px-3 py-2 sm:px-4">
                        <div className="flex min-w-0 items-center gap-2">
                          {deleteMode && <input type="checkbox" checked={selectedIds.includes(id)} onChange={()=>toggleSelect(id)} className="size-4 shrink-0 accent-red-600"/>}
                          <button onClick={()=>setExpandedId(expanded?null:id)} className="min-w-0 text-left">
                            <span className="block truncate text-sm font-bold text-slate-900">{l.name || 'Unnamed lead'}</span>
                            <span className="block truncate text-[10px] text-slate-400">{id}</span>
                          </button>
                        </div>

                        <div className="relative">
                          <button onClick={()=>setStageLead(stageLead===id?null:id)} className="flex max-w-full items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-left text-[10px] font-bold text-slate-700">
                            <span className="truncate">{stageLabel(stage)}</span><ChevronDown size={14} className="shrink-0"/>
                          </button>
                          {stageLead===id && (
                            <div className="absolute left-0 top-11 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                              {stageNames.map(s => (
                                <button key={s} onClick={()=>updateStage(id,s)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-50 ${s===stage?'font-black text-sky-700':''}`}>
                                  <span>{stageLabel(s)}</span>{s===stage&&<Check size={14}/>}
                                </button>
                              ))}
                              <button onClick={()=>setCustomStageOpen(true)} className="mt-1 flex w-full items-center gap-2 rounded-xl border-t px-3 py-3 text-xs font-bold text-sky-700"><Plus size={14}/> Add new stage</button>
                              {customStageOpen && (
                                <div className="mt-2 border-t pt-2">
                                  <input autoFocus value={customStage} onChange={e=>setCustomStage(e.target.value)} placeholder="New stage name" className="w-full rounded-xl border px-3 py-2 text-xs"/>
                                  <button onClick={addCustomStage} className="mt-2 w-full rounded-xl bg-sky-600 py-2 text-xs font-bold text-white">ADD STAGE</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="w-24 text-right text-xs font-bold text-slate-800">₹{paid(id).toLocaleString('en-IN')}</div>
                      </div>

                      {expanded && (
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 px-3 pb-3 pt-1 sm:grid-cols-4 sm:px-4">
                          {[
                            ['Phone', l.phone],
                            ['Place', [l.area,l.district].filter(Boolean).join(', ') || '—'],
                            ['Plant needed', l.recommended_kw ? `${l.recommended_kw} kW` : '—'],
                            ['Date', dateOnly(l.created_at)],
                            ['Time', l.created_at ? new Date(l.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'],
                            ['Source', l.source || 'web'],
                            ['Status', l.lead_status || 'NEW'],
                            ['Lead ID', id]
                          ].map(([k,v]) => <div key={String(k)} className="rounded-xl bg-white p-2.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{k}</p><p className="mt-0.5 break-words text-xs font-bold">{String(v ?? '—')}</p></div>)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'SCHEDULE' && <Schedule rows={todayFollowups} leads={leads} reload={load}/>}
          {tab === 'FOLLOWUPS' && <Followups rows={followups} leads={leads} reload={load}/>}
        </section>
      </div>

      {newLeadOpen && <NewLeadModal form={form} setForm={setForm} close={()=>setNewLeadOpen(false)} create={create}/>}
      {historyOpen && <HistoryModal rows={audit} close={()=>setHistoryOpen(false)}/>}
    </main>
  )
}

function NewLeadModal({form,setForm,close,create}:{form:Row,setForm:(v:any)=>void,close:()=>void,create:(e:any)=>void}) {
  return <div className="fixed inset-0 z-50 overflow-auto bg-slate-950/60 p-3 sm:p-6">
    <div className="mx-auto mt-4 max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:mt-10">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">New Lead</p><h2 className="text-xl font-black">Add customer</h2></div><button onClick={close} className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18}/></button></div>
      <form onSubmit={create} className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(form).map(([k,v]) => k==='connection_category'
          ? <select key={k} required value={String(v)} onChange={e=>setForm({...form,[k]:e.target.value})} className="rounded-xl border border-slate-200 p-3"><option>Domestic</option><option>Commercial</option></select>
          : <input key={k} required={['name','phone','district'].includes(k)} type={k==='phone'||k==='bill'||k==='monthly_kwh'||k==='recommended_kw'?'number':'text'} placeholder={k.replaceAll('_',' ')} value={String(v)} onChange={e=>setForm({...form,[k]:e.target.value})} className="rounded-xl border border-slate-200 p-3"/>)
        }
        <button className="rounded-2xl bg-sky-600 p-3 font-bold text-white sm:col-span-2">ADD LEAD</button>
      </form>
    </div>
  </div>
}

function HistoryModal({rows,close}:{rows:Row[],close:()=>void}) {
  return <div className="fixed inset-0 z-50 overflow-auto bg-slate-950/60 p-3 sm:p-6">
    <div className="mx-auto mt-4 max-w-3xl rounded-3xl bg-white shadow-2xl sm:mt-10">
      <div className="sticky top-0 flex items-center justify-between rounded-t-3xl border-b bg-white p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Audit history</p><h2 className="text-xl font-black">All changes</h2></div><button onClick={close} className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18}/></button></div>
      <div className="p-5">{rows.length ? rows.map(x=><div key={x.id || JSON.stringify(x)} className="border-b py-4 last:border-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{x.field || 'Change'}</p><p className="mt-1 text-xs text-slate-500">Lead: <b>{x.lead_id}</b></p></div><p className="shrink-0 text-[10px] text-slate-400">{dt(x.changed_at)}</p></div><p className="mt-2 text-xs"><span className="text-slate-400">{x.old_value || '—'}</span> <span className="px-1">→</span> <b>{x.new_value || '—'}</b></p><p className="mt-2 text-[10px] font-bold text-sky-700">Done by {x.changed_by_name || '—'} · {x.changed_by_email || '—'}</p></div>) : <p className="py-8 text-center text-sm text-slate-400">No changes recorded.</p>}</div>
    </div>
  </div>
}

function Schedule({rows,leads,reload}:{rows:Row[],leads:Row[],reload:()=>void}) {
  return <section><div className="mb-3 flex items-center gap-2"><CalendarDays size={20} className="text-sky-600"/><div><h2 className="text-lg font-black">Today’s Schedule</h2><p className="text-xs text-slate-500">{rows.length} follow-up(s) due today</p></div></div><FollowupList rows={rows} leads={leads} reload={reload}/></section>
}

function Followups({rows,leads,reload}:{rows:Row[],leads:Row[],reload:()=>void}) {
  return <section><div className="mb-3 flex items-center gap-2"><Clock3 size={20} className="text-sky-600"/><div><h2 className="text-lg font-black">Followups</h2><p className="text-xs text-slate-500">Manage scheduled customer follow-ups</p></div></div><FollowupList rows={rows} leads={leads} reload={reload}/></section>
}

function FollowupList({rows,leads,reload}:{rows:Row[],leads:Row[],reload:()=>void}) {
  const [leadId,setLeadId]=useState(''),[at,setAt]=useState(''),[note,setNote]=useState('')
  const add=async()=>{if(!leadId||!at)return;await fetch('/api/admin/followups',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({leadId,followUpAt:at,note})});setAt('');setNote('');reload()}
  const act=async(id:number,status:string)=>{await fetch('/api/admin/followups',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});reload()}
  return <div className="grid gap-3 md:grid-cols-[300px_1fr]">
    <div className="rounded-2xl border bg-white p-4"><h3 className="font-black">Add follow-up</h3><select value={leadId} onChange={e=>setLeadId(e.target.value)} className="mt-3 w-full rounded-xl border p-3 text-sm"><option value="">Select lead</option>{leads.map(l=><option key={l.lead_id}>{l.lead_id}</option>)}</select><input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm"/><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note" className="mt-2 w-full rounded-xl border p-3 text-sm"/><button onClick={add} className="mt-2 w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white">ADD FOLLOW-UP</button></div>
    <div className="rounded-2xl border bg-white">{rows.length ? rows.map(x=><div key={x.id} className="border-b p-4 last:border-0"><div className="flex items-start justify-between gap-3"><div><b className="text-sm">{x.lead_id}</b><p className="mt-1 text-xs text-slate-500">{dt(x.follow_up_at)}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{x.status}</span></div><p className="mt-2 text-xs">{x.note || '—'}</p>{x.status==='PENDING'&&<div className="mt-3 flex gap-2"><button onClick={()=>act(x.id,'DONE')} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white">DONE</button><button onClick={()=>act(x.id,'SNOOZED')} className="rounded-full border px-3 py-2 text-xs font-bold">SNOOZE</button></div>}</div>) : <p className="p-8 text-center text-sm text-slate-400">No follow-ups.</p>}</div>
  </div>
}
