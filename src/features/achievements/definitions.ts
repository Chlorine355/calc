import { AchievementId } from '../../shared/lib/achievements'

/**
 * Общие определения достижений: id, иконка, название, описание.
 * Используются и на странице достижений, и на экране результата.
 */
export interface AchievementDef {
  id: AchievementId
  icon: string
  title: string
  description: string
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: AchievementId.FirstExponential,
    icon: '🔢',
    title: 'Е',
    description: 'Впервые получил число с экспоненциальной записью (e-нотация).',
  },
  {
    id: AchievementId.VeryBigNumber,
    icon: '🚀',
    title: 'ОЧЕНЬ БОЛЬШОЕ ЧИСЛО',
    description: 'Собрал выражение, результат которого вышел за пределы расчёта.',
  },
  {
    id: AchievementId.SixtySeven,
    icon: '7️⃣',
    title: 'СЫКС СЕВЕЕЕЕН',
    description: 'Получил ровно 67.',
  },
  {
    id: AchievementId.Millionaire,
    icon: '💰',
    title: 'Миллионер',
    description: 'Получил число больше миллиона.',
  },
  {
    id: AchievementId.Devil,
    icon: '😈',
    title: 'Дьявол',
    description: 'Получил ровно 666.',
  },
  {
    id: AchievementId.ElonMusk,
    icon: '🚀',
    title: 'Как тебе такое, Илон Маск?',
    description: 'Получил число больше триллиона.',
  },
]

/** Словарь определений по id для быстрого доступа. */
export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>
