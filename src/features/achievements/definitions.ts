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
    id: AchievementId.Millionaire,
    icon: '💰',
    title: 'Миллионер',
    description: 'Получил число больше миллиона.',
  },

  {
    id: AchievementId.ElonMusk,
    icon: '🚀',
    title: 'Как тебе такое, Илон Маск?',
    description: 'Получил число больше триллиона.',
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
    id: AchievementId.Devil,
    icon: '😈',
    title: 'Дьявол',
    description: 'Получил ровно 666.',
  },
  {
    id: AchievementId.NegativeThinking,
    icon: '🤔',
    title: 'Негативное мышление',
    description: 'Получил отрицательное число.',
  },
  {
    id: AchievementId.Zero,
    icon: '😐',
    title: 'Не отлично, не ужасно',
    description: 'Получил ровно 0.',
  },
  {
    id: AchievementId.Fahrenheit451,
    icon: '📖',
    title: 'Рукописи не горят',
    description: 'Получил ровно 451.',
  },
  {
    id: AchievementId.ScyllaCharybdis,
    icon: '🌊',
    title: 'Сцилла и Харибда',
    description: 'Получил ровно 68.',
  },
  {
    id: AchievementId.AbsoluteZero,
    icon: '🥶',
    title: 'Абсолютный ноль',
    description: 'Получил отрицательное очень большое число.',
  },
  {
    id: AchievementId.Pi,
    icon: '🥧',
    title: 'Пирога?',
    description: 'Получил число, начинающееся с 3.14.',
  },
  {
    id: AchievementId.GoldenRatio,
    icon: '✨',
    title: 'Золотое сечение',
    description: 'Получил число, начинающееся с 1.618.',
  },
  {
    id: AchievementId.Palindrome,
    icon: '🔁',
    title: 'Аргентина манит',
    description: 'Получил число-палиндром (например, 121, 1331, кроме однозначных).',
  },
  {
    id: AchievementId.JustOne,
    icon: '🥇',
    title: 'А большего мне и не надо',
    description: 'Получил ровно 1.',
  },
]

/** Словарь определений по id для быстрого доступа. */
export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>
