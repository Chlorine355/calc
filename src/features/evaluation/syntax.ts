import type { ExpressionToken } from '../../entities/expression'

/**
 * Коды ошибок синтаксиса выражения.
 */
export type SyntaxErrorCode =
  | 'empty'
  | 'operators-consecutive'
  | 'expected-operator'
  | 'unbalanced-paren'
  | 'invalid-factorial'
  | 'trailing-operator'

export const SYNTAX_MESSAGES: Record<SyntaxErrorCode, string> = {
  empty: 'Пустое выражение',
  'operators-consecutive': 'Операторы не могут идти подряд',
  'expected-operator': 'Нужен оператор (или число не на месте)',
  'unbalanced-paren': 'Несбалансированные скобки',
  'invalid-factorial': 'Факториал применим только к одиночному числу',
  'trailing-operator': 'Выражение не может заканчиваться оператором',
}

const BINARY = new Set(['+', '-', '*', '/', '^'])

/**
 * Строгая синтаксическая валидация выражения на уровне токенов.
 *
 * mathjs слишком либерален: `2*+-43` он трактует как `2*(+(-43))`.
 * В нашем редакторе каждый токен — отдельная карточка, и бинарные операторы
 * (+, -, *, /, ^) НЕ могут идти подряд. Это контрольно-потоковая грамматика.
 *
 * Правила:
 * - выражение непустое
 * - бинарный оператор: только после числа или `)`
 * - после бинарного оператора обязателен операнд (число или `(`)
 * - `!` (унарный) — только сразу после одиночного числа (не после `)`)
 * - скобки сбалансированы
 * - нельзя заканчивать выражением оператором
 *
 * Возвращает null, если всё корректно, иначе код ошибки.
 */
export function validateSyntax(tokens: ExpressionToken[]): SyntaxErrorCode | null {
  if (tokens.length === 0) return 'empty'

  let depth = 0
  // true — после операнда (ждём бинарный оператор / `)` / конец)
  let afterOperand = false
  // true — предыдущий значимый токен был числом (для ограничения `!`)
  let lastWasNumber = false

  for (const t of tokens) {
    if (t.type === 'number') {
      if (afterOperand) return 'expected-operator' // число подряд: `2 3`
      afterOperand = true
      lastWasNumber = true
    } else if (t.type === 'parenthesis') {
      if (t.value === '(') {
        if (afterOperand) return 'expected-operator' // `2 (3`
        depth++
      } else {
        // `)`
        if (!afterOperand) return 'expected-operator' // `)` без операнда
        depth--
        if (depth < 0) return 'unbalanced-paren'
        afterOperand = true
        lastWasNumber = false // после `)` факториал не применяем (взрывает числа)
      }
    } else {
      // оператор
      if (t.value === '!') {
        if (!afterOperand) return 'expected-operator'
        if (!lastWasNumber) return 'invalid-factorial' // `5!!`, `(2+3)!`
        lastWasNumber = false // после `!` нельзя ещё один `!`
      } else if (BINARY.has(t.value)) {
        if (!afterOperand) return 'operators-consecutive' // `2*+-43`
        afterOperand = false
      }
      // прочие операторы не рассматриваем
    }
  }

  if (depth !== 0) return 'unbalanced-paren'
  if (!afterOperand) return 'trailing-operator' // `2*4+`
  return null
}
