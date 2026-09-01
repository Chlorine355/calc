import { createDomain, sample } from 'effector'
import {
  evaluateExpressionFx,
  setLevel,
  setMode,
  resetRound,
  $targetScore,
  type EvaluationOutcome,
} from '../game/model'
import { generateBombLevel } from '../progression/levels'
import { loadProgress, recordBombHighScore } from '../../shared/lib/progress'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'

/**
 * Домен `bomb` — режим «Часовая бомба».
 *
 * За минуту нужно собрать как можно больше выражений, каждое из которых
 * превосходит свою цель. За каждый решённый пример — +1 очко (независимо
 * от величины результата). Рекорд хранится в общем хранилище прогресса.
 */
const bomb = createDomain('bomb')

/** Длительность раунда, секунд. */
export const BOMB_DURATION = 60

// --- Сторы ---
/** Сколько секунд осталось. */
export const $bombTimeLeft = bomb.createStore<number>(BOMB_DURATION)
/** Сколько примеров решено за текущий раунд. */
export const $bombScore = bomb.createStore<number>(0)
/** Рекорд режима (максимум решённых за раунд), из localStorage. */
export const $bombHighScore = bomb.createStore<number>(loadProgress().bombHighScore)
/** Идёт ли раунд (таймер активен). */
export const $bombRunning = bomb.createStore<boolean>(false)
/** Раунд завершён (время вышло) — показываем итог и кнопку «Заново». */
export const $bombFinished = bomb.createStore<boolean>(false)

// --- События ---
export const startBomb = bomb.createEvent()
export const stopBomb = bomb.createEvent()
/** Тик таймера (раз в секунду). */
export const bombTick = bomb.createEvent()
/** Пример решён (цель превзойдена) — начисляем очко и даём новый пример. */
const bombSolved = bomb.createEvent()
/** Внутренний сигнал «выдать следующий пример» (старт или после решения). */
const nextBombLevel = bomb.createEvent()

// --- Логика ---

// Старт раунда: включаем режим бомбы, сбрасываем таймер, счёт и флаг завершения.
sample({ clock: startBomb, fn: () => 'bomb' as const, target: setMode })
sample({ clock: startBomb, fn: () => BOMB_DURATION, target: $bombTimeLeft })
sample({ clock: startBomb, fn: () => 0, target: $bombScore })
sample({ clock: startBomb, fn: () => true, target: $bombRunning })
sample({ clock: startBomb, fn: () => false, target: $bombFinished })
// Первый пример.
sample({ clock: startBomb, target: nextBombLevel })

// Выдача примера: генерируем уровень и сбрасываем раунд.
// Используем sample-цепочку (а не вызовы событий внутри fn), чтобы
// setLevel/resetRound корректно срабатывали и в forked-скоупах (тесты).
sample({ clock: nextBombLevel, fn: () => generateBombLevel(), target: setLevel })
sample({ clock: nextBombLevel, target: resetRound })

// Тик таймера: уменьшаем остаток.
sample({
  clock: bombTick,
  source: $bombTimeLeft,
  fn: (left) => Math.max(0, left - 1),
  target: $bombTimeLeft,
})

// Время вышло — останавливаем раунд, помечаем завершённым и обновляем рекорд.
sample({
  clock: $bombTimeLeft,
  filter: (left) => left <= 0,
  fn: () => false,
  target: $bombRunning,
})
sample({
  clock: $bombTimeLeft,
  filter: (left) => left <= 0,
  fn: () => true,
  target: $bombFinished,
})
sample({
  clock: $bombTimeLeft,
  source: $bombScore,
  filter: (_, left) => left <= 0,
  fn: (score) => recordBombHighScore(score),
  target: $bombHighScore,
})

// Пример решён: цель превзойдена (или «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО»).
// В бомбе у каждого примера есть цель (hasTarget=true), поэтому решён =
// результат >= цели. Считаем по outcome напрямую (обычный $score в бомбе не пишем).
sample({
  clock: evaluateExpressionFx.doneData,
  source: { running: $bombRunning, target: $targetScore },
  filter: ({ running, target }, outcome) => running && isSolved(outcome, target),
  fn: () => {},
  target: bombSolved,
})

// Начисляем очко и даём следующий пример.
sample({
  clock: bombSolved,
  source: $bombScore,
  fn: (score) => score + 1,
  target: $bombScore,
})
sample({ clock: bombSolved, target: nextBombLevel })

// Остановка вручную (выход из режима) — сбрасываем флаг и таймер,
// чтобы при следующем входе раунд начинался с полной минуты.
sample({ clock: stopBomb, fn: () => false, target: $bombRunning })
sample({ clock: stopBomb, fn: () => false, target: $bombFinished })
sample({ clock: stopBomb, fn: () => BOMB_DURATION, target: $bombTimeLeft })

// --- Вспомогательное ---

/** Решён ли пример: огромное число или результат превзошёл цель. */
function isSolved(outcome: EvaluationOutcome, target: number): boolean {
  if (outcome.kind === 'huge') return true
  return serializedLog10(outcome.rounded) >= target
}
