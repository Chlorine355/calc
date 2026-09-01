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
  /** true, если число отрицательное. Для больших чисел знак не входит в value. */
  negative: boolean
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
  try {
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
  } catch {
    // Никогда не роняем UI из-за форматирования
    return String(bn)
  }
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
 * Форматирует целевое число из его log10 в человекочитаемый вид.
 *
 * - log10 < 6 (число < 1e6) → обычная запись (например, «1234»).
 * - иначе → научная нотация (например, «1.4e14»).
 */
export function formatLog10Target(log10: number): string {
  if (!Number.isFinite(log10) || log10 < 0) return '0'
  if (log10 < 6) {
    const v = Math.pow(10, log10)
    // Округляем до целого, если близко к целому, иначе до 2 знаков.
    const rounded = Math.round(v)
    if (Math.abs(v - rounded) < 0.01) return String(rounded)
    return v.toFixed(2)
  }
  // Научная нотация: 10^log10 = 10^(int + frac) = mantissa * 10^int
  const int = Math.floor(log10)
  const frac = log10 - int
  const mantissa = Math.pow(10, frac)
  return `${mantissa.toFixed(2)}e${int}`
}

/**
 * Преобразует BigNumber в сериализуемое представление.
 */
export function serializeBigNumber(bn: BigNumber): SerializedBigNumber {
  if (bn.isNaN() || !bn.isFinite()) {
    return { value: bn.toString(), exponent: 0, negative: false }
  }
  const abs = bn.abs()
  if (abs.lt(1e6)) {
    return { value: bn.toString(), exponent: 0, negative: bn.isNegative() }
  }
  const exp = abs.log(10).floor().toNumber()
  // toExponential даёт "2.40e+543" — берём мантиссу до 'e'
  const mantissa = abs.toExponential(2).split('e')[0]
  return {
    value: mantissa,
    exponent: exp,
    negative: bn.isNegative(),
  }
}

/**
 * Убирает хвостовые нули после десятичной точки: "1.0000" → "1", "0.5000" → "0.5".
 */
function stripTrailingZeros(s: string): string {
  if (!s.includes('.')) return s
  let out = s.replace(/0+$/, '')
  if (out.endsWith('.')) out = out.slice(0, -1)
  return out
}

/**
 * Округляет BigNumber до 4 знаков после запятой (для отображения и очков).
 *
 * - |x| < 1e6 → обычная запись, до 4 знаков после запятой.
 * - |x| >= 1e6 → научная нотация, мантисса до 4 знаков.
 *
 * Знак для больших чисел теряется (как и в serializeBigNumber) — для очков
 * отрицательные результаты всё равно дают 0.
 */
export function roundBigNumber(bn: BigNumber): SerializedBigNumber {
  if (bn.isNaN()) return { value: 'NaN', exponent: 0, negative: false }
  if (!bn.isFinite()) {
    return { value: bn.isNegative() ? '-∞' : '∞', exponent: 0, negative: bn.isNegative() }
  }
  const negative = bn.isNegative()
  const abs = bn.abs()
  if (abs.lt(1e6)) {
    const num = abs.toNumber()
    const rounded = num.toFixed(4)
    const cleaned = stripTrailingZeros(rounded)
    return { value: (negative ? '-' : '') + cleaned, exponent: 0, negative }
  }
  const expStr = abs.toExponential(4).split('e')[1]
  const exp = parseInt(expStr, 10)
  const mantStr = abs.toExponential(4).split('e')[0]
  const cleaned = stripTrailingZeros(mantStr)
  return { value: cleaned, exponent: exp, negative }
}
