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
  SixtySeven: 'sixty-seven',
  Millionaire: 'millionaire',
  Devil: 'devil',
  ElonMusk: 'elon-musk',
  NegativeThinking: 'negative-thinking',
  Zero: 'zero',
  Fahrenheit451: 'fahrenheit-451',
  ScyllaCharybdis: 'scylla-charybdis',
  AbsoluteZero: 'absolute-zero',
  Pi: 'pi',
  GoldenRatio: 'golden-ratio',
  Palindrome: 'palindrome',
  JustOne: 'just-one',
  ThousandMinusSeven: 'thousand-minus-seven',
  ThreeAxes: 'three-axes',
  RescueArseniy: 'rescue-arseniy',
} as const

export type AchievementId = (typeof AchievementId)[keyof typeof AchievementId]

/** Состояние достижений: id -> получено ли. */
export type AchievementsState = Record<AchievementId, boolean>

const DEFAULT_ACHIEVEMENTS: AchievementsState = {
  [AchievementId.FirstExponential]: false,
  [AchievementId.VeryBigNumber]: false,
  [AchievementId.SixtySeven]: false,
  [AchievementId.Millionaire]: false,
  [AchievementId.Devil]: false,
  [AchievementId.ElonMusk]: false,
  [AchievementId.NegativeThinking]: false,
  [AchievementId.Zero]: false,
  [AchievementId.Fahrenheit451]: false,
  [AchievementId.ScyllaCharybdis]: false,
  [AchievementId.AbsoluteZero]: false,
  [AchievementId.Pi]: false,
  [AchievementId.GoldenRatio]: false,
  [AchievementId.Palindrome]: false,
  [AchievementId.JustOne]: false,
  [AchievementId.ThousandMinusSeven]: false,
  [AchievementId.ThreeAxes]: false,
  [AchievementId.RescueArseniy]: false,
}

/**
 * Читает достижения из localStorage. При отсутствии/повреждении — все неполучены.
 * Отсутствующие в хранилище ключи (например, добавленные в новой версии) — false.
 */
export function loadAchievements(): AchievementsState {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY)
    if (!raw) return { ...DEFAULT_ACHIEVEMENTS }
    const data = JSON.parse(raw) as Partial<AchievementsState>
    const result = { ...DEFAULT_ACHIEVEMENTS }
    for (const id of Object.keys(DEFAULT_ACHIEVEMENTS) as AchievementId[]) {
      if (data[id] === true) result[id] = true
    }
    return result
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
 * Отмечает несколько достижений как полученные (идемпотентно) и сохраняет.
 * Возвращает актуальное состояние.
 */
export function awardAchievements(ids: readonly AchievementId[]): AchievementsState {
  if (ids.length === 0) return loadAchievements()
  const prev = loadAchievements()
  const next = { ...prev }
  for (const id of ids) next[id] = true
  saveAchievements(next)
  return next
}

/** @deprecated Используй awardAchievements с одним элементом. */
export function awardAchievement(id: AchievementId): AchievementsState {
  return awardAchievements([id])
}
