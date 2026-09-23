import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const DEFAULT_N = 16384
const DEFAULT_R = 8
const DEFAULT_P = 1
const MAX_MEM = 32 * 1024 * 1024

type ScryptWithOptions = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
  callback: (error: Error | null, derivedKey: Buffer) => void,
) => void

const scryptWithOptions = scryptCallback as unknown as ScryptWithOptions

function deriveKey(password: string, salt: Buffer, length: number, N: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptWithOptions(password, salt, length, { N, r, p, maxmem: MAX_MEM }, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await deriveKey(password, salt, KEY_LENGTH, DEFAULT_N, DEFAULT_R, DEFAULT_P)
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyAdminPassword(password: string, encoded: string) {
  const parts = encoded.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, nText, rText, pText, saltText, hashText] = parts
  const N = Number(nText)
  const r = Number(rText)
  const p = Number(pText)

  // Only accept the parameters produced by this application's generator.
  // This also prevents an attacker from forcing an unexpectedly expensive scrypt operation.
  if (N !== DEFAULT_N || r !== DEFAULT_R || p !== DEFAULT_P) return false

  try {
    const salt = Buffer.from(saltText, 'base64url')
    const expected = Buffer.from(hashText, 'base64url')
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false

    const derived = await deriveKey(password, salt, expected.length, N, r, p)
    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
