/**
 * Персистентность прогресса в localStorage.
 *
 * Хранит:
 * - `currentLevel` — уровень, на котором остановился игрок (точка продолжения)
 * - `highestLevel` — максимальный достигнутый уровень
 * - `highestScore` — рекорд: максимальные очки (log10), начисленные за выражение
 * - `bombHighScore` — рекорд режима «Часовая бомба»: сколько примеров решено за минуту
 * - `dailyLastPlayed` — дата (YYYY-MM-DD) последнего прохождения «Ежедневного испытания»
 * - `dailyBestScore` — рекорд «Ежедневного испытания» (log10 лучшего результата)
 */
export const PROGRESS_KEY = 'calc-progress'

export interface ProgressData {
  currentLevel: number
  highestLevel: number
  highestScore: number
  bombHighScore: number
  dailyLastPlayed: string
  dailyBestScore: number
}

const DEFAULT_PROGRESS: ProgressData = {
  currentLevel: 1,
  highestLevel: 1,
  highestScore: 0,
  bombHighScore: 0,
  dailyLastPlayed: '',
  dailyBestScore: 0,
}

function sanitize(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

function sanitizeScore(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0
}

function sanitizeDate(n: unknown): string {
  return typeof n === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : ''
}

/**
 * Читает прогресс из localStorage. При отсутствии/повреждении — стартовые значения.
 */
export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const data = JSON.parse(raw) as Partial<ProgressData>
    return {
      currentLevel: sanitize(data.currentLevel),
      highestLevel: sanitize(data.highestLevel),
      highestScore: sanitizeScore(data.highestScore),
      bombHighScore: sanitizeScore(data.bombHighScore),
      dailyLastPlayed: sanitizeDate(data.dailyLastPlayed),
      dailyBestScore: sanitizeScore(data.dailyBestScore),
    }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

/**
 * Сохраняет прогресс в localStorage. Никогда не бросает исключений.
 */
export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data))
  } catch {
    // localStorage может быть недоступен (приватный режим) — игнорируем
  }
}

/**
 * Обновляет рекорд очков: сохраняет максимум из текущего и нового значения.
 * Возвращает актуальный рекорд.
 */
export function recordHighScore(score: number): number {
  const prev = loadProgress()
  const best = Math.max(prev.highestScore, score)
  saveProgress({ ...prev, highestScore: best })
  return best
}

/**
 * Обновляет рекорд режима «Часовая бомба»: сохраняет максимум из текущего
 * и нового значения. Возвращает актуальный рекорд.
 */
export function recordBombHighScore(score: number): number {
  const prev = loadProgress()
  const best = Math.max(prev.bombHighScore, score)
  saveProgress({ ...prev, bombHighScore: best })
  return best
}

/**
 * Ключ текущего дня в локальном времени (YYYY-MM-DD). Используется, чтобы
 * понять, сменились ли сутки с последнего прохождения «Ежедневного испытания».
 */
export function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Отмечает, что «Ежедневное испытание» пройдено сегодня, и обновляет рекорд.
 * Возвращает актуальный рекорд.
 */
export function recordDailyCompletion(score: number): number {
  const prev = loadProgress()
  const best = Math.max(prev.dailyBestScore, score)
  saveProgress({
    ...prev,
    dailyLastPlayed: todayKey(),
    dailyBestScore: best,
  })
  return best
}
