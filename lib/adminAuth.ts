import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE = 'disun_admin_session'
const MAX_AGE = 60 * 60 * 12

function secret() {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET is not configured')
  return process.env.ADMIN_SESSION_SECRET
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export type AdminIdentity = { email: string; name: string }

function encodeIdentity(identity: AdminIdentity) {
  return Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url')
}

function decodeIdentity(encoded: string): AdminIdentity | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') return parsed
    if (typeof parsed === 'string' && parsed) return { email: parsed, name: parsed }
  } catch {}
  return null
}

export function createSession(identity: AdminIdentity | string) {
  const normalized = typeof identity === 'string' ? { email: identity, name: identity } : identity
  const encodedIdentity = encodeIdentity(normalized)
  const payload = `${encodedIdentity}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export function verifySession(value?: string) {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 3) return false

  const [encodedIdentity, timestamp, signature] = parts
  if (!encodedIdentity || !/^\d+$/.test(timestamp)) return false

  const identity = decodeIdentity(encodedIdentity)
  if (!identity) return false

  const age = Date.now() - Number(timestamp)
  if (age < 0 || age > MAX_AGE * 1000) return false

  const expected = sign(`${encodedIdentity}.${timestamp}`)
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? identity : false
  } catch {
    return false
  }
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE)?.value
  const identity = verifySession(session)
  if (!identity) throw new Error('UNAUTHORIZED')
  return identity
}

export const adminCookie = {
  name: COOKIE,
  maxAge: MAX_AGE,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
