export type ProductionCheck = { name: string; configured: boolean }

export function getProductionChecks(env = process.env): ProductionCheck[] {
  return [
    { name: 'DATABASE_URL', configured: Boolean(env.DATABASE_URL) },
    { name: 'ADMIN_EMAIL / ADMIN_USERNAME', configured: Boolean(env.ADMIN_EMAIL || env.ADMIN_USERNAME) },
    { name: 'ADMIN_PASSWORD_HASH', configured: Boolean(env.ADMIN_PASSWORD_HASH) },
    { name: 'ADMIN_SESSION_SECRET', configured: Boolean(env.ADMIN_SESSION_SECRET) },
    { name: 'LEAD_SESSION_SECRET', configured: Boolean(env.LEAD_SESSION_SECRET || env.ADMIN_SESSION_SECRET) },
    { name: 'GOOGLE_SHEET_ID', configured: Boolean(env.GOOGLE_SHEET_ID) },
    { name: 'GOOGLE_SERVICE_ACCOUNT_JSON', configured: Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON) },
    { name: 'WHATSAPP_ACCESS_TOKEN', configured: Boolean(env.WHATSAPP_ACCESS_TOKEN) },
    { name: 'WHATSAPP_PHONE_NUMBER_ID', configured: Boolean(env.WHATSAPP_PHONE_NUMBER_ID) },
    { name: 'WHATSAPP_RECIPIENT', configured: Boolean(env.WHATSAPP_RECIPIENT) },
  ]
}

export function getMissingProductionConfig(env = process.env) {
  return getProductionChecks(env).filter((check) => !check.configured).map((check) => check.name)
}
