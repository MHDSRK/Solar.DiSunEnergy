import { fetchKsebRecap } from '../recapClient'
import type { RecapProvider } from './recapProvider'

export const ksebRecapProvider: RecapProvider = {
  getTransformerData: fetchKsebRecap,
}

export function getRecapProvider(): RecapProvider {
  if (process.env.KSEB_PROVIDER === 'mock') {
    if (process.env.NODE_ENV === 'production') throw new Error('MOCK_PROVIDER_FORBIDDEN_IN_PRODUCTION')
    return require('./mockRecapProvider').mockRecapProvider
  }
  return ksebRecapProvider
}
