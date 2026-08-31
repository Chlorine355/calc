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
  // Сколько пар скобок доступно игроку. Если '()' нет в наборе — 0 (цель
  // должна быть достижима без скобок, иначе уровень непроходим).
  const parenPairs = operators.includes('()') ? 2 : 0

  // Кэш результатов evaluateString: генератор строит много повторяющихся строк
  // выражений, а парсинг+вычисление — самая дорогая часть. Кэш режет это в разы.
  // Кэшируем и порядок результата (для факториального кандидата), и его величину.
  const evalCache = new Map<string, number>() // expr -> log10 (или -Inf)
  const resCache = new Map<string, { ok: boolean; exponent: number; value: string }>()
  const evalLog = (expr: string): number => {
    const hit = evalCache.get(expr)
    if (hit !== undefined) return hit
    const r = evaluateString(expr)
    const v =
      r.ok && r.result ? serializedLog10(r.rounded ?? r.result) : Number.NEGATIVE_INFINITY
    evalCache.set(expr, v)
    resCache.set(expr, { ok: r.ok, exponent: r.result?.exponent ?? 0, value: r.result?.value ?? '' })
    return v
  }
  // Отдельная запись для факториального кандидата `(expr)!` — он вычисляется
  // один раз, когда понадобится, а не при каждой проверке.
  const factCache = new Map<string, number>()

  let bestExpr = ''
  let bestLog = -Infinity

  for (const perm of permutations(binary)) {
    const candidates = buildWithPermutation(nums, perm, unary, parenPairs, {
      evalLog,
      factCache,
      evalFactorial: (expr) => {
        const hit = factCache.get(expr)
        if (hit !== undefined) return hit
        const v = evalLog(`(${expr})!`)
        factCache.set(expr, v)
        return v
      },
    })
    for (const expr of candidates) {
      const logVal = evalLog(expr)
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
 *
 * Возвращает варианты листа и флаг, использован ли на нём `!`.
 */
function applyUnaryToLeaf(
  n: string,
  unary: string[]
): { expr: string; factUsed: boolean }[] {
  if (!/^-?\d+$/.test(n)) return [{ expr: n, factUsed: false }]
  const v = parseInt(n, 10)
  const res: { expr: string; factUsed: boolean }[] = [{ expr: n, factUsed: false }]
  if (unary.includes('√') && v >= 0 && Number.isInteger(Math.sqrt(v))) {
    res.push({ expr: `√${n}`, factUsed: false })
  }
  if (unary.includes('!') && v >= 0 && v <= 1000) {
    res.push({ expr: `${n}!`, factUsed: true })
  }
  return res
}

/**
 * Строит левоассоциативную цепочку a1 op1 a2 op2 a3 ..., группируя в скобки
 * только позиции из `wrapStarts` (каждая позиция — одна пара скобок).
 * `^` допустим только от одиночного числа (число^число).
 *
 * У игрока `!` — один токен, поэтому `!` применяется не более чем к одному листу
 * (иначе цель станет недостижимой). Это же убирает экспоненциальный раздув
 * вариантов (2^N) и ускоряет генерацию.
 */
function buildChain(
  nums: number[],
  ops: string[],
  unary: string[],
  wrapStarts: number[]
): string[] {
  const wrapSet = new Set(wrapStarts)
  // exprs: { expr, factUsed } — сколько `!` уже потрачено на листьях.
  let exprs = applyUnaryToLeaf(String(nums[0]), unary)
  for (let i = 1; i < nums.length; i++) {
    const op = ops[i - 1]
    const rightLeaves = applyUnaryToLeaf(String(nums[i]), unary)
    const next: { expr: string; factUsed: boolean }[] = []
    for (const left of exprs) {
      for (const right of rightLeaves) {
        // `!` уже использован на другом листе — этот вариант пропускаем.
        if (left.factUsed && right.factUsed) continue
        if (op === '^' && !(isSimplePosInt(left.expr) && isSimplePosInt(right.expr))) continue
        const wrap = wrapSet.has(i - 1)
        const expr = wrap
          ? `(${left.expr})${op}(${right.expr})`
          : `${left.expr}${op}${right.expr}`
        next.push({ expr, factUsed: left.factUsed || right.factUsed })
      }
    }
    exprs = next
  }
  return exprs.map((e) => e.expr)
}

/**
 * Строит все выражения из чисел по убыванию и перестановки бинарных операторов,
 * используя не более `parenPairs` пар скобок.
 * - 0 пар: плоская левоассоциативная цепочка (всегда достижима).
 * - 1 пара: группировка любой соседней пары.
 * - 2 пары: две непересекающиеся группировки.
 */
/** Кэш-контекст для генерации: общий кэш логарифмов и кэш факториальных кандидатов. */
interface GenCache {
  evalLog: (expr: string) => number
  factCache: Map<string, number>
  evalFactorial: (expr: string) => number
}

function buildWithPermutation(
  nums: number[],
  ops: string[],
  unary: string[],
  parenPairs: number,
  cache: GenCache
): string[] {
  const results = new Set<string>()
  const n = nums.length

  const add = (exprs: string[]) => {
    for (const e of exprs) {
      results.add(e)
      // `(expr)!` требует скобок — только если они доступны игроку.
      // Иначе `!` применяется к листу (5!), что уже делает applyUnaryToLeaf.
      for (const f of applyFactorialToSmallResult(e, unary, parenPairs > 0, cache))
        results.add(f)
    }
  }

  // 0 пар — плоская цепочка.
  add(buildChain(nums, ops, unary, []))

  if (parenPairs <= 0) return [...results]

  // 1 пара — группируем любую соседнюю пару.
  for (let i = 0; i < n - 1; i++) {
    add(buildChain(nums, ops, unary, [i]))
  }

  // 2 пары — две непересекающиеся группировки.
  if (parenPairs >= 2) {
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n - 1; j++) {
        add(buildChain(nums, ops, unary, [i, j]))
      }
    }
  }

  return [...results]
}

function isSimplePosInt(s: string): boolean {
  return /^-?\d+$/.test(s)
}

/** `!` от результата целиком, если он небольшой (иначе зависнет). */
function applyFactorialToSmallResult(
  expr: string,
  unary: string[],
  hasParensForWrap: boolean,
  cache: GenCache
): string[] {
  if (!unary.includes('!')) return []
  if (!hasParensForWrap) return []
  // У игрока один токен `!`: если он уже потрачен на лист (внутри expr), то
  // `(expr)!` не ввести — уровень станет недостижимым.
  if (expr.includes('!')) return []
  // Если результат велик, его факториал соберёт невообразимое число и ронял
  // воркер. Факториал безопасен только от малого основания (значение < 1000,
  // т.е. log10 < 3 — как и `!` на листе в applyUnaryToLeaf).
  const logVal = cache.evalLog(expr)
  if (!isFinite(logVal) || logVal > 3) return []
  // Кандидат `(expr)!` вычисляется один раз (через кэш), не двойным вызовом.
  const factLog = cache.evalFactorial(expr)
  if (!isFinite(factLog)) return []
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

