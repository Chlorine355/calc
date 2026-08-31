import { describe, it, expect } from 'vitest'
import { evaluateString, evaluateExpression } from './engine'
import { numberToken, operatorToken, parenthesisToken } from '../../entities/expression'

describe('evaluateString: некорректный ввод', () => {
  const cases: Array<{ input: string; reason: string }> = [
    // Комплексные результаты (не BigNumber) — раньше падали
    { input: '(-1)^0.5', reason: 'Комплексный результат должен отклоняться' },
    { input: 'sqrt(-1)', reason: 'Корень из отрицательного' },
    { input: 'log(-1)', reason: 'Логарифм отрицательного' },
    { input: '(-2)^0.5', reason: 'Комплексный результат' },
    // Бинарный оператор без второго операнда
    { input: '2*4+', reason: 'Оператор в конце' },
    { input: '2+', reason: 'Оператор в конце' },
    { input: '2^', reason: 'Оператор в конце' },
    // Операторы подряд
    { input: '2+*3', reason: 'Два оператора подряд' },
    { input: '2**3', reason: 'Два оператора подряд' },
    { input: '2*4+*', reason: 'Операторы подряд и в конце' },
    { input: '2+*3', reason: 'Оператор после оператора' },
    // Пустые скобки
    { input: '()', reason: 'Пустые скобки' },
    { input: '2+()', reason: 'Пустые скобки' },
    // Незакрытые / лишние скобки
    { input: '(2+3', reason: 'Незакрытая скобка' },
    { input: '2+3)', reason: 'Лишняя закрывающая скобка' },
    // Деление на ноль
    { input: '2/0', reason: 'Деление на ноль' },
    { input: '0/0', reason: 'Ноль на ноль' },
    // Случайные числа подряд
    { input: '2 3', reason: 'Числа без оператора' },
    { input: '2..3', reason: 'Некорректный литерал' },
    // Факториал в начале
    { input: '!', reason: 'Факториал без операнда' },
    // Пустое выражение
    { input: '  ', reason: 'Пустое выражение' },
  ]

  for (const { input, reason } of cases) {
    it(`отклоняет "${input}" (${reason})`, () => {
      const res = evaluateString(input)
      expect(res.ok).toBe(false)
      expect(res.error).toBeTruthy()
    })
  }
})

describe('evaluateExpression: строгая грамматика токенов', () => {
  const t = (vals: Array<number | string>) =>
    vals.map((v) => (typeof v === 'number' ? numberToken(v) : operatorToken(v)))

  it('отклоняет операторы подряд: 2*+-43', () => {
    const res = evaluateExpression(t([2, '*', '+', '-', 43]))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Операторы не могут идти подряд')
  })

  it('отклоняет оператор после оператора: 2*-3', () => {
    const res = evaluateExpression(t([2, '*', '-', 3]))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Операторы не могут идти подряд')
  })

  it('отклоняет числа подряд: 2 3', () => {
    const res = evaluateExpression(t([2, 3]))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Нужен оператор (или число не на месте)')
  })

  it('отклоняет факториал без операнда', () => {
    const res = evaluateExpression(t(['!', 3]))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Факториал применим только к одиночному числу')
  })

  it('принимает корректное выражение с факториалом: 3!', () => {
    const res = evaluateExpression(t([3, '!']))
    expect(res.ok).toBe(true)
    expect(res.result?.value).toBe('6')
  })

  it('принимает факториал после скобки: (2+3)! = 120', () => {
    const res = evaluateExpression([
      parenthesisToken('('),
      numberToken(2),
      operatorToken('+'),
      numberToken(3),
      parenthesisToken(')'),
      operatorToken('!'),
    ])
    expect(res.ok).toBe(true)
    expect(res.result?.value).toBe('120')
  })

  it('принимает степень от факториала: 5! ^ 6', () => {
    const res = evaluateExpression([
      numberToken(5),
      operatorToken('!'),
      operatorToken('^'),
      numberToken(6),
    ])
    expect(res.ok).toBe(true)
    // 120^6 = 2985984000000, exp 12
    expect(res.result?.exponent).toBe(12)
  })

  it('принимает факториал от степени: 5 ^ 6!', () => {
    const res = evaluateExpression([
      numberToken(5),
      operatorToken('^'),
      numberToken(6),
      operatorToken('!'),
    ])
    // 5^(6!) = 5^720
    expect(res.ok).toBe(true)
    expect(res.result?.exponent).toBe(503)
  })

  it('принимает корректное выражение: 2*4+3', () => {
    const res = evaluateExpression(t([2, '*', 4, '+', 3]))
    expect(res.ok).toBe(true)
    expect(res.result?.value).toBe('11')
  })
})

describe('evaluateString: корректный ввод', () => {
  const cases: Array<[string, string]> = [
    ['2*4', '8'],
    ['2*4+3', '11'],
    ['2*3*4', '24'],
    ['9^9', '3.87'], // 387420489 сериализуется как мантисса 3.87, exp=8
    ['(2+3)*4', '20'],
    ['5-2', '3'],
    ['10/2', '5'],
    ['3!', '6'],
    ['0', '0'],
  ]

  for (const [input, expected] of cases) {
    it(`вычисляет "${input}"`, () => {
      const res = evaluateString(input)
      expect(res.ok).toBe(true)
      expect(res.result?.value).toBe(expected)
    })
  }
})
