/**
 * Токен выражения. Число, оператор или скобка.
 * Имеет id для стабильной идентификации в React-ключах и DnD.
 */
export type ExpressionToken =
  | { type: 'number'; value: number; id: string }
  | { type: 'operator'; value: string; id: string }
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
export function numberToken(value: number): ExpressionToken {
  return createToken('number', value)
}

/**
 * Хэлпер: создать операторный токен.
 */
export function operatorToken(value: string): ExpressionToken {
  return createToken('operator', value)
}

/**
 * Хэлпер: создать скобочный токен.
 */
export function parenthesisToken(value: '(' | ')'): ExpressionToken {
  return createToken('parenthesis', value)
}
