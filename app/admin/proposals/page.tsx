import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminAuth'
import ProposalMaker from './ProposalMaker'

export default async function ProposalsPage() {
  try { await requireAdmin() } catch { redirect('/admin') }
  return <ProposalMaker />
}
