import type { Level } from '../../entities/level'
import { greedyTarget } from './target'

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
  // --- Уровни 1-4: 3 числа, 2 бинарных ---
  // операторов всегда ровно (числа − 1). Никаких унарных на старте.
  { numbers: [2, 3, 4], operators: ['+', '*'] },
  { numbers: [3, 4, 5], operators: ['+', '*'] },
  { numbers: [2, 5, 6], operators: ['+', '*'] },
  { numbers: [4, 5, 7], operators: ['+', '*'] },
  // --- Уровни 5-8: появляются - и / среди бинарных ---
  { numbers: [7, 8, 9], operators: ['*', '-'] },
  { numbers: [4, 7, 8], operators: ['*', '/'] },
  { numbers: [6, 7, 8], operators: ['-', '/'] },
  { numbers: [3, 8, 9], operators: ['+', '/'] },
  // --- Уровни 9-12: 4 числа, 3 бинарных, добавляется '^' ---
  { numbers: [2, 3, 4, 5], operators: ['+', '*', '^'] },
  { numbers: [3, 4, 5, 6], operators: ['*', '-', '^'] },
  { numbers: [2, 5, 6, 7], operators: ['+', '/', '^'] },
  { numbers: [4, 6, 7, 8], operators: ['*', '/', '^'] },
  // --- Уровни 13-16: 5 чисел, 4 бинарных, добавляется '!' ---
  { numbers: [5, 6, 7, 8, 9], operators: ['+', '*', '-', '^', '!'] },
  { numbers: [4, 6, 7, 8, 9], operators: ['*', '/', '-', '^', '!'] },
  { numbers: [3, 5, 7, 8, 9], operators: ['+', '*', '/', '^', '!'] },
  { numbers: [4, 5, 7, 8, 9], operators: ['*', '/', '-', '^', '!'] },
  // --- Уровни 17-20: 6 чисел, 5 бинарных, скобки ---
  { numbers: [2, 3, 4, 5, 6, 7], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [3, 4, 5, 6, 7, 8], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [2, 4, 5, 6, 7, 8], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [3, 5, 6, 7, 8, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  // --- Уровни 21-23: унарный корень √ (в дополнение к факториалу) ---
  { numbers: [4, 5, 6, 7, 8, 9], operators: ['+', '*', '-', '/', '^', '√', '!', '()'] },
  { numbers: [4, 5, 7, 8, 9, 9], operators: ['+', '*', '-', '/', '^', '√', '()'] },
  { numbers: [4, 6, 7, 8, 9, 9], operators: ['+', '*', '-', '/', '^', '√', '!', '()'] },
]

/**
 * Возвращает уровень по номеру. Цель вычисляется жадным алгоритмом
 * автоматически для любого набора чисел и операторов.
 */
export function generateLevel(level: number): Level {
  const idx = level - 1
  if (idx < LEVELS.length) {
    const spec = LEVELS[idx]
    const { targetScore, example } = greedyTarget(spec.numbers, spec.operators)
    return {
      level,
      numbers: spec.numbers,
      operators: spec.operators,
      hasTarget: true,
      targetScore,
      example,
    }
  }

  // Бесконечный режим: случайный, но решаемый набор, без цели
  return generateRandomLevel(level)
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
 */
function generateRandomLevel(level: number): Level {
  // Число чисел растёт с уровнем, но не больше 6
  const n = Math.min(4 + Math.floor((level - LEVELS.length) / 4), 6)

  for (let attempt = 0; attempt < 20; attempt++) {
    const unary = randomUnary()
    const needSquare = unary.includes('√')
    const numbers = randomNumbers(n, needSquare)
    const binary = randomBinary(n - 1)
    const hasParens = Math.random() < 0.5
    const operators = [...binary, ...unary, ...(hasParens ? ['()'] : [])]

    const { targetScore, example } = greedyTarget(numbers, operators)
    if (!usesAllOperators(example, operators)) continue

    // Генерируемый уровень без цели: игрок собирает любое выражение.
    // targetScore/example всё равно считаем — по ним проверяем решаемость
    // (usesAllOperators), но в интерфейсе цель не показываем.
    return { level, numbers, operators, hasTarget: false, targetScore, example }
  }

  // Запасной вариант: последний захардкоженный набор, но без цели
  const base = LEVELS[LEVELS.length - 1]
  const { targetScore, example } = greedyTarget(base.numbers, base.operators)
  return {
    level,
    numbers: base.numbers,
    operators: base.operators,
    hasTarget: false,
    targetScore,
    example,
  }
}

/**
 * Максимальный захардкоженный уровень.
 */
export const MAX_HARDCODED_LEVEL = LEVELS.length
