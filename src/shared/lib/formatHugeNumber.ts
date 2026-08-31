import type { BigNumber } from 'mathjs'

/**
 * Сериализованное представление большого числа.
 * Хранится в сторах Effector (BigNumber не сериализуем напрямую).
 */
export interface SerializedBigNumber {
  /** Строковое представление значения (мантисса) */
  value: string
  /** Порядок (показатель степени 10) */
  exponent: number
}

/**
 * Форматирует BigNumber в человекочитаемую строку.
 *
 * Правила:
 * - |x| < 1e6  → как есть (обычное число)
 * - |x| < 1e1000 → научная нотация `2.4e543`
 * - |x| >= 1e1000 → `10^(5.43e100)` (логарифм от логарифма)
 */
export function formatHugeNumber(bn: BigNumber): string {
  if (bn.isNaN()) return 'NaN'
  if (!bn.isFinite()) return bn.isNegative() ? '-∞' : '∞'

  const negative = bn.isNegative()
  const abs = bn.abs()

  // Маленькие числа — как есть
  if (abs.lt(1e6)) {
    return bn.toString()
  }

  // Научная нотация: 2.4e543
  // Сравниваем через логарифм: 1e1000 в JS = Infinity (переполнение Number)
  if (abs.log(10).lt(1000)) {
    const str = abs.toExponential(2)
    return negative ? `-${str}` : str
  }

  // Гигантские числа: 10^(5.43e100)
  // log10(x) = exponent + log10(mantissa)
  const exp = abs.log(10) // BigNumber
  const expStr = formatHugeNumber(exp) // рекурсивно форматируем показатель
  return negative ? `-10^(${expStr})` : `10^(${expStr})`
}

/**
 * Считает логарифм по основанию 10 от BigNumber.
 * Используется для начисления очков (линейная шкала).
 */
export function log10(bn: BigNumber): number {
  if (bn.isNegative() || bn.isZero()) return 0
  return bn.log(10).toNumber()
}

/**
 * Логарифм по основанию 10 от сериализованного числа.
 * log10(mantissa * 10^exp) = exp + log10(mantissa).
 */
export function serializedLog10(s: SerializedBigNumber): number {
  if (s.exponent === 0) {
    const v = parseFloat(s.value)
    return v > 0 ? Math.log10(v) : 0
  }
  const mantissa = parseFloat(s.value) || 1
  return s.exponent + Math.log10(mantissa)
}

/**
 * Преобразует BigNumber в сериализуемое представление.
 */
export function serializeBigNumber(bn: BigNumber): SerializedBigNumber {
  if (bn.isNaN() || !bn.isFinite()) {
    return { value: bn.toString(), exponent: 0 }
  }
  const abs = bn.abs()
  if (abs.lt(1e6)) {
    return { value: bn.toString(), exponent: 0 }
  }
  const exp = abs.log(10).floor().toNumber()
  // toExponential даёт "2.40e+543" — берём мантиссу до 'e'
  const mantissa = abs.toExponential(2).split('e')[0]
  return {
    value: mantissa,
    exponent: exp,
  }
}
