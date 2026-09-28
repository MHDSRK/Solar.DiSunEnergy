import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

const unauthorized=(e:unknown)=>e instanceof Error&&e.message==='UNAUTHORIZED'

export async function GET(){
 try{
  await requireAdmin(); await ensureLeadTable()
  const tasks=(await getSql()`SELECT * FROM admin_tasks ORDER BY task_date ASC, created_at ASC`) as Record<string,any>[]
  return NextResponse.json({success:true,tasks})
 }catch(e){
  return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to load tasks.'},{status:unauthorized(e)?401:500})
 }
}

export async function POST(request:Request){
 try{
  const actor=await requireAdmin(); await ensureLeadTable(); const b=await request.json()
  const name=String(b.name??'').trim()
  const taskDate=String(b.taskDate??'').trim()
  if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(taskDate)) return NextResponse.json({success:false,message:'Task name and date are required.'},{status:400})
  const r=(await getSql()`INSERT INTO admin_tasks (name,note,task_date,number,place,stage,plant,payment,source,created_by_name) VALUES (${name},${b.note??null},${taskDate},${b.number??null},${b.place??null},${b.stage??null},${b.plant??null},${b.payment??null},${b.source??null},${actor.name}) RETURNING *`) as Record<string,any>[]
  return NextResponse.json({success:true,task:r[0]})
 }catch(e){
  return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to create task.'},{status:unauthorized(e)?401:500})
 }
}

export async function PATCH(request:Request){
 try{
  const actor=await requireAdmin(); await ensureLeadTable(); const b=await request.json(); const id=Number(b.id)
  if(!id) return NextResponse.json({success:false,message:'Invalid task.'},{status:400})
  if(b.action==='DONE'){
   const r=(await getSql()`UPDATE admin_tasks SET status='DONE',completed_at=NOW(),updated_at=NOW() WHERE id=${id} RETURNING *`) as Record<string,any>[]
   if(!r.length)return NextResponse.json({success:false,message:'Task not found.'},{status:404})
   return NextResponse.json({success:true,task:r[0]})
  }
  if(b.action==='PENDING'){
   const r=(await getSql()`UPDATE admin_tasks SET status='PENDING',completed_at=NULL,updated_at=NOW() WHERE id=${id} RETURNING *`) as Record<string,any>[]
   if(!r.length)return NextResponse.json({success:false,message:'Task not found.'},{status:404})
   return NextResponse.json({success:true,task:r[0]})
  }
  const name=String(b.name??'').trim(), taskDate=String(b.taskDate??'').trim()
  if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(taskDate))return NextResponse.json({success:false,message:'Task name and date are required.'},{status:400})
  const r=(await getSql()`UPDATE admin_tasks SET name=${name},note=${b.note??null},task_date=${taskDate},number=${b.number??null},place=${b.place??null},stage=${b.stage??null},plant=${b.plant??null},payment=${b.payment??null},source=${b.source??null},updated_at=NOW() WHERE id=${id} RETURNING *`) as Record<string,any>[]
  if(!r.length)return NextResponse.json({success:false,message:'Task not found.'},{status:404})
  return NextResponse.json({success:true,task:r[0],updatedBy:actor.name})
 }catch(e){
  return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to update task.'},{status:unauthorized(e)?401:500})
 }
}

export async function DELETE(request:Request){
 try{
  await requireAdmin(); await ensureLeadTable(); const b=await request.json(); const id=Number(b.id)
  if(!id)return NextResponse.json({success:false,message:'Invalid task.'},{status:400})
  const r=(await getSql()`DELETE FROM admin_tasks WHERE id=${id} RETURNING id`) as Record<string,any>[]
  if(!r.length)return NextResponse.json({success:false,message:'Task not found.'},{status:404})
  return NextResponse.json({success:true,deleted:id})
 }catch(e){
  return NextResponse.json({success:false,message:unauthorized(e)?'Unauthorized':'Unable to delete task.'},{status:unauthorized(e)?401:500})
 }
}
