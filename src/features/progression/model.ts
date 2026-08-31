import { createDomain, sample } from 'effector'
import { $currentLevel, $unlockedOperators } from '../game/model'
import { loadProgress } from '../../shared/lib/progress'

/**
 * Домен `progression` — прогрессия и открытия.
 */
const progression = createDomain('progression')

// --- Сторы ---
// Рекорд (максимальный достигнутый уровень) — читаем из localStorage при старте
export const $highestLevel = progression.createStore<number>(loadProgress().highestLevel)

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
