import { createDomain, sample, type Store } from 'effector'
import type { ExpressionToken } from '../../entities/expression'
import { numberToken, operatorToken, parenthesisToken } from '../../entities/expression'
import type { Level } from '../../entities/level'
import { OPERATOR_UNLOCK_RULES } from '../../entities/level'
import { generateLevel } from '../progression/levels'
import { evaluateExpression } from '../evaluation/engine'
import { serializedLog10, type SerializedBigNumber } from '../../shared/lib/formatHugeNumber'
import { isBinaryOperator, isFactorialOperator } from '../../entities/operator'

/**
 * Домен `game` — основная игровая логика.
 */
const game = createDomain('game')

// --- Сторы ---
export const $currentLevel = game.createStore<number>(1)
export const $hand = game.createStore<{ numbers: number[]; operators: string[] }>({
  numbers: [],
  operators: [],
})
export const $expression = game.createStore<ExpressionToken[]>([])
export const $cursorPosition = game.createStore<number>(0)
export const $result = game.createStore<SerializedBigNumber | null>(null)
export const $score = game.createStore<number>(0)
export const $validationError = game.createStore<string | null>(null)
export const $targetScore = game.createStore<number>(0)
export const $unlockedOperators = game.createStore<string[]>(['+', '-', '*', '/'])

// --- События ---
export const insertToken = game.createEvent<ExpressionToken>()
export const deleteToken = game.createEvent()
export const moveCursorLeft = game.createEvent()
export const moveCursorRight = game.createEvent()
export const setCursorPosition = game.createEvent<number>()
export const clearExpression = game.createEvent()
export const evaluateExpressionEvent = game.createEvent()
export const resetRound = game.createEvent()
export const nextLevel = game.createEvent()
export const startGame = game.createEvent<number>()

// Вспомогательное событие для установки уровня (внутреннее)
const setLevel = game.createEvent<Level>()
// Срабатывает только когда токен реально вставлен (прошёл валидацию)
const tokenInserted = game.createEvent<ExpressionToken>()

// --- Эффекты ---
export const evaluateExpressionFx = game.createEffect<
  ExpressionToken[],
  SerializedBigNumber,
  string
>({
  handler: (tokens) => {
    const res = evaluateExpression(tokens)
    if (!res.ok || !res.result) {
      throw new Error(res.error ?? 'Ошибка вычисления')
    }
    return res.result
  },
})

export const saveProgressFx = game.createEffect<{ level: number; score: number }, void>({
  handler: ({ level, score }) => {
    try {
      localStorage.setItem('calc-progress', JSON.stringify({ level, score }))
    } catch {
      // localStorage может быть недоступен (приватный режим) — игнорируем
    }
  },
})

// Флаг "вычисляется" — из pending эффекта
export const $isEvaluating = evaluateExpressionFx.pending

// --- Валидация токенов ---

/**
 * Доступен ли токен для вставки.
 * Правила:
 * - число: должно быть в наборе руки и ещё не использовано
 * - оператор: должен быть в руке или открыт, и ещё не использован
 * - скобки: не ограничиваем
 */
function isTokenAvailable(
  token: ExpressionToken,
  hand: { numbers: number[]; operators: string[] },
  expression: ExpressionToken[],
  unlocked: string[]
): boolean {
  if (token.type === 'number') {
    return (
      hand.numbers.includes(token.value) &&
      !expression.some((t) => t.type === 'number' && t.value === token.value)
    )
  }
  if (token.type === 'operator') {
    const available = hand.operators.includes(token.value) || unlocked.includes(token.value)
    return (
      available &&
      !expression.some((t) => t.type === 'operator' && t.value === token.value)
    )
  }
  return true
}

/**
 * Все ли числа из набора использованы в выражении.
 */
function allNumbersUsed(expression: ExpressionToken[], numbers: number[]): boolean {
  const used = expression.filter((t) => t.type === 'number').map((t) => t.value)
  return numbers.every((n) => used.includes(n))
}

/**
 * Все ли операторы руки использованы в выражении.
 * Бинарные и факториал считаются; скобки — нет.
 */
function allOperatorsUsed(
  expression: ExpressionToken[],
  operators: string[]
): boolean {
  const used = expression.filter((t) => t.type === 'operator').map((t) => t.value)
  return operators.every((op) => {
    if (op === '(' || op === ')') return true // скобки не обязательны
    return used.includes(op)
  })
}

/**
 * Сколько бинарных операторов в выражении.
 */
function countBinary(expression: ExpressionToken[]): number {
  return expression.filter((t) => t.type === 'operator' && isBinaryOperator(t.value)).length
}

/**
 * Сколько факториалов в выражении.
 */
function countFactorial(expression: ExpressionToken[]): number {
  return expression.filter((t) => t.type === 'operator' && isFactorialOperator(t.value)).length
}

// --- Логика ---

// Старт игры: загружаем уровень
sample({
  clock: startGame,
  fn: (level) => generateLevel(level),
  target: setLevel,
})

// При старте нового уровня сбрасываем состояние раунда
sample({
  clock: startGame,
  target: resetRound,
})

sample({
  clock: setLevel,
  fn: (lvl) => lvl.level,
  target: $currentLevel,
})

sample({
  clock: setLevel,
  fn: (lvl) => ({ numbers: lvl.numbers, operators: lvl.operators }),
  target: $hand,
})

sample({
  clock: setLevel,
  fn: (lvl) => lvl.targetScore,
  target: $targetScore,
})

// Открытие операторов по уровню
sample({
  clock: $currentLevel,
  fn: (level) => {
    const unlocked: string[] = ['+', '-', '*', '/']
    for (const rule of OPERATOR_UNLOCK_RULES) {
      if (level >= rule.level) {
        if (rule.operator === '()') {
          unlocked.push('(', ')')
        } else {
          unlocked.push(rule.operator)
        }
      }
    }
    return unlocked
  },
  target: $unlockedOperators,
})

// resetRound: очищаем выражение, курсор, результат, ошибку
sample({
  clock: resetRound,
  fn: () => [],
  target: $expression,
})

sample({
  clock: resetRound,
  fn: () => 0,
  target: $cursorPosition,
})

sample({
  clock: resetRound,
  fn: () => null,
  target: $result,
})

sample({
  clock: resetRound,
  fn: () => null,
  target: $validationError,
})

// Вставка токена: только если он доступен (не использован, есть в наборе)
sample({
  clock: insertToken,
  source: { hand: $hand, expression: $expression, unlocked: $unlockedOperators },
  filter: ({ hand, expression, unlocked }, token) =>
    isTokenAvailable(token, hand, expression, unlocked),
  fn: (_src, token) => token,
  target: tokenInserted,
})

// Вставка в позицию курсора
sample({
  clock: tokenInserted,
  source: { expression: $expression, cursor: $cursorPosition },
  fn: ({ expression, cursor }, token) => {
    const next = [...expression]
    next.splice(cursor, 0, token)
    return next
  },
  target: $expression,
})

// После вставки курсор сдвигается вправо
sample({
  clock: tokenInserted,
  source: $cursorPosition,
  fn: (cursor) => cursor + 1,
  target: $cursorPosition,
})

// Удаление токена перед курсором
sample({
  clock: deleteToken,
  source: { expression: $expression, cursor: $cursorPosition },
  fn: ({ expression, cursor }) => {
    if (cursor <= 0) return expression
    const next = [...expression]
    next.splice(cursor - 1, 1)
    return next
  },
  target: $expression,
})

// После удаления курсор сдвигается влево (но не ниже 0)
sample({
  clock: deleteToken,
  source: $cursorPosition,
  fn: (cursor) => Math.max(0, cursor - 1),
  target: $cursorPosition,
})

// Перемещение курсора
sample({
  clock: moveCursorLeft,
  source: $cursorPosition,
  fn: (cursor) => Math.max(0, cursor - 1),
  target: $cursorPosition,
})

sample({
  clock: moveCursorRight,
  source: { cursor: $cursorPosition, expression: $expression },
  fn: ({ cursor, expression }) => Math.min(expression.length, cursor + 1),
  target: $cursorPosition,
})

// Клик по слоту — курсор в конкретную позицию
sample({
  clock: setCursorPosition,
  source: $expression,
  fn: (expression, index) => Math.max(0, Math.min(expression.length, index)),
  target: $cursorPosition,
})

// Очистка выражения
sample({
  clock: clearExpression,
  fn: () => [],
  target: $expression,
})

sample({
  clock: clearExpression,
  fn: () => 0,
  target: $cursorPosition,
})

// Вычисление: только если все числа и все операторы использованы
sample({
  clock: evaluateExpressionEvent,
  source: { expression: $expression, hand: $hand },
  filter: ({ expression, hand }) =>
    allNumbersUsed(expression, hand.numbers) &&
    allOperatorsUsed(expression, hand.operators),
  fn: ({ expression }) => expression,
  target: evaluateExpressionFx,
})

// Если не все числа/операторы использованы — показываем ошибку
sample({
  clock: evaluateExpressionEvent,
  source: { expression: $expression, hand: $hand },
  filter: ({ expression, hand }) =>
    !allNumbersUsed(expression, hand.numbers) ||
    !allOperatorsUsed(expression, hand.operators),
  fn: ({ expression, hand }) => {
    const missingNumbers = hand.numbers
      .filter((n) => !expression.some((t) => t.type === 'number' && t.value === n))
      .join(', ')
    const missingOps = hand.operators
      .filter((op) => op !== '(' && op !== ')')
      .filter((op) => !expression.some((t) => t.type === 'operator' && t.value === op))
      .join(', ')
    if (missingNumbers) return `Используй все числа: ${missingNumbers}`
    return `Используй все операторы: ${missingOps}`
  },
  target: $validationError,
})

// Успех: сохраняем результат, начисляем очки
sample({
  clock: evaluateExpressionFx.doneData,
  target: $result,
})

sample({
  clock: evaluateExpressionFx.doneData,
  fn: (result) => serializedLog10(result),
  target: $score,
})

sample({
  clock: evaluateExpressionFx.doneData,
  fn: () => null,
  target: $validationError,
})

// Ошибка: показываем сообщение
sample({
  clock: evaluateExpressionFx.failData,
  fn: (error) => error,
  target: $validationError,
})

// Следующий уровень
sample({
  clock: nextLevel,
  source: $currentLevel,
  fn: (level) => level + 1,
  target: startGame,
})

// Сохранение прогресса при смене уровня
sample({
  clock: startGame,
  source: { level: $currentLevel, score: $score },
  fn: ({ level, score }) => ({ level, score }),
  target: saveProgressFx,
})

// --- Типы для UI ---
export type GameStore = {
  currentLevel: Store<number>
  hand: Store<{ numbers: number[]; operators: string[] }>
  expression: Store<ExpressionToken[]>
  cursorPosition: Store<number>
  result: Store<SerializedBigNumber | null>
  score: Store<number>
  validationError: Store<string | null>
  targetScore: Store<number>
  isEvaluating: Store<boolean>
}

export const gameStores: GameStore = {
  currentLevel: $currentLevel,
  hand: $hand,
  expression: $expression,
  cursorPosition: $cursorPosition,
  result: $result,
  score: $score,
  validationError: $validationError,
  targetScore: $targetScore,
  isEvaluating: $isEvaluating,
}

// --- Экспорт фабрик токенов для UI ---
export { numberToken, operatorToken, parenthesisToken }
