import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { auditEvent } from '@/lib/adminAudit'

function makeLeadId(){const d=new Date().toISOString().slice(0,10).replace(/-/g,'');return `DSN-${d}-${crypto.randomUUID().slice(0,8).toUpperCase()}`}
const fields=['name','phone','district','area','bill','monthly_kwh','connection_category','recommended_kw','setup_cost','subsidy','financing_amount','customer_contribution','kseb_consumer_number','kseb_district','kseb_section','transformer']
function unauthorized(e:unknown){return e instanceof Error&&e.message==='UNAUTHORIZED'}

export async function GET(){
 try{
  await requireAdmin(); await ensureLeadTable(); const sql=getSql()
  const leads=(await sql`SELECT * FROM leads ORDER BY created_at DESC`) as Record<string,any>[]
  const audit=(await sql`SELECT * FROM lead_audit_log ORDER BY changed_at DESC`) as Record<string,any>[]
  const followups=(await sql`SELECT * FROM lead_followups ORDER BY follow_up_at ASC`) as Record<string,any>[]
  const payments=(await sql`SELECT * FROM lead_payments ORDER BY paid_at DESC`) as Record<string,any>[]
  const stages=(await sql`SELECT * FROM lead_project_stages ORDER BY stage_at ASC`) as Record<string,any>[]
  const docs=(await sql`SELECT lead_id,document_type,file_name,mime_type,size_bytes,uploaded_at FROM lead_documents ORDER BY uploaded_at DESC`) as Record<string,any>[]
  const visits=(await sql`SELECT * FROM site_visits ORDER BY created_at DESC`) as Record<string,any>[]
  return NextResponse.json({success:true,leads,audit,followups,payments,stages,documents:docs,siteVisits:visits,stats:{total:leads.length,contact:leads.filter((x)=>x.name||x.phone).length,calculated:leads.filter((x)=>x.recommended_kw!=null).length,feasibility:leads.filter((x)=>x.feasibility_status!=null).length}})
 }catch(e){return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to load leads.'},{status:unauthorized(e)?401:500})}
}
export async function POST(request:Request){
 try{
  const actor=await requireAdmin(); await ensureLeadTable(); const body=await request.json()
  if(!String(body.name??'').trim()||!/^\d{10}$/.test(String(body.phone??''))||!String(body.district??'').trim()||!['Domestic','Commercial'].includes(String(body.connection_category??''))) return NextResponse.json({success:false,message:'Name, valid phone, district and category are required.'},{status:400})
  const leadId=makeLeadId(); const sql=getSql()
  const vals=fields.map(f=>body[f]??null)
  await sql.query(`INSERT INTO leads (lead_id,${fields.join(',')},source,lead_status) VALUES ($1,${fields.map((_,i)=>'$'+(i+2)).join(',')},'manual','NEW')`,[leadId,...vals])
  await auditEvent(leadId,'source',`created via manual entry by ${actor.name}`,actor)
  return NextResponse.json({success:true,leadId})
 }catch(e){return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to create lead.'},{status:unauthorized(e)?401:500})}
}
export async function DELETE(request:Request){
 try{
  const actor=await requireAdmin(); await ensureLeadTable(); const body=await request.json(); const ids=Array.isArray(body.leadIds)?body.leadIds.map(String).filter(Boolean):[]
  if(!ids.length) return NextResponse.json({success:false,message:'No leads selected.'},{status:400})
  const rows=(await getSql()`SELECT lead_id FROM leads WHERE lead_id = ANY(${ids}::text[])`) as Record<string,any>[]
  for(const row of rows) await auditEvent(String(row.lead_id),'record',`deleted by ${actor.name}`,actor)
  await getSql()`DELETE FROM leads WHERE lead_id = ANY(${ids}::text[])`
  return NextResponse.json({success:true,deleted:ids.length})
 }catch(e){return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to delete leads.'},{status:unauthorized(e)?401:500})}
}
