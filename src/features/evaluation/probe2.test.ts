import { it } from 'vitest'
import { evaluateString } from './engine'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

it('probe 9^(9^9)', () => {
  console.log('START eval')
  const res = evaluateString('9^(9^9)')
  console.log('eval done', res.ok, res.result?.exponent)
  if (res.ok && res.result) {
    console.log('START log10')
    const l = serializedLog10(res.result)
    console.log('log10 done', l)
  }
})
