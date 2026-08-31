import { create, all, type BigNumber } from 'mathjs'
import type { ExpressionToken } from '../../entities/expression'
import { serializeBigNumber, type SerializedBigNumber } from '../../shared/lib/formatHugeNumber'
import { validateSyntax, SYNTAX_MESSAGES } from './syntax'

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
 */
export interface EvaluationResult {
  ok: boolean
  result?: SerializedBigNumber
  error?: string
}

/**
 * Преобразует массив токенов в строку выражения для mathjs.
 */
export function tokensToString(tokens: ExpressionToken[]): string {
  return tokens.map((t) => t.value).join('')
}

/**
 * Вычисляет строку выражения.
 *
 * Валидация происходит ТОЛЬКО здесь (при нажатии "Вычислить"),
 * никогда на лету при вводе.
 */
export function evaluateString(expr: string): EvaluationResult {
  if (expr.trim() === '') {
    return { ok: false, error: 'Пустое выражение' }
  }

  let node
  try {
    node = math.parse(expr)
  } catch {
    return { ok: false, error: 'Неполное или некорректное выражение' }
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

  // mathjs может вернуть Complex (например, sqrt(-1), (-1)^0.5), строку
  // или другой тип. Для игры нужен ТОЛЬКО вещественный BigNumber.
  if (!math.isBigNumber(value)) {
    return { ok: false, error: 'Некорректный аргумент' }
  }

  const bigValue = value as BigNumber

  if (bigValue.isNaN()) {
    return { ok: false, error: 'Некорректный аргумент' }
  }

  // mathjs BigNumber возвращает Infinity при делении на ноль, не бросая исключение
  if (!bigValue.isFinite()) {
    return { ok: false, error: 'Деление на ноль!' }
  }

  return { ok: true, result: serializeBigNumber(bigValue) }
}

/**
 * Вычисляет выражение из токенов.
 * Сначала — строгая синтаксическая валидация на уровне токенов,
 * затем — вычисление через mathjs.
 */
export function evaluateExpression(tokens: ExpressionToken[]): EvaluationResult {
  const syntaxError = validateSyntax(tokens)
  if (syntaxError) {
    return { ok: false, error: SYNTAX_MESSAGES[syntaxError] }
  }
  return evaluateString(tokensToString(tokens))
}
