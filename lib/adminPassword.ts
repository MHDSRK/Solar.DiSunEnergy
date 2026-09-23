import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64
const DEFAULT_N = 16384
const DEFAULT_R = 8
const DEFAULT_P = 1

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
    maxmem: 32 * 1024 * 1024,
  }) as Buffer
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyAdminPassword(password: string, encoded: string) {
  const parts = encoded.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, nText, rText, pText, saltText, hashText] = parts
  const N = Number(nText)
  const r = Number(rText)
  const p = Number(pText)
  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) return false
  if (N < 16384 || N > 262144 || r < 1 || r > 32 || p < 1 || p > 4) return false

  try {
    const salt = Buffer.from(saltText, 'base64url')
    const expected = Buffer.from(hashText, 'base64url')
    if (salt.length < 16 || expected.length !== KEY_LENGTH) return false
    const derived = await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 32 * 1024 * 1024,
    }) as Buffer
    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
