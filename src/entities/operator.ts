import type { ExpressionToken } from './expression'

/**
 * Классификация операторов игры.
 *
 * - Бинарные: `+ - * / ^`. Вставляются между двумя операндами.
 *   Их в наборе ровно (число_чисел − 1), и использовать нужно ровно столько же.
 * - Унарные: `√` (корень), `!` (факториал). Применяются к одному операнду.
 * - Знаки `+` и `-` — двойной роли: бинарные (`a-b`) и унарные (`-5`, `-(...)`).
 * - Скобки: `( )`. Не являются операторами — не обязательны.
 */
export const BINARY_OPERATORS = ['+', '-', '*', '/', '^'] as const
export const UNARY_FACTORIAL = '!'
export const UNARY_ROOT = '√'
export const PAREN_LEFT = '('
export const PAREN_RIGHT = ')'

/** Знаки, которые могут быть и бинарными, и унарными. */
export const SIGN_SET = new Set<string>(['+', '-'])

/** Операторы, которые бывают ТОЛЬКО унарными. */
export const UNARY_ONLY = new Set<string>([UNARY_ROOT, UNARY_FACTORIAL])

/** Префиксные операторы (ставятся ПЕРЕД операндом): знаки и корень. */
export const PREFIX_SET = new Set<string>(['+', '-', UNARY_ROOT])

export function isBinaryOperator(op: string): boolean {
  return (BINARY_OPERATORS as readonly string[]).includes(op)
}

export function isFactorialOperator(op: string): boolean {
  return op === UNARY_FACTORIAL
}

export function isRootOperator(op: string): boolean {
  return op === UNARY_ROOT
}

export function isParen(op: string): boolean {
  return op === PAREN_LEFT || op === PAREN_RIGHT
}

/** Только унарный оператор (√ или !). */
export function isUnaryOnlyOperator(op: string): boolean {
  return UNARY_ONLY.has(op)
}

/** Префиксный оператор (ставится перед операндом): +, -, √. */
export function isPrefixOperator(op: string): boolean {
  return PREFIX_SET.has(op)
}

/** Знак двойной роли (+ или -). */
export function isSignOperator(op: string): boolean {
  return SIGN_SET.has(op)
}

/**
 * Сколько бинарных операторов в токенном выражении.
 * Унарные (√, !) и префиксные знаки не считаются.
 */
export function countBinaryOperators(tokens: ExpressionToken[]): number {
  return tokens.filter(
    (t) => t.type === 'operator' && isBinaryOperator(t.value) && !t.unary
  ).length
}

/**
 * Сколько унарных применений оператора `op` в выражении.
 */
export function countUnaryOperator(tokens: ExpressionToken[], op: string): number {
  return tokens.filter((t) => t.type === 'operator' && t.value === op && t.unary).length
}
