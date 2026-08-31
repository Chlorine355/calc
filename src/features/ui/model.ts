import { createDomain, sample } from 'effector'
import { evaluateExpressionFx } from '../game/model'

/**
 * Домен `ui` — состояние интерфейса.
 */
const ui = createDomain('ui')

// --- Сторы ---
export const $showResultAnimation = ui.createStore<boolean>(false)
export const $lastResultString = ui.createStore<string>('')

// --- События ---
export const hideResultAnimation = ui.createEvent()

// --- Логика ---

// При успешном вычислении показываем анимацию результата
sample({
  clock: evaluateExpressionFx.doneData,
  fn: (result) => {
    // Формируем строку результата из сериализованного числа
    if (result.kind === 'huge') return 'ОЧЕНЬ БОЛЬШОЕ ЧИСЛО'
    if (result.rounded.exponent === 0) return result.rounded.value
    return `${result.rounded.value}e${result.rounded.exponent}`
  },
  target: $lastResultString,
})

sample({
  clock: evaluateExpressionFx.doneData,
  fn: () => true,
  target: $showResultAnimation,
})

sample({
  clock: hideResultAnimation,
  fn: () => false,
  target: $showResultAnimation,
})
