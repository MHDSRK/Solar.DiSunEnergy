import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export type AdminIdentity = { email: string; name: string }
const COOKIE = 'disun_admin_session'
const MAX_AGE = 60 * 60 * 12

function secret() {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET is not configured')
  return process.env.ADMIN_SESSION_SECRET
}
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url') }
function encodeIdentity(identity: AdminIdentity) { return Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url') }
function decodeIdentity(encoded: string): AdminIdentity | null {
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!value || typeof value.email !== 'string' || typeof value.name !== 'string') return null
    return { email: value.email, name: value.name }
  } catch { return null }
}
export function createSession(identity: AdminIdentity | string) {
  const normalized = typeof identity === 'string' ? { email: identity, name: identity } : identity
  const encoded = encodeIdentity(normalized)
  const payload = `${encoded}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}
export function verifySession(value?: string): AdminIdentity | false {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [encoded, timestamp, signature] = parts
  if (!encoded || !/^\d+$/.test(timestamp)) return false
  const identity = decodeIdentity(encoded)
  if (!identity) return false
  const age = Date.now() - Number(timestamp)
  if (age < 0 || age > MAX_AGE * 1000) return false
  const expected = sign(`${encoded}.${timestamp}`)
  try {
    if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false
  } catch { return false }
  return identity
}
export async function requireAdmin(): Promise<AdminIdentity> {
  const store = await cookies()
  const identity = verifySession(store.get(COOKIE)?.value)
  if (!identity) throw new Error('UNAUTHORIZED')
  return identity
}
export const adminCookie = {
  name: COOKIE, maxAge: MAX_AGE, httpOnly: true,
  sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/',
}
