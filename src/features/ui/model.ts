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
    if (result.exponent === 0) return result.value
    return `${result.value}e${result.exponent}`
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
