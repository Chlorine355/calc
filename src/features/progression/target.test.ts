import { describe, it, expect } from 'vitest'
import { greedyTarget } from './target'
import { generateLevel, usesAllOperators, MAX_HARDCODED_LEVEL } from './levels'
import { evaluateString } from '../evaluation/engine'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

describe('greedyTarget', () => {
  it('генерирует достижимую цель для простого набора', () => {
    const { targetScore, example } = greedyTarget([2, 3, 4], ['+', '*'])
    // Пример должен реально вычисляться
    const res = evaluateString(example)
    expect(res.ok).toBe(true)
    // Цель должна быть достижима примером
    expect(serializedLog10(res.result!)).toBeGreaterThanOrEqual(targetScore * 0.99)
  })

  it('цель выше тривиального сложения', () => {
    const { targetScore } = greedyTarget([2, 3, 4], ['+', '*'])
    // 2+3+4 = 9, log10 ≈ 0.95. Жадный должен дать больше (умножение)
    expect(targetScore).toBeGreaterThan(1)
  })

  it('степень сильно раздувает цель', () => {
    const withPow = greedyTarget([2, 3, 4, 5], ['+', '-', '*', '/', '^'])
    const withoutPow = greedyTarget([2, 3, 4, 5], ['+', '-', '*', '/'])
    expect(withPow.targetScore).toBeGreaterThan(withoutPow.targetScore)
  })

  it('факториал раздувает цель (для малого результата)', () => {
    // Без '^' жадный даёт малое произведение, к которому применим факториал.
    // 4*3*2 = 24, а 24! — гигантское число.
    const withFact = greedyTarget([2, 3, 4], ['+', '*', '!'])
    const withoutFact = greedyTarget([2, 3, 4], ['+', '*'])
    expect(withFact.targetScore).toBeGreaterThan(withoutFact.targetScore)
  })

  it('работает для любого набора чисел', () => {
    for (const nums of [[1, 1], [9, 9, 9], [2, 4, 6, 8], [3, 5, 7, 9, 9]]) {
      const { targetScore, example } = greedyTarget(nums, ['+', '-', '*', '/', '^', '!'])
      expect(targetScore).toBeGreaterThan(0)
      expect(example.length).toBeGreaterThan(0)
    }
  })
})

describe('generateLevel', () => {
  it('генерирует уровень с достижимой целью', () => {
    const lvl = generateLevel(1)
    expect(lvl.numbers).toEqual([2, 3, 4])
    expect(lvl.targetScore).toBeGreaterThan(0)
    expect(lvl.example.length).toBeGreaterThan(0)
  })

  it('уровень 9 открывает степень', () => {
    const lvl = generateLevel(9)
    expect(lvl.operators).toContain('^')
  })

  it('уровень 13 открывает факториал и скобки', () => {
    const lvl = generateLevel(13)
    expect(lvl.operators).toContain('!')
    expect(lvl.operators).toContain('()')
  })

  it('уровень 15 открывает корень', () => {
    const lvl = generateLevel(15)
    expect(lvl.operators).toContain('√')
  })

  it('бесконечный режим работает за пределами списка', () => {
    const lvl = generateLevel(100)
    expect(lvl.level).toBe(100)
    expect(lvl.targetScore).toBeGreaterThan(0)
  })

  it('каждый обучающий уровень решаем и использует все обязательные операторы', () => {
    for (let level = 1; level <= MAX_HARDCODED_LEVEL; level++) {
      const lvl = generateLevel(level)
      expect(lvl.hasTarget).toBe(true)
      expect(lvl.targetScore).toBeGreaterThan(0)
      expect(lvl.example.length).toBeGreaterThan(0)
      // Обязательные операторы — бинарные и унарные. Скобки опциональны
      // (игрок может собрать то же значение без них), поэтому их не требуем.
      const required = lvl.operators.filter((o) => o !== '()')
      expect(usesAllOperators(lvl.example, required)).toBe(true)
    }
  })
})
