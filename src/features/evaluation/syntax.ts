import type { ExpressionToken } from '../../entities/expression'
import { isPrefixOperator } from '../../entities/operator'

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

/**
 * Строгая синтаксическая валидация выражения на уровне токенов.
 * - `√` — перед числом или скобочной группой (`√9`, `√(2+3*4)`)
 * - `+`/`-` — в унарной позиции (начало, после бинарного, после `(`)
 * - `!` (факториал) — сразу после одиночного числа
 *
 * Возвращает null, если всё корректно, иначе код ошибки.
 */
export function validateSyntax(tokens: ExpressionToken[]): SyntaxErrorCode | null {
  if (tokens.length === 0) return 'empty'

  let depth = 0
  // true — ждём операнд (число / `(` / √ / унарный знак)
  let expect = true
  // предыдущий токен завершил операнд (число, `)` или postfix `!`) — для `!`
  let lastWasOperand = false
  // предыдущий токен — √ (после него нельзя ставить знак)
  let afterRoot = false
  // предыдущий токен — унарный знак (двойные знаки запрещены)
  let afterUnarySign = false

  for (const t of tokens) {
    if (t.type === 'number') {
      if (!expect) return 'expected-operator'
      expect = false
      lastWasOperand = true
      afterRoot = false
      afterUnarySign = false
    } else if (t.type === 'parenthesis') {
      if (t.value === '(') {
        if (!expect) return 'expected-operator' // `2 (3`
        depth++
        lastWasOperand = false
        afterRoot = false
        afterUnarySign = false
      } else {
        if (expect) return 'expected-operator' // `()` / лишняя `)`
        if (depth <= 0) return 'unbalanced-paren'
        depth--
        expect = false
        lastWasOperand = true // `)` завершает операнд-группу
        afterRoot = false
        afterUnarySign = false
      }
    } else {
      const op = t.value

      if (op === '√') {
        if (!expect) return 'operators-consecutive' // `2√`
        lastWasOperand = false
        afterRoot = true
        afterUnarySign = false
        // expect остаётся true (ждём операнд)
      } else if (op === '!') {
        if (expect) return 'invalid-factorial' // `!` без операнда
        if (!lastWasOperand) return 'invalid-factorial' // `2+!`, `(2`
        // `!` допустим после числа, `)` и postfix `!` (3!, (2+3)!, 4!!)
        lastWasOperand = true
        expect = false
        afterRoot = false
        afterUnarySign = false
      } else if (op === '*' || op === '/' || op === '^') {
        if (expect) return 'operators-consecutive' // `2*+...` / в начале
        expect = true
        lastWasOperand = false
        afterRoot = false
        afterUnarySign = false
      } else if (op === '+' || op === '-') {
        if (t.unary) {
          if (!expect) return 'operators-consecutive' // знак в бинарной позиции, помечен унарным
          if (afterRoot) return 'operators-consecutive' // `√-`
          if (afterUnarySign) return 'operators-consecutive' // `--`, `+-`
          expect = true
          lastWasOperand = false
          afterRoot = false
          afterUnarySign = true
        } else {
          if (expect) return 'operators-consecutive' // бинарный знак без левого операнда
          expect = true
          lastWasOperand = false
          afterRoot = false
          afterUnarySign = false
        }
      } else {
        return 'expected-operator'
      }
    }
  }

  if (depth !== 0) return 'unbalanced-paren'
  if (expect) return 'trailing-operator'
  return null
}

/**
 * Можно ли вставить токен в позицию `index` без нарушения грамматики.
 *
 * Локальная проверка на лету при вводе. Блокирует невозможные вставки:
 * число после числа, бинарный оператор подряд, `^` не от одиночного числа,
 * `!` не после числа, префиксы в неверной позиции.
 */
export function canInsertToken(
  tokens: ExpressionToken[],
  index: number,
  token: ExpressionToken
): boolean {
  const left = tokens[index - 1]
  const right = tokens[index]

  const isOperandEnd = (t?: ExpressionToken) =>
    !!t &&
    (t.type === 'number' ||
      (t.type === 'operator' && t.value === '!') ||
      (t.type === 'parenthesis' && t.value === ')'))
  const isOpenParen = (t?: ExpressionToken) =>
    !!t && t.type === 'parenthesis' && t.value === '('
  const isNumber = (t?: ExpressionToken) => !!t && t.type === 'number'
  const isPrefix = (t?: ExpressionToken) =>
    !!t && t.type === 'operator' && isPrefixOperator(t.value)

  if (token.type === 'number') {
    if (isOperandEnd(left)) return false // число после числа/`!`/`)`
    if (isNumber(right) || isOpenParen(right)) return false // число перед числом/`(`
    return true
  }

  if (token.type === 'parenthesis') {
    if (token.value === '(') {
      if (isOperandEnd(left)) return false // `2(`
      return true
    }
    // `)`
    if (!isOperandEnd(left)) return false
    if (isNumber(right)) return false // число после `)`
    return true
  }

  const op = token.value

  if (op === '!') {
    // постфикс: после числа, `)` или ещё одного `!` (3!, (2+3)!, 4!!)
    if (!isOperandEnd(left) || isOpenParen(left)) return false
    return true
  }

  if (op === '√') {
    if (isOperandEnd(left)) return false // префикс в позиции «после операнда»
    return true
  }

  if (op === '+' || op === '-') {
    if (token.unary) {
      if (isOperandEnd(left)) return false // унарный знак не после операнда
      return true
    }
    // бинарный знак
    if (!isOperandEnd(left)) return false
    if (right && !isOperandEnd(right) && !isOpenParen(right) && !isPrefix(right)) return false
    return true
  }

  if (op === '^') {
    // степень — от числа или postfix `!` (5^6, 5!^6), но не от `√`-результата
    if (!isOperandEnd(left) || (isNumber(left) && left.raw !== undefined)) return false
    if (right && !isOperandEnd(right) && !isOpenParen(right) && !isPrefix(right)) return false
    return true
  }

  // * и /
  if (!isOperandEnd(left)) return false
  if (right && !isOperandEnd(right) && !isOpenParen(right) && !isPrefix(right)) return false
  return true
}
