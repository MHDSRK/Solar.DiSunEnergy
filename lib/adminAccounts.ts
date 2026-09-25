import { verifyAdminPassword } from '@/lib/adminPassword'
export type AdminAccount = { name: string; email: string; passwordHash: string }

export function getAdminAccounts(): AdminAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS?.trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(x => x && typeof x.name === 'string' && typeof x.email === 'string' && typeof x.passwordHash === 'string')
      }
    } catch { /* fallback below */ }
  }
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim()
  if (!hash) return []
  return [{
    name: process.env.ADMIN_USERNAME?.trim() || 'Admin',
    email: process.env.ADMIN_EMAIL?.trim() || 'admin',
    passwordHash: hash,
  }]
}
export async function authenticateAdmin(password: string): Promise<AdminAccount | null> {
  const accounts = getAdminAccounts()
  for (const account of accounts) {
    if (await verifyAdminPassword(password, account.passwordHash)) return account
  }
  return null
}
