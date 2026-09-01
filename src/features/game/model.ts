import { createDomain, sample, type Store } from 'effector'
import type { ExpressionToken } from '../../entities/expression'
import { numberToken, operatorToken, parenthesisToken } from '../../entities/expression'
import type { Level } from '../../entities/level'
import { OPERATOR_UNLOCK_RULES } from '../../entities/level'
import { generateLevel } from '../progression/levels'
import { evaluateOne } from '../evaluation/engine'
import { canInsertToken } from '../evaluation/syntax'
import {
  serializedLog10,
  formatLog10Target,
  type SerializedBigNumber,
} from '../../shared/lib/formatHugeNumber'
import { isUnaryOnlyOperator, isSignOperator } from '../../entities/operator'
import {
  loadProgress,
  saveProgress,
  recordHighScore,
  type ProgressData,
} from '../../shared/lib/progress'

/**
 * Домен `game` — основная игровая логика.
 */
const game = createDomain('game')

// --- Сторы ---
// Уровень, на котором продолжится игра — читаем из localStorage при старте
const initialProgress = loadProgress()
export const $currentLevel = game.createStore<number>(initialProgress.currentLevel)
export const $hand = game.createStore<{ numbers: number[]; operators: string[] }>({
  numbers: [],
  operators: [],
})
// Доступные операторы уровня: каждый символ используется ровно один раз.
// binary — бинарные (['+','/']), unary — унарные (['√','!']).
// parenPairs — сколько пар скобок доступно (0, если скобки не открыты).
export const $available = game.createStore<{
  binary: string[]
  unary: string[]
  parenPairs: number
}>({
  binary: [],
  unary: [],
  parenPairs: 0,
})
export const $expression = game.createStore<ExpressionToken[]>([])

/**
 * Живой предпросмотр результата: считаем по текущему выражению без нажатия «=».
 * evaluateOne безопасен на каждом вводе — magnitude-guard коротко замыкает
 * астрономически огромные выражения до evaluate(), поэтому воркер не роняется.
 * Показываем только для синтаксически корректного выражения.
 */
export const $previewResult = $expression.map((tokens) => {
  if (tokens.length === 0) return null
  const res = evaluateOne(tokens)
  if (!res.ok) return null
  if (res.huge) return 'ОЧЕНЬ БОЛЬШОЕ ЧИСЛО'
  if (!res.rounded) return null
  // Малая величина: знак уже в value («-5»). Большая (мантисса): знак отдельно.
  if (res.rounded.exponent === 0) return res.rounded.value
  return `${res.rounded.negative ? '-' : ''}${res.rounded.value}e${res.rounded.exponent}`
})
export const $cursorPosition = game.createStore<number>(0)
export const $result = game.createStore<SerializedBigNumber | null>(null)
export const $score = game.createStore<number>(0)
// Рекорд: максимальные очки, начисленные за выражение (log10)
export const $bestScore = game.createStore<number>(loadProgress().highestScore)
export const $validationError = game.createStore<string | null>(null)
export const $targetScore = game.createStore<number>(0)
// Есть ли у уровня цель (только обучающие захардкоженные уровни).
export const $hasTarget = game.createStore<boolean>(false)
// Сообщение о результате вычисления (например, «Цель не достигнута»)
export const $resultMessage = game.createStore<string | null>(null)
// Достижение «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО»: true, когда игрок собрал астрономически
// огромное выражение и «победил» им (сильно, но не засчитывается в рекорд числа).
export const $hugeAchievement = game.createStore<boolean>(false)
export const $unlockedOperators = game.createStore<string[]>(['+', '-', '*', '/'])
// Режим игры: обычный или «Часовая бомба». В бомбе не обновляем обычные
// очки/рекорд (у неё свои), поэтому гейтим эти сэмплы по режиму.
export const $mode = game.createStore<'normal' | 'bomb'>('normal')
export const setMode = game.createEvent<'normal' | 'bomb'>()
sample({ clock: setMode, fn: (m) => m, target: $mode })

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

// Вспомогательное событие для установки уровня (внутреннее).
// Экспортируется, чтобы режим «Часовая бомба» мог подставлять свои уровни
// в общие сторы игры (рука, операторы, цель).
export const setLevel = game.createEvent<Level>()
// Срабатывает только когда токен реально вставлен (прошёл валидацию)
const tokenInserted = game.createEvent<ExpressionToken>()

/** Исход вычисления: обычное число или «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО». */
export type EvaluationOutcome =
  | { kind: 'ok'; rounded: SerializedBigNumber }
  | { kind: 'huge'; negative: boolean }

// --- Эффекты ---
export const evaluateExpressionFx = game.createEffect<
  ExpressionToken[],
  EvaluationOutcome,
  Error
>({
  handler: (tokens) => {
    const res = evaluateOne(tokens)
    if (res.huge) {
      return { kind: 'huge', negative: res.hugeNegative ?? false }
    }
    if (!res.ok || !res.rounded) {
      throw new Error(res.error ?? 'Ошибка вычисления')
    }
    return { kind: 'ok', rounded: res.rounded }
  },
})

export const saveProgressFx = game.createEffect<ProgressData, void>({
  handler: saveProgress,
})

// Флаг "вычисляется" — из pending эффекта
export const $isEvaluating = evaluateExpressionFx.pending

// --- Валидация токенов ---

/**
 * Помечает оператор как унарный или бинарный в зависимости от текущей позиции.
 * - унарные только-операторы (√, !) — всегда унарные
 * - знаки (+/−): унарные, если перед ними нет операнда (начало/после оп/после `(`/после `!`)
 */
function classifyToken(
  token: ExpressionToken,
  left: ExpressionToken | undefined
): ExpressionToken {
  if (token.type !== 'operator') return token
  if (isUnaryOnlyOperator(token.value)) {
    return { ...token, unary: true }
  }
  if (isSignOperator(token.value) && isUnarySignPosition(left)) {
    return { ...token, unary: true }
  }
  // оператор в бинарной позиции (или `!`)
  return { ...token, unary: false }
}

function isUnarySignPosition(left: ExpressionToken | undefined): boolean {
  if (left === undefined) return true // начало выражения
  if (left.type === 'parenthesis') return left.value === '('
  if (left.type === 'operator') return left.value !== '√' && left.value !== '!'
  // после числа или `)` — бинарный знак
  return false
}

/** Сколько раз встречается каждое значение в списке чисел. */
function countValues(arr: readonly number[]): Record<number, number> {
  const m: Record<number, number> = {}
  for (const n of arr) m[n] = (m[n] ?? 0) + 1
  return m
}

/**
 * Доступен ли токен для вставки.
 * - число: есть в наборе руки и ещё остались неиспользованные экземпляры
 *   (если значение повторяется — его можно использовать столько же раз)
 * - оператор: символ есть в наборе уровня и ещё не использован (ровно 1 раз)
 */
export interface AvailableOps {
  binary: string[]
  unary: string[]
  parenPairs: number
}

function isTokenAvailable(
  token: ExpressionToken,
  hand: { numbers: number[]; operators: string[] },
  available: AvailableOps,
  expression: ExpressionToken[]
): boolean {
  if (token.type === 'number') {
    const need = countValues(hand.numbers)[token.value]
    if (!need) return false
    let used = 0
    for (const t of expression) {
      if (t.type === 'number' && t.value === token.value) used++
    }
    return used < need
  }
  if (token.type === 'operator') {
    const pool = token.unary ? available.unary : available.binary
    if (!pool.includes(token.value)) return false
    const used = expression.filter(
      (t) => t.type === 'operator' && t.value === token.value && !!t.unary === !!token.unary
    ).length
    return used < pool.filter((p) => p === token.value).length
  }
  if (token.type === 'parenthesis') {
    // Скобки есть, только если уровень открыл '()'.
    // Открывающих и закрывающих даётся поровну (parenPairs каждая).
    if (available.parenPairs <= 0) return false
    const usedOfKind = expression.filter((t) => t.type === 'parenthesis' && t.value === token.value)
      .length
    return usedOfKind < available.parenPairs
  }
  return true
}

/**
 * Все ли обязательные токены использованы:
 * - каждый бинарный из {available.binary} использован ровно 1 раз
 * - каждый унарный из {available.unary} использован ровно 1 раз
 */
function allTokensUsed(
  expression: ExpressionToken[],
  available: AvailableOps
): boolean {
  for (const b of available.binary) {
    const count = expression.filter(
      (t) => t.type === 'operator' && t.value === b && !t.unary
    ).length
    if (count !== 1) return false
  }
  for (const u of available.unary) {
    const count = expression.filter(
      (t) => t.type === 'operator' && t.value === u && t.unary
    ).length
    if (count !== 1) return false
  }
  return true
}

/**
 * Все ли числа из набора использованы в выражении (с учётом повторов:
 * значение, встречающееся в наборе N раз, должно быть использовано N раз).
 */
function allNumbersUsed(expression: ExpressionToken[], numbers: number[]): boolean {
  const used = countValues(
    expression.filter((t) => t.type === 'number').map((t) => t.value)
  )
  for (const n of numbers) {
    used[n] = (used[n] ?? 0) - 1
  }
  // Каждое требуемое число должно быть использовано ровно столько раз, сколько
  // встречается в наборе (после вычитания все счётчики должны стать 0).
  return Object.values(used).every((c) => c === 0)
}

// --- Логика ---

// Старт игры: загружаем уровень. Обычный режим — сбрасываем режим на 'normal'
// (если до этого играли в «Часовую бомбу»), чтобы очки/рекорд снова писались.
sample({ clock: startGame, fn: () => 'normal' as const, target: $mode })
sample({ clock: startGame, fn: (level) => generateLevel(level), target: setLevel })
// При старте нового уровня сбрасываем состояние раунда
sample({ clock: startGame, target: resetRound })

sample({ clock: setLevel, fn: (lvl) => lvl.level, target: $currentLevel })
sample({
  clock: setLevel,
  fn: (lvl) => ({ numbers: lvl.numbers, operators: lvl.operators }),
  target: $hand,
})
sample({
  clock: setLevel,
  fn: (lvl) => {
    const binary = lvl.operators.filter((o) => o !== '√' && o !== '!' && o !== '()')
    const unary = lvl.operators.filter((o) => o === '√' || o === '!')
    // Скобки: 2 пары, если уровень открыл '()'. Ровно столько использует
    // генератор целей — иначе уровень непроходим.
    const parenPairs = lvl.operators.includes('()') ? 2 : 0
    return { binary, unary, parenPairs }
  },
  target: $available,
})
sample({ clock: setLevel, fn: (lvl) => lvl.targetScore, target: $targetScore })
sample({ clock: setLevel, fn: (lvl) => lvl.hasTarget, target: $hasTarget })

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
sample({ clock: resetRound, fn: () => [], target: $expression })
sample({ clock: resetRound, fn: () => 0, target: $cursorPosition })
sample({ clock: resetRound, fn: () => null, target: $result })
sample({ clock: resetRound, fn: () => null, target: $validationError })
sample({ clock: resetRound, fn: () => null, target: $resultMessage })
sample({ clock: resetRound, fn: () => false, target: $hugeAchievement })

// Вставка токена: классифицируем (унарный/бинарный) → проверяем доступность и синтаксис
sample({
  clock: insertToken,
  source: {
    hand: $hand,
    available: $available,
    expression: $expression,
    cursor: $cursorPosition,
  },
  filter: ({ hand, available, expression, cursor }, token) => {
    const c = classifyToken(token, expression[cursor - 1])
    return isTokenAvailable(c, hand, available, expression) && canInsertToken(expression, cursor, c)
  },
  fn: ({ expression, cursor }, token) => classifyToken(token, expression[cursor - 1]),
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
sample({ clock: clearExpression, fn: () => [], target: $expression })
sample({ clock: clearExpression, fn: () => 0, target: $cursorPosition })

// Вычисление: только если все обязательные токены использованы
sample({
  clock: evaluateExpressionEvent,
  source: { expression: $expression, available: $available, hand: $hand },
  filter: ({ expression, available, hand }) =>
    allTokensUsed(expression, available) && allNumbersUsed(expression, hand.numbers),
  fn: ({ expression }) => expression,
  target: evaluateExpressionFx,
})

// Если не все токены использованы — показываем ошибку
sample({
  clock: evaluateExpressionEvent,
  source: { expression: $expression, available: $available, hand: $hand },
  filter: ({ expression, available, hand }) =>
    !allTokensUsed(expression, available) || !allNumbersUsed(expression, hand.numbers),
  fn: ({ expression, available, hand }) => {
    const used = countValues(
      expression.filter((t) => t.type === 'number').map((t) => t.value)
    )
    const missingNumbers: number[] = []
    for (const n of hand.numbers) {
      if ((used[n] ?? 0) > 0) {
        used[n] = (used[n] ?? 0) - 1
      } else {
        missingNumbers.push(n)
      }
    }
    if (missingNumbers.length > 0) {
      return `Используй все числа: ${missingNumbers.join(', ')}`
    }
    const usedTokens = countUsedTokens(expression)
    const missingBinary = available.binary.filter((b) => usedTokens[b] < 1)
    const missingUnary = available.unary.filter((u) => usedTokens[u] < 1)
    const parts: string[] = []
    for (const b of missingBinary) parts.push(`«${b}»`)
    for (const u of missingUnary) parts.push(`унарный «${u}»`)
    if (parts.length === 0) return 'Используй все операторы из набора'
    return `Используй все операторы: ${parts.join(', ')}`
  },
  target: $validationError,
})

// Успех: сохраняем результат, начисляем очки (от округлённого значения).
// «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО» не идёт в рекорд числа и не начисляет очки.
sample({
  clock: evaluateExpressionFx.doneData,
  filter: (outcome) => outcome.kind === 'ok',
  fn: (outcome) => (outcome as { kind: 'ok'; rounded: SerializedBigNumber }).rounded,
  target: $result,
})
sample({
  clock: evaluateExpressionFx.doneData,
  source: $mode,
  filter: (mode, outcome) => mode === 'normal' && outcome.kind === 'ok',
  fn: (_, outcome) =>
    serializedLog10((outcome as { kind: 'ok'; rounded: SerializedBigNumber }).rounded),
  target: $score,
})
// Рекорд: обновляем максимальные очки и сохраняем в localStorage.
// «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО» НЕ засчитывается в рекорд числа (score). Поэтому
// сбрасываем score и result (чтобы не считать достижением «заменённую цель»).
sample({
  clock: evaluateExpressionFx.doneData,
  source: $mode,
  filter: (mode, outcome) => mode === 'normal' && outcome.kind === 'huge',
  fn: () => 0,
  target: $score,
})
sample({
  clock: evaluateExpressionFx.doneData,
  filter: (outcome) => outcome.kind === 'huge',
  fn: () => null,
  target: $result,
})
sample({
  clock: evaluateExpressionFx.doneData,
  source: $mode,
  filter: (mode, outcome) => mode === 'normal' && outcome.kind === 'ok',
  fn: (_, outcome) => recordHighScore(serializedLog10((outcome as { kind: 'ok'; rounded: SerializedBigNumber }).rounded)),
  target: $bestScore,
})
sample({
  clock: evaluateExpressionFx.doneData,
  filter: (outcome) => outcome.kind === 'huge',
  fn: () => true,
  target: $hugeAchievement,
})
sample({ clock: evaluateExpressionFx.doneData, fn: () => null, target: $validationError })

// Сообщение о результате: если цель не достигнута — показываем подсказку.
// «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО» — заведомый выигрыш. Если у уровня нет цели
// (генерируемый уровень) — сообщение об ошибке цели никогда не показываем.
sample({
  clock: evaluateExpressionFx.doneData,
  source: { target: $targetScore, hasTarget: $hasTarget },
  fn: ({ target, hasTarget }, outcome) => {
    if (outcome.kind === 'huge') return null
    if (!hasTarget) return null
    const score = serializedLog10(outcome.rounded)
    if (score >= target) return null
    return `Цель не достигнута: нужно ${formatLog10Target(target)}, у тебя ${formatLog10Target(score)}`
  },
  target: $resultMessage,
})

// Ошибка: показываем сообщение. failData несёт объект Error — извлекаем текст.
sample({
  clock: evaluateExpressionFx.failData,
  fn: (error) => (error instanceof Error ? error.message : String(error)),
  target: $validationError,
})

// Следующий уровень
sample({
  clock: nextLevel,
  source: $currentLevel,
  fn: (level) => level + 1,
  target: startGame,
})

// Сохранение прогресса при старте уровня.
// currentLevel — уровень, на котором игрок сейчас (точка продолжения).
// highestLevel — рекорд: максимум из прежнего и текущего.
// Уровень берём из payload события startGame (а не из $currentLevel, который
// ещё не обновился к моменту срабатывания sample).
sample({
  clock: startGame,
  fn: (level) => {
    const prev = loadProgress()
    const highest = Math.max(prev.highestLevel, level)
    return {
      currentLevel: level,
      highestLevel: highest,
      highestScore: prev.highestScore,
      bombHighScore: prev.bombHighScore,
    }
  },
  target: saveProgressFx,
})

// --- Вспомогательные функции для сообщений об ошибках ---
function countUsedTokens(expression: ExpressionToken[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const t of expression) {
    if (t.type === 'operator') map[t.value] = (map[t.value] ?? 0) + 1
  }
  return map
}

// --- Типы для UI ---
export type GameStore = {
  currentLevel: Store<number>
  hand: Store<{ numbers: number[]; operators: string[] }>
  expression: Store<ExpressionToken[]>
  cursorPosition: Store<number>
  result: Store<SerializedBigNumber | null>
  previewResult: Store<string | null>
  score: Store<number>
  bestScore: Store<number>
  validationError: Store<string | null>
  resultMessage: Store<string | null>
  hugeAchievement: Store<boolean>
  targetScore: Store<number>
  hasTarget: Store<boolean>
  isEvaluating: Store<boolean>
}

export const gameStores: GameStore = {
  currentLevel: $currentLevel,
  hand: $hand,
  expression: $expression,
  cursorPosition: $cursorPosition,
  result: $result,
  previewResult: $previewResult,
  score: $score,
  bestScore: $bestScore,
  validationError: $validationError,
  resultMessage: $resultMessage,
  hugeAchievement: $hugeAchievement,
  targetScore: $targetScore,
  hasTarget: $hasTarget,
  isEvaluating: $isEvaluating,
}

// --- Экспорт фабрик токенов для UI ---
export { numberToken, operatorToken, parenthesisToken }
