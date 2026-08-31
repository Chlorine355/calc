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
  // --- Уровни 1-5: 3 числа, 2 бинарных ---
  // операторов всегда ровно (числа − 1). Никаких унарных на старте.
  { numbers: [2, 3, 4], operators: ['+', '*'] },
  { numbers: [3, 4, 5], operators: ['+', '*'] },
  { numbers: [2, 5, 6], operators: ['+', '*'] },
  { numbers: [4, 5, 6], operators: ['+', '*'] },
  { numbers: [5, 6, 7], operators: ['+', '*'] },
  // --- Уровни 6-9: появляются - и / среди бинарных ---
  { numbers: [7, 8, 9], operators: ['*', '-'] },
  { numbers: [4, 7, 8], operators: ['*', '/'] },
  { numbers: [6, 7, 8], operators: ['-', '/'] },
  { numbers: [3, 8, 9], operators: ['+', '/'] },
  // --- Уровни 10-19: 4 числа, 3 бинарных, добавляется '^' ---
  { numbers: [2, 3, 4, 5], operators: ['+', '*', '^'] },
  { numbers: [3, 4, 5, 6], operators: ['*', '-', '^'] },
  { numbers: [2, 5, 6, 7], operators: ['+', '/', '^'] },
  { numbers: [4, 5, 6, 7], operators: ['*', '/', '^'] },
  { numbers: [3, 6, 7, 8], operators: ['+', '-', '^'] },
  { numbers: [5, 6, 7, 8], operators: ['*', '-', '^'] },
  { numbers: [2, 7, 8, 9], operators: ['+', '/', '^'] },
  { numbers: [4, 7, 8, 9], operators: ['*', '/', '^'] },
  { numbers: [6, 7, 8, 9], operators: ['+', '-', '^'] },
  { numbers: [3, 8, 9, 9], operators: ['*', '/', '^'] },
  // --- Уровни 20-29: 5 чисел, 4 бинарных, добавляется '!' ---
  { numbers: [5, 6, 7, 8, 9], operators: ['+', '*', '-', '^', '!'] },
  { numbers: [4, 6, 7, 8, 9], operators: ['*', '/', '-', '^', '!'] },
  { numbers: [5, 7, 8, 9, 9], operators: ['+', '*', '/', '^', '!'] },
  { numbers: [6, 7, 8, 9, 9], operators: ['*', '-', '/', '^', '!'] },
  { numbers: [7, 8, 9, 9, 9], operators: ['+', '*', '-', '^', '!'] },
  { numbers: [5, 8, 9, 9, 9], operators: ['*', '/', '-', '^', '!'] },
  { numbers: [6, 8, 9, 9, 9], operators: ['+', '*', '/', '^', '!'] },
  { numbers: [7, 9, 9, 9, 9], operators: ['*', '-', '/', '^', '!'] },
  { numbers: [8, 9, 9, 9, 9], operators: ['+', '*', '-', '^', '!'] },
  { numbers: [9, 9, 9, 9, 9], operators: ['*', '/', '-', '^', '!'] },
  // --- Уровни 30+: 6 чисел, 5 бинарных, скобки ---
  { numbers: [2, 3, 4, 5, 6, 7], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [3, 4, 5, 6, 7, 8], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [4, 5, 6, 7, 8, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [5, 6, 7, 8, 9, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [6, 7, 8, 9, 9, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [7, 8, 9, 9, 9, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [8, 9, 9, 9, 9, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  { numbers: [9, 9, 9, 9, 9, 9], operators: ['+', '*', '-', '/', '^', '!', '()'] },
  // --- Продвинутые: унарный корень √ (в дополнение к факториалу) ---
  { numbers: [4, 9, 9, 9, 9], operators: ['+', '*', '-', '^', '√', '!', '()'] },
  { numbers: [4, 9, 9, 9, 9, 9], operators: ['+', '*', '-', '/', '^', '√', '()'] },
  { numbers: [9, 9, 9, 9, 9, 9], operators: ['+', '*', '-', '/', '^', '√', '()'] },
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
    return { level, numbers: spec.numbers, operators: spec.operators, targetScore, example }
  }

  // Бесконечный режим: растущая цель, повторяющийся набор
  const base = LEVELS[LEVELS.length - 1]
  const extra = Math.floor((level - LEVELS.length) / 2)
  const { targetScore, example } = greedyTarget(base.numbers, base.operators)
  return {
    level,
    numbers: base.numbers,
    operators: base.operators,
    targetScore: targetScore + extra,
    example,
  }
}

/**
 * Максимальный захардкоженный уровень.
 */
export const MAX_HARDCODED_LEVEL = LEVELS.length
