/**
 * Токен выражения. Число, оператор или скобка.
 * Имеет id для стабильной идентификации в React-ключах и DnD.
 *
 * - `unary` — для операторов: true, если это унарное применение
 *   (√, !, или знак +/− перед операндом). Бинарные применения — false.
 * - `raw` — для чисел: нестандартное строковое значение (например, результат
 *   корня `√9` → 3). Обычные числа его не имеют.
 */
export type ExpressionToken =
  | { type: 'number'; value: number; id: string; raw?: string }
  | { type: 'operator'; value: string; id: string; unary?: boolean }
  | { type: 'parenthesis'; value: '(' | ')'; id: string }

/**
 * Создаёт новый токен с уникальным id.
 */
export function createToken(
  type: ExpressionToken['type'],
  value: ExpressionToken['value']
): ExpressionToken {
  const id = `${type}-${value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { type, value, id } as ExpressionToken
}

/**
 * Хэлпер: создать числовой токен.
 */
export function numberToken(value: number, raw?: string): ExpressionToken {
  const id = `${'number'}-${value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return raw !== undefined
    ? { type: 'number', value, id, raw }
    : { type: 'number', value, id }
}

/**
 * Хэлпер: создать операторный токен.
 * `unary` — унарное применение (√, !, или знак перед операндом).
 */
export function operatorToken(value: string, unary = false): ExpressionToken {
  const id = `${'operator'}-${value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return unary
    ? { type: 'operator', value, id, unary: true }
    : { type: 'operator', value, id }
}

/**
 * Хэлпер: создать скобочный токен.
 */
export function parenthesisToken(value: '(' | ')'): ExpressionToken {
  return createToken('parenthesis', value)
}
