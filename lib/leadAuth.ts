import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_AGE_MS = 48 * 60 * 60 * 1000

function secret() {
  const value = process.env.LEAD_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  if (!value) throw new Error('LEAD_SESSION_SECRET or ADMIN_SESSION_SECRET is not configured')
  return value
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export function createLeadToken(leadId: string) {
  const timestamp = Date.now()
  const payload = `${leadId}.${timestamp}`
  return `${payload}.${sign(payload)}`
}

export function verifyLeadToken(leadId: string, token?: string) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [tokenLeadId, timestamp, signature] = parts
  if (tokenLeadId !== leadId || !/^\d+$/.test(timestamp)) return false
  const age = Date.now() - Number(timestamp)
  if (age < 0 || age > MAX_AGE_MS) return false
  const expected = sign(`${tokenLeadId}.${timestamp}`)
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
