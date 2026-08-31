import type { ExpressionToken } from './expression'

/**
 * Классификация операторов игры.
 *
 * - Бинарные: `+ - * / ^`. Вставляются между двумя операндами.
 *   Их можно использовать ровно (число_чисел − 1) раз.
 * - Унарные: `!` (факториал). Применяется сразу после одиночного числа.
 * - Скобки: `( )`. Не являются операторами — не обязательны.
 */
export const BINARY_OPERATORS = ['+', '-', '*', '/', '^'] as const
export const UNARY_FACTORIAL = '!'
export const PAREN_LEFT = '('
export const PAREN_RIGHT = ')'

export function isBinaryOperator(op: string): boolean {
  return (BINARY_OPERATORS as readonly string[]).includes(op)
}

export function isFactorialOperator(op: string): boolean {
  return op === UNARY_FACTORIAL
}

export function isParen(op: string): boolean {
  return op === PAREN_LEFT || op === PAREN_RIGHT
}

/**
 * Сколько операторов в токенном выражении (бинарные + факториал).
 */
export function countTokenOperators(tokens: ExpressionToken[]): number {
  return tokens.filter((t) => t.type === 'operator').length
}
