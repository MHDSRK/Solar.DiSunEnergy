import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { createInterface } from 'node:readline'

const KEY_LENGTH = 64
const N = 16384
const r = 8
const p = 1
const MAX_MEM = 32 * 1024 * 1024

const scryptWithOptions = scryptCallback

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scryptWithOptions(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEM }, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const password = await new Promise((resolve) => rl.question('Admin password: ', resolve))
rl.close()

if (!password) {
  console.error('Password cannot be empty.')
  process.exit(1)
}

const salt = randomBytes(16)
const derived = await deriveKey(password, salt)
console.log(`ADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`)
