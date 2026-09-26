import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminAuth'
import FormsFilling from './FormsFilling'

export default async function FormsPage() {
  try { await requireAdmin() } catch { redirect('/admin') }
  return <FormsFilling />
}
