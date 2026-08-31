import { describe, it, expect } from 'vitest'
import { evaluateExpression, tokensToString } from './engine'
import { numberToken, operatorToken, parenthesisToken } from '../../entities/expression'

function tokens(...vals: Array<number | string>): ReturnType<typeof numberToken>[] {
  return vals.map((v) =>
    typeof v === 'number' ? numberToken(v) : operatorToken(v)
  ) as ReturnType<typeof numberToken>[]
}

describe('evaluateExpression', () => {
  it('вычисляет простое сложение', () => {
    const res = evaluateExpression(tokens(2, '+', 3))
    expect(res.ok).toBe(true)
    expect(res.result?.value).toBe('5')
  })

  it('вычисляет умножение', () => {
    const res = evaluateExpression(tokens(6, '*', 7))
    expect(res.ok).toBe(true)
    expect(res.result?.value).toBe('42')
  })

  it('вычисляет факториал 100!', () => {
    const res = evaluateExpression(tokens(100, '!'))
    expect(res.ok).toBe(true)
    // 100! ≈ 9.33e157
    expect(res.result?.exponent).toBe(157)
  })

  it('вычисляет степень степени 9^(9^9)', () => {
    const res = evaluateExpression(tokens(9, '^', '(', 9, '^', 9, ')'))
    expect(res.ok).toBe(true)
    // 9^9 = 387420489, 9^387420489 — гигантское число
    expect(res.result?.exponent).toBeGreaterThan(1e8)
  })

  it('степень правоассоциативна: 2^3^4 = 2^(3^4) = 2^81', () => {
    const res = evaluateExpression(tokens(2, '^', 3, '^', 4))
    expect(res.ok).toBe(true)
    // 2^81 ≈ 2.4e24
    expect(res.result?.exponent).toBe(24)
  })

  it('деление на ноль даёт ошибку', () => {
    const res = evaluateExpression(tokens(5, '/', 0))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Деление на ноль!')
  })

  it('неполное выражение даёт ошибку', () => {
    const res = evaluateExpression(tokens(2, '+'))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Выражение не может заканчиваться оператором')
  })

  it('синтаксическая ошибка (два оператора подряд) даёт ошибку', () => {
    const res = evaluateExpression(tokens(2, '+', '*', 3))
    expect(res.ok).toBe(false)
  })

  it('пустое выражение даёт ошибку', () => {
    const res = evaluateExpression([])
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Пустое выражение')
  })

  it('скобки работают', () => {
    const res = evaluateExpression([
      parenthesisToken('('),
      numberToken(2),
      operatorToken('+'),
      numberToken(3),
      parenthesisToken(')'),
      operatorToken('*'),
      numberToken(4),
    ])
    expect(res.ok).toBe(true)
    expect(res.result?.value).toBe('20')
  })
})

describe('tokensToString', () => {
  it('собирает строку из токенов', () => {
    expect(tokensToString(tokens(2, '+', 3, '*', 4))).toBe('2+3*4')
  })
})
