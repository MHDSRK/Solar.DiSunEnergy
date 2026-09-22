import { NextResponse } from 'next/server'
import { adminCookie } from '@/lib/adminAuth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(adminCookie.name, '', { ...adminCookie, maxAge: 0 })
  return response
}
