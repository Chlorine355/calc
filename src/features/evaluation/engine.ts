import { create, all, type BigNumber } from 'mathjs'
import type { ExpressionToken } from '../../entities/expression'
import {
  serializeBigNumber,
  roundBigNumber,
  type SerializedBigNumber,
} from '../../shared/lib/formatHugeNumber'
import { validateSyntax, SYNTAX_MESSAGES } from './syntax'
import { isAstronomicallyHuge, isHugeNegative } from './magnitude'

/**
 * Экземпляр mathjs с включённым BigNumber.
 * Создаётся один раз на уровне модуля.
 */
const math = create(all, {
  number: 'BigNumber',
  precision: 64,
})

/**
 * Результат вычисления выражения.
 *
 * - `result` — «сырое» значение (для внутренних нужд).
 * - `rounded` — значение, округлённое до 4 знаков после запятой.
 *   Именно его показываем игроку и от него считаем очки/цель.
 */
export interface EvaluationResult {
  ok: boolean
  result?: SerializedBigNumber
  rounded?: SerializedBigNumber
  error?: string
  /** true, если результат астрономически огромен (ОЧЕНЬ БОЛЬШОЕ ЧИСЛО). */
  huge?: boolean
  /** Знак астрономически огромного результата (true — отрицательный). Только при huge. */
  hugeNegative?: boolean
}

/**
 * Преобразует массив токенов в строку выражения для mathjs.
 */
export function tokensToString(tokens: ExpressionToken[]): string {
  return tokens.map((t) => t.value).join('')
}

/**
 * Вычисляет строку выражения через mathjs (для генератора целей и тестов).
 * Функция НИКОГДА не бросает исключений.
 */
export function evaluateString(expr: string): EvaluationResult {
  try {
    if (expr.trim() === '') {
      return { ok: false, error: 'Пустое выражение' }
    }

    let node
    try {
      node = math.parse(expr)
    } catch {
      return { ok: false, error: 'Неполное или некорректное выражение' }
    }

    // Астрономически огромный результат (например, 9^(9^9)): mathjs материализует
    // целое с миллионами разрядов и роняет воркер ДО того, как сработает try/catch.
    // Оцениваем порядок по дереву и коротко замыкаем, не вызывая evaluate().
    if (isAstronomicallyHuge(node)) {
      return { ok: true, huge: true, hugeNegative: isHugeNegative(node) }
    }

    let value: unknown
    try {
      value = node.evaluate()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/divide by zero|division by zero/i.test(msg)) {
        return { ok: false, error: 'Деление на ноль!' }
      }
      if (/negative|logarithm|sqrt|root/i.test(msg)) {
        return { ok: false, error: 'Некорректный аргумент' }
      }
      return { ok: false, error: 'Неполное или некорректное выражение' }
    }

    if (!math.isBigNumber(value)) {
      return { ok: false, error: 'Некорректный аргумент' }
    }

    const bigValue = value as BigNumber

    if (bigValue.isNaN()) {
      return { ok: false, error: 'Некорректный аргумент' }
    }

    if (!bigValue.isFinite()) {
      return { ok: false, error: 'Деление на ноль!' }
    }

    const result = serializeBigNumber(bigValue)
    return { ok: true, result, rounded: roundBigNumber(bigValue) }
  } catch {
    return { ok: false, error: 'Неполное или некорректное выражение' }
  }
}

/**
 * Преобразует токены в строку для mathjs, заменяя унарный `√` на `sqrt(...)`.
 * `√` применяется к следующему первичному операнду: числу или скобочной группе.
 */
function tokensToMathString(tokens: ExpressionToken[]): string {
  let out = ''
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t.type === 'operator' && t.value === '√') {
      // следующий токен — число или `(`
      const next = tokens[i + 1]
      if (next && next.type === 'number') {
        out += `sqrt(${next.raw !== undefined ? next.raw : next.value})`
        i += 2
        continue
      }
      if (next && next.type === 'parenthesis' && next.value === '(') {
        // найти парную закрывающую скобку
        let depth = 0
        let j = i + 1
        for (; j < tokens.length; j++) {
          const tj = tokens[j]
          if (tj.type === 'parenthesis') {
            if (tj.value === '(') depth++
            else {
              depth--
              if (depth === 0) break
            }
          }
        }
        const inner = tokensToMathString(tokens.slice(i + 1, j + 1))
        out += `sqrt(${inner})`
        i = j + 1
        continue
      }
      // неожиданный случай — просто пропускаем
      out += 'sqrt('
      i++
      continue
    }
    out += t.value
    i++
  }
  return out
}

/**
 * Вычисляет выражение из токенов.
 * Сначала — строгая синтаксическая валидация, затем — вычисление через mathjs
 * (с преобразованием `√` → `sqrt(...)`).
 *
 * Функция НИКОГДА не бросает исключений.
 */
export function evaluateOne(tokens: ExpressionToken[]): EvaluationResult {
  try {
    const syntaxError = validateSyntax(tokens)
    if (syntaxError) {
      return { ok: false, error: SYNTAX_MESSAGES[syntaxError] }
    }
    return evaluateString(tokensToMathString(tokens))
  } catch {
    return { ok: false, error: 'Неполное или некорректное выражение' }
  }
}

/**
 * Вычисляет выражение из токенов (алиас для обратной совместимости).
 * Функция НИКОГДА не бросает исключений.
 */
export function evaluateExpression(tokens: ExpressionToken[]): EvaluationResult {
  return evaluateOne(tokens)
}
