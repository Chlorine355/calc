import { evaluateString } from '../evaluation/engine'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'
import { isBinaryOperator, isFactorialOperator } from '../../entities/operator'

/**
 * Жадный алгоритм генерации целевого значения уровня.
 *
 * Правила игры:
 * - каждое число используется ровно один раз
 * - каждый оператор используется ровно один раз (включая уменьшающие - и /)
 * - бинарных операторов ровно (число_чисел − 1)
 *
 * Поэтому жадный алгоритм перебирает ВСЕ перестановки бинарных операторов
 * (их ≤5 → ≤120 вариантов) и для каждой строит выражение, используя числа
 * по убыванию. Выбирается перестановка, дающая максимум log10. Это
 * гарантирует, что цель достижима в рамках правил.
 *
 * Безопасность вычислений:
 * - `^` применим только к простому числу (первый шаг), иначе выражение
 *   станет невычислимым (например, 9^9^9).
 * - `!` (унарный) применяется в конце только к малому основанию (<= 1000).
 */
export function greedyTarget(
  numbers: number[],
  operators: string[]
): { targetScore: number; example: string } {
  const nums = [...numbers].sort((a, b) => b - a)
  const binary = operators.filter(isBinaryOperator)
  const hasFactorial = operators.some(isFactorialOperator)

  let bestExpr = ''
  let bestLog = -Infinity

  // Перебираем все перестановки бинарных операторов
  for (const perm of permutations(binary)) {
    const expr = buildWithPermutation(nums, perm)
    if (expr === null) continue // невычислимая перестановка (^ не на первом месте)

    let candidate = expr
    // Факториал в конце, если основание малое
    if (hasFactorial) {
      const base = evalNumber(candidate)
      if (base !== null && base <= 1000) {
        const withFact = `(${candidate})!`
        if (evalLog10(withFact) > evalLog10(candidate)) {
          candidate = withFact
        }
      }
    }

    const logVal = evalLog10(candidate)
    if (logVal > bestLog && isFinite(logVal)) {
      bestLog = logVal
      bestExpr = candidate
    }
  }

  return { targetScore: bestLog, example: bestExpr }
}

/**
 * Строит выражение из чисел (по убыванию) и перестановки бинарных операторов.
 * `^` допустим только на первом шаге (когда expr — простое число).
 * Возвращает null, если перестановка невычислима.
 */
function buildWithPermutation(nums: number[], ops: string[]): string | null {
  let expr = String(nums[0])
  for (let i = 1; i < nums.length; i++) {
    const op = ops[i - 1]
    if (op === '^' && !/^\d+$/.test(expr)) {
      return null // ^ не на первом месте — невычислимо
    }
    expr = `(${expr})${op}${nums[i]}`
  }
  return expr
}

/**
 * Все перестановки массива.
 */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const result: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) {
      result.push([arr[i], ...p])
    }
  }
  return result
}

/**
 * Вычисляет log10 результата строки выражения. При неудаче — -Infinity.
 */
function evalLog10(expr: string): number {
  const res = evaluateString(expr)
  if (!res.ok || !res.result) return -Infinity
  return serializedLog10(res.result)
}

/**
 * Вычисляет числовое значение выражения, если оно мало (<= 1e6).
 * Выражения со степенью не вычисляем (могут быть гигантскими).
 */
function evalNumber(expr: string): number | null {
  if (expr.includes('^')) return null
  const res = evaluateString(expr)
  if (!res.ok || !res.result) return null
  if (res.result.exponent > 6) return null
  return parseFloat(res.result.value)
}
