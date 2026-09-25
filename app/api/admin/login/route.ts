import { NextResponse } from 'next/server'
import { createSession, adminCookie } from '@/lib/adminAuth'
import { authenticateAdmin, getAdminAccounts } from '@/lib/adminAccounts'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'admin-login', 5, 900)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)
    const body = await request.json()
    const password = String(body.password ?? '')
    if (!process.env.ADMIN_SESSION_SECRET || !getAdminAccounts().length) {
      return NextResponse.json({ success: false, message: 'Admin authentication is not configured.' }, { status: 500 })
    }
    const account = await authenticateAdmin(password)
    if (!account) return NextResponse.json({ success: false, message: 'Invalid password.' }, { status: 401 })
    const response = NextResponse.json({ success: true, name: account.name, email: account.email })
    response.cookies.set(adminCookie.name, createSession({ name: account.name, email: account.email }), adminCookie)
    return response
  } catch (error) {
    console.error('Admin login failed', error)
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
  }
}
