import type { Level } from '../../entities/level'
import { greedyTarget } from './target'
import { evaluateString } from '../evaluation/engine'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

/**
 * Детерминированный генератор уровней.
 *
 * Для MVP уровни захардкожены вручную (как рекомендовано в prompt.md).
 * Каждый уровень гарантирует:
 * 1. Решение существует (тривиальное сложение/умножение всегда даёт результат)
 * 2. Есть "оптимальное" решение (не просто сложение)
 * 3. Разброс между худшим и лучшим решением — минимум в 10x
 *
 * targetScore — это log10 от целевого значения. Игрок должен собрать
 * выражение, чей результат по log10 превосходит targetScore.
 */

interface LevelSpec {
  numbers: number[]
  operators: string[]
}

// Правило: бинарных операторов ровно (число_чисел − 1), чтобы их можно было
// использовать все. Плюс опционально один унарный '!'. Скобки не считаются.
// В наборах есть и увеличивающие (+, *, ^), и уменьшающие (-, /) операторы,
// чтобы вынуждать игрока использовать все.
//
// targetScore НЕ захардкожен — он вычисляется жадным алгоритмом
// (см. greedyTarget) для каждого набора автоматически.
const LEVELS: LevelSpec[] = [
  // --- Уровни 1-3: 3 числа, 2 бинарных ---
  // операторов всегда ровно (числа − 1). Никаких унарных на старте.
  { numbers: [2, 3, 4], operators: ['+', '*'] },
  { numbers: [2, 5, 6], operators: ['+', '*'] },
  { numbers: [4, 5, 7], operators: ['+', '*'] },
  // --- Уровни 4-6: появляются - и / среди бинарных ---
  { numbers: [7, 8, 9], operators: ['*', '-'] },
  { numbers: [4, 7, 8], operators: ['*', '/'] },
  { numbers: [6, 7, 8], operators: ['-', '/'] },
  // --- Уровни 7-9: 4 числа, 3 бинарных, добавляется '^' ---
  { numbers: [2, 3, 4, 5], operators: ['+', '*', '^'] },
  { numbers: [3, 4, 5, 6], operators: ['*', '-', '^'] },
  { numbers: [4, 6, 7, 8], operators: ['*', '/', '^'] },
  // --- Уровни 10-12: 5 чисел, 4 бинарных, добавляется '!' ---
  { numbers: [5, 6, 7, 8, 9], operators: ['+', '*', '-', '^', '!'] },
  { numbers: [3, 5, 7, 8, 9], operators: ['+', '*', '/', '^', '!'] },
  { numbers: [4, 5, 7, 8, 9], operators: ['*', '/', '-', '^', '!'] },
  // --- Уровни 13-14: 6 чисел, 5 бинарных, скобки ---
  { numbers: [2, 3, 4, 5, 6, 7], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [3, 4, 5, 6, 7, 8], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  // --- Уровни 15-16: унарный корень √ (в дополнение к факториалу) ---
  { numbers: [4, 5, 6, 7, 8, 9], operators: ['+', '*', '-', '/', '^', '√', '!', '()'] },
  { numbers: [4, 6, 7, 8, 9, 9], operators: ['+', '*', '-', '/', '^', '√', '!', '()'] },
]

/**
 * Возвращает уровень по номеру. Цель вычисляется жадным алгоритмом
 * автоматически для любого набора чисел и операторов.
 */
export function generateLevel(level: number): Level {
  const idx = level - 1
  if (idx < LEVELS.length) {
    return buildLevel(LEVELS[idx], level, true)
  }

  // Бесконечный режим: случайный, но решаемый набор, без цели.
  // Число чисел растёт с уровнем, но не больше 6.
  const n = Math.min(4 + Math.floor((level - LEVELS.length) / 4), 6)
  return generateRandomLevel(n, level, false)
}

/**
 * Собирает Level из набора чисел и операторов: считает цель и пример-решение
 * жадным алгоритмом. Общий для всех режимов (захардкоженные уровни,
 * бесконечный режим, «Часовая бомба»).
 */
function buildLevel(
  spec: LevelSpec,
  level: number,
  hasTarget: boolean,
): Level {
  const { targetScore, example } = greedyTarget(spec.numbers, spec.operators)
  return {
    level,
    numbers: spec.numbers,
    operators: spec.operators,
    hasTarget,
    targetScore,
    example,
  }
}

// --- Случайная генерация уровней (после захардкоженных) ---

const BINARY_POOL = ['+', '-', '*', '/', '^'] as const
const PERFECT_SQUARES = [1, 4, 9]

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Случайные числа 1..9 с разнообразием (не все одинаковые).
 * Если в наборе есть `√` — гарантируем хотя бы один идеальный квадрат,
 * иначе корень некуда применить и уровень станет непроходимым.
 */
function randomNumbers(n: number, needSquare: boolean): number[] {
  const nums: number[] = []
  for (let i = 0; i < n; i++) {
    nums.push(1 + Math.floor(Math.random() * 9))
  }
  if (needSquare && !nums.some((v) => PERFECT_SQUARES.includes(v))) {
    nums[0] = pickRandom(PERFECT_SQUARES)
  }
  // разнообразие: если все одинаковые — меняем одно
  if (new Set(nums).size === 1) {
    nums[0] = nums[0] === 9 ? 1 : nums[0] + 1
  }
  return nums
}

/**
 * Случайные бинарные операторы (ровно count штук, без повторов).
 * Гарантируем хотя бы один «растущий» (+, *, ^), чтобы цель была интересной.
 */
function randomBinary(count: number): string[] {
  const growing = pickRandom(['+', '*', '^'])
  const rest = shuffle(BINARY_POOL.filter((o) => o !== growing)).slice(0, count - 1)
  return shuffle([growing, ...rest])
}

/**
 * Случайные унарные операторы: `!` и/или `√`. Каждый — необязательный.
 */
function randomUnary(): string[] {
  const unary: string[] = []
  if (Math.random() < 0.5) unary.push('!')
  if (Math.random() < 0.4) unary.push('√')
  return unary
}

/**
 * Использует ли пример-решение все операторы набора.
 * Если нет — уровень непроходим (игрок обязан использовать все операторы).
 */
export function usesAllOperators(example: string, operators: string[]): boolean {
  for (const op of operators) {
    if (op === '()') {
      if (!example.includes('(')) return false
    } else if (op === '√') {
      // `√` в примере записывается как `sqrt(...)` (mathjs-форма).
      if (!example.includes('sqrt(')) return false
    } else if (!example.includes(op)) {
      return false
    }
  }
  return true
}

/**
 * Генерирует случайный, но решаемый уровень для бесконечного режима.
 * - бинарных операторов ровно (числа − 1)
 * - скобки парные (токен '()'), корень √ — унарный
 * - пример цели использует все операторы (иначе перегенерируем)
 *
 * @param n — число чисел в наборе.
 * @param level — номер уровня (для поля level в результате).
 * @param hasTarget — показывать ли цель. Для обычного бесконечного режима — false
 *   (игрок собирает любое выражение); для «Часовой бомбы» — true (нужно превзойти цель).
 */
function generateRandomLevel(n: number, level: number, hasTarget: boolean): Level {
  for (let attempt = 0; attempt < 20; attempt++) {
    const unary = randomUnary()
    const needSquare = unary.includes('√')
    const numbers = randomNumbers(n, needSquare)
    const binary = randomBinary(n - 1)
    const hasParens = Math.random() < 0.5
    const operators = [...binary, ...unary, ...(hasParens ? ['()'] : [])]

    const { example } = greedyTarget(numbers, operators)
    if (!usesAllOperators(example, operators)) continue

    // targetScore/example всё равно считаем — по ним проверяем решаемость
    // (usesAllOperators), но в интерфейсе цель показываем только если hasTarget.
    return buildLevel({ numbers, operators }, level, hasTarget)
  }

  // Запасной вариант: последний захардкоженный набор
  return buildLevel(LEVELS[LEVELS.length - 1], level, hasTarget)
}

/**
 * Генерирует случайный уровень для режима «Часовая бомба»: всегда с целью.
 * Число чисел фиксировано (4), чтобы примеры были решаемыми за короткое время.
 * Не зависит от номера уровня (в бомбе нет прогрессии уровней).
 */
export function generateBombLevel(): Level {
  return generateRandomLevel(4, 1, true)
}

// --- Ежедневное испытание ---

/** Детерминированный PRNG (mulberry32) — сидируется датой, чтобы уровень был
 *  одинаковым для всех в течение дня, но менялся каждый день. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Хэш строки в 32-битное число (для сидирования PRNG датой). */
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Строит плоскую цепочку n1 op1 n2 op2 n3 ... и возвращает log10 результата. */
function flatChainLog10(nums: number[], ops: string[]): number {
  const expr = nums.map((n, i) => (i === 0 ? String(n) : `${ops[i - 1]}${n}`)).join('')
  const r = evaluateString(expr)
  if (!r.ok || !r.rounded) return -Infinity
  return serializedLog10(r.rounded)
}

/**
 * Цель «Ежедневного испытания»: максимум log10 по нескольким стратегическим
 * порядкам операторов (^ в начало — правоассоциативно и даёт максимум, затем
 * * и +). Кап — чтобы цель была достижимой, но не астрономической.
 */
function dailyTarget(numbers: number[], operators: string[]): number {
  const nums = [...numbers].sort((a, b) => b - a)
  const priority: Record<string, number> = { '^': 0, '*': 1, '+': 2, '-': 3, '/': 4 }
  const sorted = [...operators].sort((a, b) => priority[a] - priority[b])
  const orderings = [sorted, [...sorted].reverse(), operators]

  let best = -Infinity
  for (const ops of orderings) {
    const log = flatChainLog10(nums, ops)
    if (log > best) best = log
  }
  // Кап: если вышло астрономически (или нечисловое) — ставим скромный порог,
  // чтобы уровень был проходим (игрок может превзойти его большим выражением).
  if (!isFinite(best) || best > 1000) return 1000
  return best
}

/**
 * Генерирует уровень «Ежедневного испытания»: 10 чисел, 9 бинарных операторов
 * (без факториала), детерминированно по дате. Числа и операторы могут повторяться.
 * Цель — достижимый, но не астрономический порог.
 */
export function generateDailyLevel(dateKey: string): Level {
  const rng = mulberry32(hashString(dateKey))
  const numbers = Array.from({ length: 10 }, () => 1 + Math.floor(rng() * 9))
  const pool = ['+', '-', '*', '/', '^']
  const operators = Array.from({ length: 9 }, () => pool[Math.floor(rng() * pool.length)])
  // Гарантируем хотя бы один '^' (иначе цель слишком мала), но не слишком много,
  // чтобы результат не взорвался в астрономию.
  if (!operators.includes('^')) operators[0] = '^'

  const targetScore = dailyTarget(numbers, operators)
  return {
    level: 0,
    numbers,
    operators,
    hasTarget: true,
    targetScore,
    example: '',
  }
}

/**
 * Максимальный захардкоженный уровень.
 */
export const MAX_HARDCODED_LEVEL = LEVELS.length
