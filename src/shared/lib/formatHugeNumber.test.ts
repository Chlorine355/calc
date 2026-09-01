import { describe, it, expect } from 'vitest'
import { create, all } from 'mathjs'
import { formatHugeNumber, log10, serializeBigNumber, formatLog10Target } from './formatHugeNumber'

const math = create(all, { number: 'BigNumber', precision: 64 })

function bn(x: string | number) {
  return math.bignumber(x)
}

describe('formatHugeNumber', () => {
  it('маленькие числа показывает как есть', () => {
    expect(formatHugeNumber(bn(42))).toBe('42')
    expect(formatHugeNumber(bn(999999))).toBe('999999')
  })

  it('научная нотация для средних чисел', () => {
    expect(formatHugeNumber(bn('2.4e543'))).toBe('2.40e+543')
  })

  it('гигантские числа через логарифм от логарифма', () => {
    // 10^(10^7) — показатель 10^7, представимый для decimal.js
    const huge = math.bignumber(10).pow(math.bignumber(10).pow(7))
    const str = formatHugeNumber(huge)
    expect(str).toMatch(/^10\^\(/)
  })

  it('отрицательные числа сохраняют знак', () => {
    expect(formatHugeNumber(bn(-42))).toBe('-42')
  })

  it('ноль', () => {
    expect(formatHugeNumber(bn(0))).toBe('0')
  })
})

describe('log10', () => {
  it('считает логарифм', () => {
    expect(log10(bn(1000))).toBe(3)
  })

  it('отрицательное число даёт 0', () => {
    expect(log10(bn(-5))).toBe(0)
  })

  it('ноль даёт 0', () => {
    expect(log10(bn(0))).toBe(0)
  })
})

describe('serializeBigNumber', () => {
  it('сериализует маленькое число', () => {
    expect(serializeBigNumber(bn(42))).toEqual({ value: '42', exponent: 0, negative: false })
  })

  it('сериализует большое число в мантиссу и порядок', () => {
    const s = serializeBigNumber(bn('2.4e543'))
    expect(s.exponent).toBe(543)
    expect(parseFloat(s.value)).toBeCloseTo(2.4, 1)
  })
})

describe('formatLog10Target', () => {
  it('малые числа — обычная запись', () => {
    expect(formatLog10Target(0)).toBe('1') // 10^0 = 1
    expect(formatLog10Target(3)).toBe('1000')
    expect(formatLog10Target(3.5)).toBe('3162.28')
  })

  it('большие числа — научная нотация', () => {
    expect(formatLog10Target(14.15)).toBe('1.41e14')
    expect(formatLog10Target(6)).toBe('1.00e6')
  })
})
