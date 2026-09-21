import type { RecapProvider } from './recapProvider'

export const mockRecapProvider: RecapProvider = {
  async getTransformerData() {
    if (process.env.NODE_ENV === 'production') throw new Error('MOCK_PROVIDER_FORBIDDEN_IN_PRODUCTION')
    return { records: [], checkedAt: new Date().toISOString() }
  },
}
