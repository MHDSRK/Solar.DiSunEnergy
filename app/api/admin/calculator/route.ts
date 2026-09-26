import{NextResponse}from'next/server'
import{requireAdmin}from'@/lib/adminAuth'
import{calculateSolarResult}from'@/services/solar/calculator'
import{calculateFeasibility}from'@/services/kseb/feasibilityEngine'

export async function POST(req:Request){
 try{
  await requireAdmin()
  const b=await req.json()
  const input=Number(b.input),category=String(b.category),mode=b.mode==='units'?'units':'bill'
  if(!Number.isFinite(input)||input<=0||!['Domestic','Commercial'].includes(category))return NextResponse.json({success:false,message:'Invalid calculator input'},{status:400})
  const result:any=calculateSolarResult(input,category,mode)
  const balance=Number(b.balanceAvailableKw),requested=Number(b.requestedKw||result.kw)
  if(Number.isFinite(balance)&&balance>=0&&Number.isFinite(requested)&&requested>0) result.feasibility=calculateFeasibility(balance,requested)
  return NextResponse.json({success:true,result})
 }catch(e){const u=e instanceof Error&&e.message==='UNAUTHORIZED';return NextResponse.json({success:false,message:u?'Unauthorized':'Calculation failed'},{status:u?401:500})}
}