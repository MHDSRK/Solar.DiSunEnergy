import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveKsebSection } from '../services/kseb/recapClient.ts'

test('resolves KSEB section ID to authoritative district metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    const params = new URLSearchParams(String(init?.body ?? ''))
    if (params.has('distictid')) {
      return new Response(JSON.stringify({ 'Example Section': '123' }), { status: 200 })
    }
    return new Response(JSON.stringify({ Ernakulam: '5' }), { status: 200 })
  }

  try {
    const section = await resolveKsebSection({
      sectionId: '123',
      sectionOffice: 'Client supplied name',
      districtId: '999',
      districtName: 'Wrong District',
    })
    assert.deepEqual(section, {
      sectionId: '123',
      name: 'Example Section',
      districtId: '5',
      districtName: 'Ernakulam',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
