import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveKsebSection } from '../services/kseb/recapClient'

test('keeps KSEB district ID and district name in their correct fields', async () => {
  const section = await resolveKsebSection({
    sectionId: '123',
    sectionOffice: 'Example Section',
    districtId: '5',
    districtName: 'Ernakulam',
  })
  assert.equal(section?.districtId, '5')
  assert.equal(section?.districtName, 'Ernakulam')
})
