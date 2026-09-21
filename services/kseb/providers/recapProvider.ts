import type { TransformerRecord } from '../feasibilityEngine'

export type RecapProviderResult = { records: TransformerRecord[]; checkedAt: string }
export type RecapProvider = { getTransformerData(input: { district: string; section: string }): Promise<RecapProviderResult> }
