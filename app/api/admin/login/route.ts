import { NextResponse } from 'next/server'
import { createSession, adminCookie } from '@/lib/adminAuth'
import { verifyAdminPassword } from '@/lib/adminPassword'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'admin-login', 5, 900)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    const body = await request.json()
    const password = String(body.password ?? '')
    const loginEmail = String(body.email ?? body.username ?? '').trim().toLowerCase()
    const configuredAccounts = (() => { try { return JSON.parse(process.env.ADMIN_ACCOUNTS ?? '[]') } catch { return [] } })()
    const accounts = Array.isArray(configuredAccounts) && configuredAccounts.length
      ? configuredAccounts
      : [{ name: process.env.ADMIN_USERNAME || 'Admin', email: process.env.ADMIN_EMAIL || 'admin', passwordHash: process.env.ADMIN_PASSWORD_HASH || '' }]
    if (!process.env.ADMIN_SESSION_SECRET || !accounts.some((account: any) => account.passwordHash)) {
      return NextResponse.json({ success: false, message: 'Admin authentication is not configured.' }, { status: 500 })
    }
    const account = accounts.find((candidate: any) => !loginEmail || String(candidate.email).toLowerCase() === loginEmail)
    const validPassword = account ? await verifyAdminPassword(password, String(account.passwordHash)) : false
    if (!validPassword) {
      return NextResponse.json({ success: false, message: 'Invalid password.' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(adminCookie.name, createSession({ email: String(account.email), name: String(account.name || account.email) }), adminCookie)
    return response
  } catch (error) {
    console.error('Admin login failed', error)
    return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 })
  }
}
