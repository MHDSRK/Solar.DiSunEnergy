import { NextResponse } from 'next/server'
import { ensureLeadTable,getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { auditEvent } from '@/lib/adminAudit'
const u=(e:unknown)=>e instanceof Error&&e.message==='UNAUTHORIZED'

export async function GET(req:Request){
 try{
  const a=await requireAdmin(); await ensureLeadTable()
  const params=new URL(req.url).searchParams
  const id=params.get('leadId')
  const page=Math.max(1,Number(params.get('page')||'1')||1)
  const pageSize=Math.min(100,Math.max(1,Number(params.get('pageSize')||'50')||50))
  const offset=(page-1)*pageSize
  const sql=getSql()
  const rows=(id
    ? await sql.query('SELECT f.*, l.name AS lead_name FROM lead_followups f LEFT JOIN leads l ON l.lead_id=f.lead_id WHERE f.lead_id=$1 ORDER BY f.follow_up_at ASC LIMIT $2 OFFSET $3',[id,pageSize,offset])
    : await sql.query('SELECT f.*, l.name AS lead_name FROM lead_followups f LEFT JOIN leads l ON l.lead_id=f.lead_id ORDER BY f.follow_up_at ASC LIMIT $1 OFFSET $2',[pageSize,offset])) as Record<string,any>[]
  const totalRows=(id
    ? await sql.query('SELECT COUNT(*)::int AS total FROM lead_followups WHERE lead_id=$1',[id])
    : await sql.query('SELECT COUNT(*)::int AS total FROM lead_followups')) as Record<string,any>[]
  const total=Number(totalRows[0]?.total||0)
  return NextResponse.json({success:true,actor:a,followups:rows,page,pageSize,total,hasMore:offset+rows.length<total})
 }catch(e){return NextResponse.json({success:false,message:u(e)?'Unauthorized':'Failed'},{status:u(e)?401:500})}
}

export async function POST(req:Request){
 try{
  const a=await requireAdmin(); await ensureLeadTable(); const b=await req.json()
  const leadId=String(b.leadId??'').trim()
  if(!leadId||!b.followUpAt)return NextResponse.json({success:false,message:'leadId and followUpAt required'},{status:400})
  const leadExists=await getSql().query('SELECT 1 FROM leads WHERE lead_id=$1 LIMIT 1',[leadId])
  if(!(leadExists as unknown as unknown[]).length)return NextResponse.json({success:false,message:'Lead not found'},{status:404})
  const r=(await getSql().query('INSERT INTO lead_followups (lead_id,note,follow_up_at,created_by_name) VALUES ($1,$2,$3,$4) RETURNING *',[leadId,b.note??null,String(b.followUpAt),a.name])) as Record<string,any>[]
  await auditEvent(leadId,'follow_up','created for '+String(b.followUpAt)+' by '+a.name,a)
  return NextResponse.json({success:true,followup:r[0]})
 }catch(e){return NextResponse.json({success:false,message:u(e)?'Unauthorized':'Failed'},{status:u(e)?401:500})}
}

export async function PATCH(req:Request){
 try{
  const a=await requireAdmin();await ensureLeadTable();const b=await req.json();const id=Number(b.id);const status=['DONE','SNOOZED','PENDING','REMINDER_SENT'].includes(b.status)?b.status:null
  if(!id||!status)return NextResponse.json({success:false,message:'Invalid follow-up'},{status:400})
  const r=(await getSql().query("UPDATE lead_followups SET status=$1,completed_at=CASE WHEN $1='DONE' THEN NOW() ELSE completed_at END WHERE id=$2 RETURNING *",[status,id])) as Record<string,any>[]
  if(!r.length)return NextResponse.json({success:false,message:'Not found'},{status:404})
  await auditEvent(String(r[0].lead_id),'follow_up',String(status)+' by '+a.name,a)
  return NextResponse.json({success:true,followup:r[0]})
 }catch(e){return NextResponse.json({success:false,message:u(e)?'Unauthorized':'Failed'},{status:u(e)?401:500})}
}