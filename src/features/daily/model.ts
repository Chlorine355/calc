import { createDomain, sample } from 'effector'
import {
  evaluateExpressionFx,
  setLevel,
  setMode,
  resetRound,
  $targetScore,
  type EvaluationOutcome,
} from '../game/model'
import { generateDailyLevel } from '../progression/levels'
import {
  loadProgress,
  recordDailyCompletion,
  todayKey,
} from '../../shared/lib/progress'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

/**
 * Домен `daily` — «Ежедневное испытание».
 *
 * Большой пример (10 чисел, 9 бинарных операторов, без факториала), доступный
 * раз в день. У каждого выражения есть цель; превзойдя её, игрок завершает
 * испытание. Дата последнего прохождения и рекорд хранятся в общем прогрессе.
 */
const daily = createDomain('daily')

// --- Сторы ---
/** Дата (YYYY-MM-DD) последнего прохождения. */
export const $dailyLastPlayed = daily.createStore<string>(loadProgress().dailyLastPlayed)
/** Рекорд «Ежедневного испытания» (log10 лучшего результата). */
export const $dailyBestScore = daily.createStore<number>(loadProgress().dailyBestScore)
/** Доступно ли испытание сегодня (сутки сменились с последнего прохождения). */
export const $dailyAvailable = daily.createStore<boolean>(
  loadProgress().dailyLastPlayed !== todayKey(),
)
/** Идёт ли текущее испытание (чтобы не перезапускать при повторном входе). */
export const $dailyRunning = daily.createStore<boolean>(false)
/** Завершено ли текущее испытание (цель превзойдена). */
export const $dailyFinished = daily.createStore<boolean>(false)

// --- События ---
export const startDaily = daily.createEvent()
export const stopDaily = daily.createEvent()
/** Цель превзойдена — завершаем испытание и записываем результат. */
const dailySolved = daily.createEvent<EvaluationOutcome>()

// --- Логика ---

// Старт: включаем режим, выдаём уровень, сбрасываем раунд.
sample({ clock: startDaily, fn: () => 'daily' as const, target: setMode })
sample({ clock: startDaily, fn: () => generateDailyLevel(todayKey()), target: setLevel })
sample({ clock: startDaily, target: resetRound })
sample({ clock: startDaily, fn: () => true, target: $dailyRunning })
sample({ clock: startDaily, fn: () => false, target: $dailyFinished })

// Цель превзойдена (или «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО») — завершаем испытание.
sample({
  clock: evaluateExpressionFx.doneData,
  source: { running: $dailyRunning, target: $targetScore },
  filter: ({ running, target }, outcome) => running && isSolved(outcome, target),
  fn: (_, outcome) => outcome,
  target: dailySolved,
})

// При завершении: помечаем день пройденным, обновляем рекорд и доступность.
sample({
  clock: dailySolved,
  fn: (outcome) => {
    const score = outcome.kind === 'huge' ? Infinity : serializedLog10(outcome.rounded)
    return recordDailyCompletion(score)
  },
  target: $dailyBestScore,
})
sample({ clock: dailySolved, fn: () => true, target: $dailyFinished })
sample({ clock: dailySolved, fn: () => false, target: $dailyRunning })
sample({ clock: dailySolved, fn: () => false, target: $dailyAvailable })
sample({ clock: dailySolved, fn: () => todayKey(), target: $dailyLastPlayed })

// Выход из режима — сбрасываем флаг «идёт».
sample({ clock: stopDaily, fn: () => false, target: $dailyRunning })

// --- Вспомогательное ---

/** Решён ли пример: огромное число или результат превзошёл цель. */
function isSolved(outcome: EvaluationOutcome, target: number): boolean {
  if (outcome.kind === 'huge') return true
  return serializedLog10(outcome.rounded) >= target
}
