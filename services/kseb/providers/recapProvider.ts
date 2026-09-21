import type { TransformerRecord } from '../feasibilityEngine'

export type RecapProviderResult = { records: TransformerRecord[]; checkedAt: string; retrievedAt: string; office?: Record<string, unknown> }
export interface RecapProvider { getTransformerData(input: { sectionId: string }): Promise<RecapProviderResult> }
