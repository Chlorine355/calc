import { createDomain, sample } from 'effector'
import { evaluateExpressionFx, startGame } from '../game/model'
import {
  loadAchievements,
  awardAchievement,
  AchievementId,
  type AchievementsState,
} from '../../shared/lib/achievements'

/**
 * Домен `achievements` — система достижений.
 * Отдельный стор и отдельная запись в localStorage (бинарная: получено/нет).
 */
const achievements = createDomain('achievements')

// --- Сторы ---
// Состояние достижений: id -> получено ли. Читается из localStorage при старте.
export const $achievements = achievements.createStore<AchievementsState>(loadAchievements())

// Достижения, ВПЕРВЫЕ полученные в текущем раунде (для плашки на экране результата).
export const $roundAchievements = achievements.createStore<AchievementId[]>([])

// Событие: какие достижения получены впервые этим вычислением.
const achievementNewlyEarned = achievements.createEvent<AchievementId[]>()

// --- Логика ---

// Определяет, какие достижения получены ВПЕРВЫЕ этим вычислением, сравнивая с
// ещё не обновлённым состоянием ($achievements читается до начисления).
sample({
  clock: evaluateExpressionFx.doneData,
  source: $achievements,
  fn: (state, outcome): AchievementId[] => {
    const ids: AchievementId[] = []
    if (outcome.kind === 'huge' && !state[AchievementId.VeryBigNumber]) {
      ids.push(AchievementId.VeryBigNumber)
    } else if (
      outcome.kind === 'ok' &&
      outcome.rounded.exponent >= 1 &&
      !state[AchievementId.FirstExponential]
    ) {
      ids.push(AchievementId.FirstExponential)
    }
    return ids
  },
  target: achievementNewlyEarned,
})

// Начисляем новые достижения: обновляем стор и сохраняем в localStorage.
// Условия взаимоисключающие, поэтому за раз приходит не больше одного id.
sample({
  clock: achievementNewlyEarned,
  fn: (ids) => (ids.length ? awardAchievement(ids[0]) : loadAchievements()),
  target: $achievements,
})

// Копим впервые полученные за раунд (для плашки результата).
sample({
  clock: achievementNewlyEarned,
  source: $roundAchievements,
  fn: (round, ids) => [...round, ...ids.filter((id) => !round.includes(id))],
  target: $roundAchievements,
})

// При старте нового уровня очищаем достижения текущего раунда.
sample({
  clock: startGame,
  fn: () => [],
  target: $roundAchievements,
})

// --- Экспорт для UI ---
export type { AchievementId, AchievementsState }
