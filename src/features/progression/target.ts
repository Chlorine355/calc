import { evaluateString } from '../evaluation/engine'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

/**
 * Жадный алгоритм генерации целевого значения уровня.
 *
 * Правила игры:
 * - каждое число используется ровно один раз
 * - бинарных операторов ровно (число_чисел − 1), использование обязательно
 * - унарные операторы (√, !) обязательно используются, если даны
 *
 * Алгоритм (линейный, быстрый):
 * 1. Перебирает все перестановки бинарных операторов (≤120).
 * 2. Для каждой строит левоассоциативную цепочку `((a op b) op c)...`.
 * 3. Применяет унарные операторы к отдельным простым числам (√ к квадрату,
 *    `!` к малому числу) и `!` к результату целиком, если он мал.
 * 4. Выбирает максимум log10 округлённого результата.
 *
 * Безопасность: `^` только на первом шаге (простое число)^(простое число),
 * `!` только к малым значениям — иначе decimal.js зависает.
 */
export function greedyTarget(
  numbers: number[],
  operators: string[]
): { targetScore: number; example: string } {
  const nums = [...numbers].sort((a, b) => b - a)
  const binary = operators.filter((o) => o !== '√' && o !== '!' && o !== '()')
  const unary = operators.filter((o) => o === '√' || o === '!')
  // Скобки доступны игроку только если '()' есть в наборе уровня.
  // Иначе цель должна быть достижима БЕЗ скобок (иначе уровень непроходим).
  const hasParens = operators.includes('()')

  let bestExpr = ''
  let bestLog = -Infinity

  for (const perm of permutations(binary)) {
    const candidates = buildWithPermutation(nums, perm, unary, hasParens)
    for (const expr of candidates) {
      const logVal = evalLog10(expr)
      if (logVal > bestLog && isFinite(logVal)) {
        bestLog = logVal
        bestExpr = expr
      }
    }
  }

  return { targetScore: bestLog, example: bestExpr }
}

/**
 * Применяет унарные операторы к простому числу (лист дерева).
 * - `√` — только к идеальному квадрату ≥ 0
 * - `!` — только к небольшому числу (0..1000)
 */
function applyUnaryToLeaf(n: string, unary: string[]): string[] {
  if (!/^-?\d+$/.test(n)) return [n]
  const v = parseInt(n, 10)
  const res = [n]
  if (unary.includes('√') && v >= 0 && Number.isInteger(Math.sqrt(v))) {
    res.push(`√${n}`)
  }
  if (unary.includes('!') && v >= 0 && v <= 1000) {
    res.push(`${n}!`)
  }
  return res
}

/**
 * Строит все выражения из чисел по убыванию и перестановки бинарных операторов.
 * `^` допустим только на первом шаге (число^число).
 * Если `hasParens` false — использует плоскую (левоассоциативную, без скобок)
 * цепочку, достижимую без скобок ввода.
 */
function buildWithPermutation(
  nums: number[],
  ops: string[],
  unary: string[],
  hasParens: boolean
): string[] {
  if (!hasParens) {
    // без скобок: строго левоассоциативная цепочка a1 op1 a2 op2 a3 ...
    let expr = applyUnaryToLeaf(String(nums[0]), unary)
    for (let i = 1; i < nums.length; i++) {
      const op = ops[i - 1]
      const next: string[] = []
      for (const left of expr) {
        // без скобок правый операнд — простое число
        if (op === '^' && !isSimplePosInt(left)) continue
        const right = String(nums[i])
        next.push(`${left}${op}${right}`)
      }
      expr = next
    }
    const withEndFact: string[] = []
    for (const e of expr) {
      withEndFact.push(e, ...applyFactorialToSmallResult(e, unary))
    }
    return withEndFact
  }

  // со скобками: полностью вложенная цепочка ((a op1 b) op2 c) ...
  let exprSet = applyUnaryToLeaf(String(nums[0]), unary)
  for (let i = 1; i < nums.length; i++) {
    const op = ops[i - 1]
    const rightLeaves = applyUnaryToLeaf(String(nums[i]), unary)
    const next: string[] = []
    for (const left of exprSet) {
      for (const right of rightLeaves) {
        if (op === '^' && !(isSimplePosInt(left) && isSimplePosInt(right))) continue
        next.push(`(${left})${op}(${right})`)
      }
    }
    exprSet = next
  }
  const withEndFact: string[] = []
  for (const e of exprSet) {
    withEndFact.push(e, ...applyFactorialToSmallResult(e, unary))
  }
  return withEndFact
}

function isSimplePosInt(s: string): boolean {
  return /^-?\d+$/.test(s)
}

/** `!` от результата целиком, если он небольшой (иначе зависнет). */
function applyFactorialToSmallResult(expr: string, unary: string[]): string[] {
  if (!unary.includes('!')) return []
  const res = evaluateString(expr)
  if (!res.ok || !res.result) return []
  if (res.result.exponent > 4) return [] // слишком большое значение
  const n = parseFloat(res.result.value)
  if (!isFinite(n) || n < 0 || n > 1000) return []
  return [`(${expr})!`]
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
 * Вычисляет log10 округлённого результата строки выражения. При неудаче — -Infinity.
 */
function evalLog10(expr: string): number {
  const res = evaluateString(expr)
  if (!res.ok || !res.result || !res.rounded) return -Infinity
  return serializedLog10(res.rounded)
}
