import { createDomain, sample } from 'effector'
import { $currentLevel, $unlockedOperators } from '../game/model'

/**
 * Домен `progression` — прогрессия и открытия.
 */
const progression = createDomain('progression')

// --- Сторы ---
export const $highestLevel = progression.createStore<number>(1)

// Реэкспортируем открытые операторы из game-домена (единый источник истины)
export { $unlockedOperators }

// --- Логика ---

// Отслеживаем максимальный достигнутый уровень
sample({
  clock: $currentLevel,
  source: $highestLevel,
  fn: (highest, level) => Math.max(highest, level),
  target: $highestLevel,
})
