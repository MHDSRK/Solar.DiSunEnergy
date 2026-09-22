import { NextResponse } from 'next/server'
import { createSession, adminCookie } from '@/lib/adminAuth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const configuredEmail = String(process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
    const configuredPassword = String(process.env.ADMIN_PASSWORD ?? '')
    if (!configuredEmail || !configuredPassword || !process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ success: false, message: 'Admin authentication is not configured.' }, { status: 500 })
    }
    if (email !== configuredEmail || password !== configuredPassword) {
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 })
    }
    const response = NextResponse.json({ success: true })
    response.cookies.set(adminCookie.name, createSession(configuredEmail), adminCookie)
    return response
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
  }
}
