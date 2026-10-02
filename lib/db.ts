import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null
/** Database schema is provisioned by scripts/migrate-db.mjs. Request handlers do not run DDL. */
export async function ensureLeadTable() {
  return
}

export async function ensureAdminTasksTable() {
  return
}
