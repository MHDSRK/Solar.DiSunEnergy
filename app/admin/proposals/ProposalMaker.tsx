'use client'

import { useMemo, useState } from 'react'

type Material={no:number;description:string;make:string;quantity:string}
const CDN='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'
function loadPdfLib():Promise<any>{if(typeof window==='undefined')return Promise.reject(new Error('Browser only'));if((window as any).PDFLib)return Promise.resolve((window as any).PDFLib);return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=CDN;s.onload=()=>{const p=(window as any).PDFLib;p?resolve(p):reject(new Error('PDF library failed to load'))};s.onerror=()=>reject(new Error('Unable to load PDF library'));document.head.appendChild(s)})}
const money=(v:string)=>{const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n.toLocaleString('en-IN'):v}
const initial:Material[]=[
{no:1,description:'Solar module',make:'ADANI',quantity:'As per system'},{no:2,description:'Inverter',make:'GROWWATT',quantity:'1 NOS'},
{no:3,description:'ACDB And DCDB',make:'IP 67 rated enclosure with Havells MCB and SPD with Fuse Protection',quantity:'1 unit'},
{no:4,description:'AC cable',make:'Flexible Copper Cables havells 4 sqmm',quantity:'As per Site'},{no:5,description:'DC cable',make:'UV Resistant solar cables polycab 4 sqmm',quantity:'As per Site'},
{no:6,description:'Three phase Energy Meter',make:'Visiontek / L&T / HPL',quantity:'1 Unit'},{no:7,description:'Copper wire',make:'10 SWG',quantity:'As per Site'},
{no:8,description:'MC4 Connector',make:'-',quantity:'As per Site'},{no:9,description:'Cable tray',make:'45*45 slotted /unslotted',quantity:'As per Site'}]
export default function ProposalMaker(){
 const[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
 const[f,setF]=useState({customerName:'',address:'',phone:'',email:'',projectType:'ON GRID',kw:'5',panel:'ADANI',inverter:'GROWWATT',systemCost:'',ksebCharge:'CUSTOMER SCOPE',structure:'-',netMeter:'CUSTOMER SCOPE / KSEB',subsidy:'',validation:'15 days',elevated:'Rs 2500 per Kw'})
 const[materials,setMaterials]=useState<Material[]>(initial)
 const set=(k:keyof typeof f,v:string)=>setF(x=>({...x,[k]:v}))
 const rows=useMemo(()=>materials.slice(0,18),[materials])
 const generate=async()=>{
  if(!file){setMsg('Upload the current 7-page DiSun proposal template PDF first.');return}
  setBusy(true);setMsg('')
  try{
   const P=await loadPdfLib(),doc=await P.PDFDocument.load(new Uint8Array(await file.arrayBuffer()))
   const font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold)
   const pages=doc.getPages();if(pages.length<7)throw new Error('Proposal template must contain 7 pages.')
   const white=P.rgb(1,1,1),black=P.rgb(0.06,0.09,0.16)
   const draw=(n:number,x:number,yTop:number,text:string,size=8,width=450,isBold=false)=>{
    const p=pages[n-1],w=Math.min(width,p.getWidth()-x-10),h=size+6,clean=String(text||'-'),ff=isBold?bold:font
    p.drawRectangle({x:x-2,y:p.getHeight()-yTop-h-2,width:w+4,height:h+4,color:white})
    let v=clean;while(ff.widthOfTextAtSize(v,size)>w&&v.length>3)v=v.slice(0,-2)+'...'
    p.drawText(v,{x,y:p.getHeight()-yTop-size,size,font:ff,color:black,maxWidth:w})
   }
   draw(1,148,270,f.customerName.toUpperCase(),10,260,true);draw(1,148,310,f.kw+' KW ON-GRID SOLAR POWER SYSTEM',9,280,true)
   draw(1,123,476,'PROJECT TYPE',7,100,true);draw(1,185,476,f.projectType,8,180);draw(1,123,503,'SYSTEM CAPACITY',7,100,true);draw(1,205,503,f.kw+' KW',8,120)
   draw(1,123,530,'SOLAR PANEL',7,100,true);draw(1,195,530,f.panel,8,140);draw(1,123,557,'INVERTER',7,100,true);draw(1,195,557,f.inverter,8,160)
   const p3=(y:number,label:string,value:string)=>{draw(3,66,y,label,7,150,true);draw(3,180,y,value,8,310)}
   p3(143,'CUSTOMER NAME',f.customerName);p3(170,'ADDRESS',f.address);p3(196,'CONTACT NO',f.phone);p3(222,'EMAIL ID',f.email);p3(274,'PROJECT TYPE',f.projectType)
   p3(301,'SOLAR PLANT CAPACITY',f.kw+' KW');p3(327,'PANEL CAPACITY',f.kw+' KW');p3(354,'INVERTER CAPACITY',f.kw+' KW');p3(380,'SOLAR PANEL TYPE & BRAND',f.panel);p3(407,'INVERTER TYPE & BRAND',f.inverter)
   draw(4,67,145,'SYSTEM COST',8,120,true);draw(4,190,145,f.systemCost?money(f.systemCost)+'/-':'-',9,190,true)
   draw(4,67,181,'KSEB CHARGE',8,120,true);draw(4,190,181,f.ksebCharge,8,260);draw(4,67,209,'STRUCTURE',8,120,true);draw(4,190,209,f.structure,8,260)
   draw(4,67,237,'NET METER',8,120,true);draw(4,190,237,f.netMeter,8,260);draw(4,67,269,'TOTAL COST',8,120,true);draw(4,190,269,f.systemCost?money(f.systemCost)+'/-':'-',9,190,true)
   draw(4,66,322,'SUBSIDY',8,100,true);draw(4,130,322,f.subsidy?'Subsidy amount '+money(f.subsidy)+'/- will be credited to your account within 1 or 2 months after work completion.':'',8,390)
   draw(4,66,359,'VALIDATION',8,100,true);draw(4,150,359,'Project proposal validation '+f.validation,8,300);draw(4,66,384,'ELEVATED STRUCTURE',8,130,true);draw(4,190,384,f.elevated,8,300)
   const material=(n:number,start:number,items:Material[])=>items.forEach((m,i)=>{const y=start+i*22.5;draw(n,64,y,String(m.no),7,30,true);draw(n,95,y,m.description,7,180);draw(n,280,y,m.make,7,190);draw(n,470,y,m.quantity,7,65)})
   material(5,162,rows.slice(0,9));material(6,162,rows.slice(9,18))
   draw(7,65,201,'INVERTER',7,80,true);draw(7,135,201,'-',8,100);draw(7,65,228,'SYSTEM',7,80,true);draw(7,135,228,'5 years',8,100)
   const out=await doc.save(),blob=new Blob([out],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a')
   a.href=url;a.download='DiSun_Proposal_'+(f.customerName||'Customer').replace(/[^a-z0-9]+/gi,'_')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMsg('Proposal PDF generated.')
  }catch(e){setMsg(e instanceof Error?e.message:'Unable to generate proposal PDF.')}finally{setBusy(false)}
 }
 const input=(k:keyof typeof f,label:string,props:any={})=><label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input {...props} value={f[k]} onChange={e=>set(k,e.target.value)} className="w-full rounded-xl border p-3 text-sm"/></label>
 return <main className="min-h-dvh bg-slate-100 p-4"><div className="mx-auto max-w-5xl space-y-4"><header className="rounded-3xl bg-[#03132f] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-sky-300">DiSun Admin</p><h1 className="mt-1 text-2xl font-black">Proposal PDF Maker</h1><p className="mt-1 text-sm text-slate-300">Upload the real 7-page template, then replace its customer and project data.</p></header>
 <section className="rounded-3xl bg-white p-5 shadow-sm"><input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="w-full text-sm"/><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{input('customerName','Customer name',{required:true})}{input('address','Address')}{input('phone','Phone')}{input('email','Email')}{input('projectType','Project type')}{input('kw','System capacity kW',{type:'number',min:'1',step:'0.1'})}{input('panel','Solar panel brand')}{input('inverter','Inverter brand')}{input('systemCost','System cost ₹')}{input('ksebCharge','KSEB charge')}{input('structure','Structure')}{input('netMeter','Net meter')}{input('subsidy','Subsidy ₹')}{input('validation','Validation')}{input('elevated','Elevated structure')}</div></section>
 <section className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">Materials</h2><button onClick={()=>setMaterials(x=>[...x,{no:x.length+1,description:'',make:'',quantity:''}])} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold">+ Add</button></div><div className="mt-3 space-y-2">{materials.map((m,i)=><div key={i} className="grid gap-2 sm:grid-cols-[40px_1fr_1fr_140px]"><input value={m.no} readOnly className="rounded-xl border bg-slate-50 p-2 text-sm"/><input value={m.description} onChange={e=>setMaterials(x=>x.map((z,j)=>j===i?{...z,description:e.target.value}:z))} className="rounded-xl border p-2 text-sm" placeholder="Description"/><input value={m.make} onChange={e=>setMaterials(x=>x.map((z,j)=>j===i?{...z,make:e.target.value}:z))} className="rounded-xl border p-2 text-sm" placeholder="Make / specification"/><input value={m.quantity} onChange={e=>setMaterials(x=>x.map((z,j)=>j===i?{...z,quantity:e.target.value}:z))} className="rounded-xl border p-2 text-sm" placeholder="Quantity"/></div>)}</div></section>
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><button disabled={busy} onClick={generate} className="rounded-2xl bg-sky-600 px-6 py-3 font-black text-white disabled:opacity-50">{busy?'GENERATING...':'GENERATE PDF'}</button>{msg&&<p className="text-sm font-bold text-slate-600">{msg}</p>}</div></div></main>
}