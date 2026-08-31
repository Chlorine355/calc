import { useEffect } from 'react'
import {
  insertToken,
  deleteToken,
  moveCursorLeft,
  moveCursorRight,
  evaluateExpressionEvent,
  numberToken,
  operatorToken,
  parenthesisToken,
} from '../game/model'

/**
 * Глобальный обработчик клавиатуры на игровом экране.
 * Подключается через useEffect с addEventListener, снимается в cleanup.
 *
 * Валидация НЕ выполняется на лету — токены просто добавляются.
 */
export function useKeyboardInput(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Не перехватываем ввод в полях
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          moveCursorLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          moveCursorRight()
          break
        case 'Backspace':
          e.preventDefault()
          deleteToken()
          break
        case 'Enter':
          e.preventDefault()
          evaluateExpressionEvent()
          break
        default:
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault()
            insertToken(numberToken(parseInt(e.key, 10)))
          } else if (['+', '-', '*', '/', '^', '!'].includes(e.key)) {
            e.preventDefault()
            insertToken(operatorToken(e.key))
          } else if (e.key === '(' || e.key === ')') {
            e.preventDefault()
            insertToken(parenthesisToken(e.key as '(' | ')'))
          }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enabled])
}
