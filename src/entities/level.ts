/**
 * Описание игрового уровня.
 */
export interface Level {
  level: number
  /** Числа в руке игрока */
  numbers: number[]
  /** Операторы в руке игрока (доступны с самого начала) */
  operators: string[]
  /**
   * Целевой показатель степени (log10), который нужно превзойти,
   * чтобы перейти на следующий уровень. Игрок ищет МАКСИМАЛЬНОЕ выражение.
   */
  targetScore: number
  /** Пример выражения, достигающего цели (найдено жадным алгоритмом) */
  example: string
}

/**
 * Правила открытия операторов по уровням.
 */
export const OPERATOR_UNLOCK_RULES = [
  { level: 10, operator: '^', label: 'Степень' },
  { level: 20, operator: '!', label: 'Факториал' },
  { level: 30, operator: '()', label: 'Скобки' },
]

/**
 * Базовые наборы операторов для разных диапазонов уровней.
 */
export const BASE_OPERATORS: Record<string, string[]> = {
  early: ['+', '*'],
  mid: ['+', '-', '*', '/'],
}
