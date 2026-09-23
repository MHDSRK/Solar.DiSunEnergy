import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline'

const scryptAsync = promisify(scrypt)
const rl = createInterface({ input: process.stdin, output: process.stdout })
const password = await new Promise((resolve) => rl.question('Admin password: ', resolve))
rl.close()

if (!password) {
  console.error('Password cannot be empty.')
  process.exit(1)
}

const N = 16384
const r = 8
const p = 1
const salt = randomBytes(16)
const derived = await scryptAsync(password, salt, 64, { N, r, p, maxmem: 32 * 1024 * 1024 })
console.log(`ADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`)
