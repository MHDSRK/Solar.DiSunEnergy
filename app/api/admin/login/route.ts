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
    // The current admin form intentionally supports password-only login. Passwords must
    // be unique across accounts so the verified hash identifies the acting partner.
    let account: any = null
    if (loginEmail) {
      const candidate = accounts.find((entry: any) => String(entry.email).toLowerCase() === loginEmail)
      if (candidate && await verifyAdminPassword(password, String(candidate.passwordHash))) account = candidate
    } else {
      for (const candidate of accounts) {
        if (await verifyAdminPassword(password, String(candidate.passwordHash))) {
          account = candidate
          break
        }
      }
    }
    if (!account) {
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
