import { describe, it, expect } from 'vitest'
import { evaluateOne } from './engine'
import { numberToken, operatorToken, parenthesisToken } from '../../entities/expression'

describe('evaluateOne: унарные операторы', () => {
  it('унарный минус: 2*-3 = -6', () => {
    const res = evaluateOne([numberToken(2), operatorToken('*'), operatorToken('-', true), numberToken(3)])
    expect(res.ok).toBe(true)
    expect(res.rounded?.value).toBe('-6')
  })

  it('унарный минус в начале: -5', () => {
    const res = evaluateOne([operatorToken('-', true), numberToken(5)])
    expect(res.ok).toBe(true)
    expect(res.rounded?.value).toBe('-5')
  })

  it('корень числа: √9 = 3', () => {
    const res = evaluateOne([operatorToken('√', true), numberToken(9)])
    expect(res.ok).toBe(true)
    expect(res.rounded?.value).toBe('3')
  })

  it('корень от группы: √(2+3*4)', () => {
    const res = evaluateOne([
      operatorToken('√', true),
      parenthesisToken('('),
      numberToken(2),
      operatorToken('+'),
      numberToken(3),
      operatorToken('*'),
      numberToken(4),
      parenthesisToken(')'),
    ])
    expect(res.ok).toBe(true)
    // sqrt(14) ≈ 3.7416
    expect(res.rounded?.value).toBe('3.7417')
  })

  it('корень из отрицательного — ошибка', () => {
    const res = evaluateOne([operatorToken('√', true), numberToken(-4)])
    expect(res.ok).toBe(false)
  })
})

describe('evaluateOne: обрезка до 4 знаков', () => {
  it('1/3 показывается как 0.3333', () => {
    const res = evaluateOne([numberToken(1), operatorToken('/'), numberToken(3)])
    expect(res.ok).toBe(true)
    expect(res.rounded?.value).toBe('0.3333')
  })

  it('0.1+0.2 даёт 0.3 (без хвостовых нулей)', () => {
    const res = evaluateOne([numberToken(0.1), operatorToken('+'), numberToken(0.2)])
    // 0.1+0.2 в BigNumber = 0.3
    expect(res.rounded?.value).toBe('0.3')
  })

  it('деление нацело не добавляет нули: 6/3 = 2', () => {
    const res = evaluateOne([numberToken(6), operatorToken('/'), numberToken(3)])
    expect(res.rounded?.value).toBe('2')
  })

  it('большие числа сохраняют мантиссу', () => {
    const res = evaluateOne([numberToken(2), operatorToken('^'), numberToken(81)])
    expect(res.ok).toBe(true)
    expect(res.rounded?.exponent).toBe(24)
  })
})
