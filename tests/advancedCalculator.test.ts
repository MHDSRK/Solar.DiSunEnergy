import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSolarResult } from '../services/solar/calculator'

test('advanced calculator returns ROI fields',()=>{
 const r=calculateSolarResult(5000,'Domestic','bill')
 assert.ok(r.kw>0)
 assert.ok(r.cost>0)
 assert.ok(r.netSystemCost>=0)
 assert.ok(r.estimatedAnnualSavings>=0)
 assert.ok(r.loanAssumption.estimatedEmi>0)
})
