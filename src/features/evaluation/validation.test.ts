import { describe, it, expect } from 'vitest'
import { evaluateString } from './engine'

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
