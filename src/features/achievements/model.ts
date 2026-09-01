import { createDomain, sample } from 'effector'
import { evaluateExpressionFx, startGame, type EvaluationOutcome } from '../game/model'
import {
  loadAchievements,
  awardAchievements,
  AchievementId,
  type AchievementsState,
} from '../../shared/lib/achievements'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

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

// --- Условия ---

/** log10 порогов для «больше миллиона» и «больше триллиона». */
const MILLION_LOG10 = Math.log10(1_000_000)
const TRILLION_LOG10 = Math.log10(1_000_000_000_000)

/**
 * Определяет, какие достижения получены ВПЕРВЫЕ этим вычислением.
 * Сравнивает с ещё не обновлённым состоянием ($achievements читается до начисления).
 */
function earnedIds(state: AchievementsState, outcome: EvaluationOutcome): AchievementId[] {
  const ids: AchievementId[] = []

  // ОЧЕНЬ БОЛЬШОЕ ЧИСЛО: результат астрономически огромен.
  if (!state[AchievementId.VeryBigNumber] && outcome.kind === 'huge') {
    ids.push(AchievementId.VeryBigNumber)
  }

  if (outcome.kind === 'ok') {
    const { value, exponent } = outcome.rounded
    const log10 = serializedLog10(outcome.rounded)

    // Экспоненциальная запись: порядок >= 1 (число >= 10).
    if (!state[AchievementId.FirstExponential] && exponent >= 1) {
      ids.push(AchievementId.FirstExponential)
    }

    // СЫКС СЕВЕЕЕЕН: ровно 67.
    if (!state[AchievementId.SixtySeven] && exponent === 0 && parseFloat(value) === 67) {
      ids.push(AchievementId.SixtySeven)
    }

    // Дьявол: ровно 666.
    if (!state[AchievementId.Devil] && exponent === 0 && parseFloat(value) === 666) {
      ids.push(AchievementId.Devil)
    }

    // Миллионер: больше миллиона.
    if (!state[AchievementId.Millionaire] && log10 > MILLION_LOG10) {
      ids.push(AchievementId.Millionaire)
    }

    // Как тебе такое, Илон Маск?: больше триллиона.
    if (!state[AchievementId.ElonMusk] && log10 > TRILLION_LOG10) {
      ids.push(AchievementId.ElonMusk)
    }
  }

  return ids
}

// --- Логика ---

sample({
  clock: evaluateExpressionFx.doneData,
  source: $achievements,
  fn: (state, outcome) => earnedIds(state, outcome),
  target: achievementNewlyEarned,
})

// Начисляем новые достижения: обновляем стор и сохраняем в localStorage.
sample({
  clock: achievementNewlyEarned,
  fn: (ids) => awardAchievements(ids),
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
