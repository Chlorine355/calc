import { describe, it, expect } from 'vitest'
import { createStore } from 'effector'
import { fork, allSettled } from 'effector'
import {
  startGame,
  insertToken,
  removeToken,
  setCursorPosition,
  resetRound,
  $expression,
  $cursorPosition,
  numberToken,
  operatorToken,
} from './model'

function n(value: number) {
  return numberToken(value)
}

describe('removeToken (клик по токену)', () => {
  it('после удаления оператора курсор встаёт на его место, и сразу можно вставлять', async () => {
    const expression = createStore([n(2), operatorToken('+'), n(2)] as any)
    void expression

    const scope = fork()

    // Стартуем уровень 1 — раздаёт числа и операторы в руку игрока
    await allSettled(startGame, { scope, params: 1 })

    // Соберём 2 + 3 (уровень 1 даёт числа [2,3,4] и операторы [+, *])
    await allSettled(insertToken, { scope, params: n(2) })
    await allSettled(insertToken, { scope, params: operatorToken('+') })
    await allSettled(insertToken, { scope, params: n(3) })

    // Курсор сейчас в конце (3). Поставим его в 0 — проверяем, что курсор
    // после удаления всё равно встанет на место удалённого токена, не зависит
    // от того, где он был до удаления.
    await allSettled(setCursorPosition, { scope, params: 0 })
    expect(scope.getState($cursorPosition)).toBe(0)

    // Удаляем оператор (позиция 1) и проверяем, что курсор встал на его место.
    const removedId = scope.getState($expression)[1].id
    await allSettled(removeToken, { scope, params: removedId })

    expect(scope.getState($expression).map((t) => t.value)).toEqual([2, 3])
    expect(scope.getState($cursorPosition)).toBe(1)

    // Сразу после удаления можно вставить на это место (например, бинарный *)
    await allSettled(insertToken, { scope, params: operatorToken('*') })
    expect(scope.getState($expression).map((t) => t.value)).toEqual([2, '*', 3])
    expect(scope.getState($cursorPosition)).toBe(2)
  })

  it('удаление последнего элемента ставит курсор в конец', async () => {
    const scope = fork()
    await allSettled(startGame, { scope, params: 1 })
    await allSettled(insertToken, { scope, params: n(2) })
    await allSettled(insertToken, { scope, params: operatorToken('+') })
    await allSettled(insertToken, { scope, params: n(3) })

    // Курсор изначально в конце (позиция 3). Удаляем последний токен (число 3).
    const removedId = scope.getState($expression)[2].id
    await allSettled(removeToken, { scope, params: removedId })

    expect(scope.getState($expression).map((t) => t.value)).toEqual([2, '+'])
    // Курсор должен стать в конец выражения (позиция 2), не вылететь за границы.
    expect(scope.getState($cursorPosition)).toBe(2)
    expect(scope.getState($expression).length).toBe(2)
  })

  it('удаление токена из середины с курсором в конце: курсор ставится на его место', async () => {
    const scope = fork()
    await allSettled(startGame, { scope, params: 1 })
    await allSettled(insertToken, { scope, params: n(2) })
    await allSettled(insertToken, { scope, params: operatorToken('+') })
    await allSettled(insertToken, { scope, params: n(3) })

    // Курсор в конце (позиция 3). Достаём id оператора в середине и удаляем его.
    const operatorId = scope.getState($expression)[1].id
    await allSettled(removeToken, { scope, params: operatorId })

    // Курсор должен встать на место удалённого оператора (позиция 1),
    // а не оставаться в конце.
    expect(scope.getState($expression).map((t) => t.value)).toEqual([2, 3])
    expect(scope.getState($cursorPosition)).toBe(1)
  })

  it('resetRound сбрасывает курсор в 0', async () => {
    const scope = fork()
    await allSettled(insertToken, { scope, params: n(2) })
    await allSettled(insertToken, { scope, params: n(3) })
    await allSettled(resetRound, { scope })
    expect(scope.getState($cursorPosition)).toBe(0)
    expect(scope.getState($expression)).toHaveLength(0)
  })
})
