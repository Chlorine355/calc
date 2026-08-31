/**
 * Персистентность достижений в localStorage.
 *
 * Хранится отдельно от прогресса (calc-progress), в бинарном виде:
 * каждое достижение — true/false (получено или нет).
 */
export const ACHIEVEMENTS_KEY = 'calc-achievements'

/** Идентификаторы достижений. */
export const AchievementId = {
  FirstExponential: 'first-exponential',
  VeryBigNumber: 'very-big-number',
} as const

export type AchievementId = (typeof AchievementId)[keyof typeof AchievementId]

/** Состояние достижений: id -> получено ли. */
export type AchievementsState = Record<AchievementId, boolean>

const DEFAULT_ACHIEVEMENTS: AchievementsState = {
  [AchievementId.FirstExponential]: false,
  [AchievementId.VeryBigNumber]: false,
}

/**
 * Читает достижения из localStorage. При отсутствии/повреждении — все неполучены.
 */
export function loadAchievements(): AchievementsState {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY)
    if (!raw) return { ...DEFAULT_ACHIEVEMENTS }
    const data = JSON.parse(raw) as Partial<AchievementsState>
    return {
      [AchievementId.FirstExponential]: data[AchievementId.FirstExponential] === true,
      [AchievementId.VeryBigNumber]: data[AchievementId.VeryBigNumber] === true,
    }
  } catch {
    return { ...DEFAULT_ACHIEVEMENTS }
  }
}

/**
 * Сохраняет достижения в localStorage. Никогда не бросает исключений.
 */
export function saveAchievements(state: AchievementsState): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state))
  } catch {
    // localStorage может быть недоступен (приватный режим) — игнорируем
  }
}

/**
 * Отмечает достижение как полученное (идемпотентно) и сохраняет.
 * Возвращает актуальное состояние.
 */
export function awardAchievement(id: AchievementId): AchievementsState {
  const prev = loadAchievements()
  if (prev[id]) return prev
  const next = { ...prev, [id]: true }
  saveAchievements(next)
  return next
}
