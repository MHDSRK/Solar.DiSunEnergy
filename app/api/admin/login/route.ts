import { NextResponse } from 'next/server'
import { createSession, adminCookie } from '@/lib/adminAuth'
import { verifyAdminPassword } from '@/lib/adminPassword'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'admin-login', 5, 900)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const configuredEmail = String(process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
    const passwordHash = String(process.env.ADMIN_PASSWORD_HASH ?? '')
    if (!configuredEmail || !passwordHash || !process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ success: false, message: 'Admin authentication is not configured.' }, { status: 500 })
    }

    const validPassword = await verifyAdminPassword(password, passwordHash)
    if (email !== configuredEmail || !validPassword) {
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(adminCookie.name, createSession(configuredEmail), adminCookie)
    return response
  } catch (error) {
    console.error('Admin login failed', error)
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
  }
}
