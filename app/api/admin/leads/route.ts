import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { auditEvent } from '@/lib/adminAudit'

function makeLeadId(){const d=new Date().toISOString().slice(0,10).replace(/-/g,'');return `DSN-${d}-${crypto.randomUUID().slice(0,8).toUpperCase()}`}
const fields=['name','phone','district','area','connection_category','recommended_kw','kseb_consumer_number','remaining_transformer_capacity']
function unauthorized(e:unknown){return e instanceof Error&&e.message==='UNAUTHORIZED'}

export async function GET(request: Request){
 try{
  await requireAdmin(); await ensureLeadTable(); const sql=getSql()
  const params=new URL(request.url).searchParams
  const page=Math.max(1,Number(params.get('page')||'1')||1)
  const pageSize=Math.min(100,Math.max(1,Number(params.get('pageSize')||'50')||50))
  const offset=(page-1)*pageSize
  const leads=(await sql.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT $1 OFFSET $2',[pageSize,offset])) as Record<string,any>[]
  const totalRows=(await sql`SELECT COUNT(*)::int AS total FROM leads`) as Record<string,any>[]
  const total=Number(totalRows[0]?.total||0)
  const leadIds=leads.map((lead)=>String(lead.lead_id))
  let audit:Record<string,any>[]=[]
  let followups:Record<string,any>[]=[]
  let payments:Record<string,any>[]=[]
  let stages:Record<string,any>[]=[]
  let docs:Record<string,any>[]=[]
  let visits:Record<string,any>[]=[]
  if(leadIds.length){
   const ids=leadIds
   audit=(await sql.query('SELECT * FROM lead_audit_log WHERE lead_id = ANY($1::text[]) ORDER BY changed_at DESC', [ids])) as Record<string,any>[]
   followups=(await sql.query('SELECT * FROM lead_followups WHERE lead_id = ANY($1::text[]) ORDER BY follow_up_at ASC', [ids])) as Record<string,any>[]
   payments=(await sql.query('SELECT * FROM lead_payments WHERE lead_id = ANY($1::text[]) ORDER BY paid_at DESC', [ids])) as Record<string,any>[]
   stages=(await sql.query('SELECT * FROM lead_project_stages WHERE lead_id = ANY($1::text[]) ORDER BY stage_at ASC', [ids])) as Record<string,any>[]
   docs=(await sql.query('SELECT lead_id,document_type,file_name,mime_type,size_bytes,uploaded_at FROM lead_documents WHERE lead_id = ANY($1::text[]) ORDER BY uploaded_at DESC', [ids])) as Record<string,any>[]
   visits=(await sql.query('SELECT * FROM site_visits WHERE lead_id = ANY($1::text[]) ORDER BY created_at DESC', [ids])) as Record<string,any>[]
  }
  const statsRows=(await sql`
   SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE name IS NOT NULL OR phone IS NOT NULL)::int AS contact,
    COUNT(*) FILTER (WHERE recommended_kw IS NOT NULL)::int AS calculated,
    COUNT(*) FILTER (WHERE feasibility_status IS NOT NULL)::int AS feasibility
   FROM leads
  `) as Record<string,any>[]
  const stats=statsRows[0]||{total:0,contact:0,calculated:0,feasibility:0}
  return NextResponse.json({success:true,leads,audit,followups,payments,stages,documents:docs,siteVisits:visits,page,pageSize,total,hasMore:offset+leads.length<total,stats})
 }catch(e){return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to load leads.'},{status:unauthorized(e)?401:500})}
}

export async function POST(request:Request){
 try{
  const actor=await requireAdmin(); await ensureLeadTable(); const body=await request.json()
  const phone=String(body.phone??'').replace(/\D/g,'')
  if(phone&&!/^\d{10}$/.test(phone)) return NextResponse.json({success:false,message:'Phone number must contain 10 digits.'},{status:400})
  const leadId=makeLeadId(); const sql=getSql()
  const numericFields=['recommended_kw','remaining_transformer_capacity']
  const vals=fields.map(f=>{ const raw=body[f]; const text=String(raw??'').trim(); if(numericFields.includes(f)) return text===''?null:Number(text.replace(/,/g,'')); if(f==='phone') return phone||null; return text===''?null:raw })
  if(vals.some((v,i)=>numericFields.includes(fields[i])&&v!==null&&!Number.isFinite(Number(v)))) return NextResponse.json({success:false,message:'Numeric fields contain an invalid value.'},{status:400})
  const placeholders=fields.map((_,i)=>'$'+(i+2)).join(',')
  await sql.query(`INSERT INTO leads (lead_id,${fields.join(',')},source,lead_status) VALUES ($1,${placeholders},'manual','NEW')`,[leadId,...vals])
  try{await auditEvent(leadId,'source',`created via manual entry by ${actor.name}`,actor)}catch{}
  return NextResponse.json({success:true,leadId})
 }catch(e){const message=e instanceof Error?e.message:'Unable to create lead.';return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':message},{status:unauthorized(e)?401:500})}
}

export async function DELETE(request:Request){
 try{
  const actor=await requireAdmin(); await ensureLeadTable(); const body=await request.json()
  const ids=Array.isArray(body.leadIds)?body.leadIds.map(String).filter(Boolean):[]
  if(!ids.length) return NextResponse.json({success:false,message:'No leads selected.'},{status:400})
  const sql=getSql()
  const rows=(await sql.query('SELECT lead_id FROM leads WHERE lead_id = ANY($1::text[])',[ids])) as Record<string,any>[]
  await sql.transaction(ids.flatMap((id: string) => [
    sql.query('DELETE FROM lead_audit_log WHERE lead_id=$1',[id]),
    sql.query('DELETE FROM lead_followups WHERE lead_id=$1',[id]),
    sql.query('DELETE FROM lead_payments WHERE lead_id=$1',[id]),
    sql.query('DELETE FROM lead_project_stages WHERE lead_id=$1',[id]),
    sql.query('DELETE FROM leads WHERE lead_id=$1',[id]),
  ]))
  for(const row of rows){
    await sql.query('INSERT INTO admin_audit_logs (action,lead_id,details,created_at) VALUES ($1,$2,$3::jsonb,NOW())',['lead_deleted',String(row.lead_id),JSON.stringify({deletedBy:actor.name,deletedByEmail:actor.email})])
  }
  return NextResponse.json({success:true,deleted:rows.length})
 }catch(e){return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to delete leads.'},{status:unauthorized(e)?401:500})}
}
