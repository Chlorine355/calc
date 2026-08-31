import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { ExpressionField } from '../../components/ExpressionField/ExpressionField'
import { Palette } from '../../components/Palette/Palette'
import { ResultOverlay } from '../../components/ResultOverlay/ResultOverlay'
import { useKeyboardInput } from '../../features/input/useKeyboardInput'
import {
  $currentLevel,
  $hand,
  $expression,
  $cursorPosition,
  $result,
  $score,
  $validationError,
  $targetScore,
  $isEvaluating,
  insertToken,
  setCursorPosition,
  evaluateExpressionEvent,
  resetRound,
  numberToken,
  operatorToken,
  parenthesisToken,
} from '../../features/game/model'
import { $unlockedOperators } from '../../features/progression/model'
import {
  $showResultAnimation,
  $lastResultString,
  hideResultAnimation,
} from '../../features/ui/model'
import { formatHugeNumber } from '../../shared/lib/formatHugeNumber'
import { create, all } from 'mathjs'
import styles from './Game.module.css'

const math = create(all, { number: 'BigNumber', precision: 64 })

interface GameProps {
  onExit: () => void
  onLevelComplete: () => void
}

/**
 * Экран 2: Игровой экран (основной).
 */
export function Game({ onExit, onLevelComplete }: GameProps) {
  const currentLevel = useUnit($currentLevel)
  const hand = useUnit($hand)
  const expression = useUnit($expression)
  const cursor = useUnit($cursorPosition)
  const result = useUnit($result)
  const score = useUnit($score)
  const validationError = useUnit($validationError)
  const targetScore = useUnit($targetScore)
  const isEvaluating = useUnit($isEvaluating)
  const unlockedOperators = useUnit($unlockedOperators)
  const showResultAnimation = useUnit($showResultAnimation)
  const lastResultString = useUnit($lastResultString)

  useKeyboardInput(true)

  // Операторы палитры: из руки + открытые. Разворачиваем '()' в '(' и ')'.
  const paletteOperators = [
    ...new Set(
      [...hand.operators, ...unlockedOperators].flatMap((op) =>
        op === '()' ? ['(', ')'] : [op]
      )
    ),
  ]

  const handleNumber = (n: number) => insertToken(numberToken(n))
  const handleOperator = (op: string) => {
    if (op === '(' || op === ')') {
      insertToken(parenthesisToken(op as '(' | ')'))
    } else {
      insertToken(operatorToken(op))
    }
  }

  const handleEvaluate = () => evaluateExpressionEvent()

  const handleNextLevel = () => {
    hideResultAnimation()
    onLevelComplete()
  }

  const handleReset = () => {
    hideResultAnimation()
    resetRound()
  }

  // Форматируем результат для отображения
  const resultDisplay = result ? formatHugeNumber(math.bignumber(result.value + 'e' + result.exponent)) : null

  // Достигнута ли цель
  const targetReached = result !== null && score >= targetScore

  return (
    <div className={styles.game}>
      {/* Верхняя панель */}
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={onExit}>
          ← Меню
        </Button>
        <div className={styles.levelInfo}>
          <span className={styles.level}>Уровень {currentLevel}</span>
          <span className={styles.score}>Очки: {Math.round(score)}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Сбросить
        </Button>
      </header>

      {/* Цель */}
      <div className={styles.target}>
        Цель: превзойти <b>{targetScore.toFixed(1)}</b> (log10)
      </div>

      {/* Поле выражения */}
      <ExpressionField
        tokens={expression}
        cursor={cursor}
        onSelectSlot={setCursorPosition}
      />

      {/* Ошибка валидации */}
      {validationError && (
        <div className={styles.error}>{validationError}</div>
      )}

      {/* Результат */}
      {result && (
        <div className={styles.resultBar}>
          <span className={styles.resultLabel}>Результат:</span>
          <span className={styles.resultValue}>{resultDisplay}</span>
          {targetReached && <span className={styles.success}>✓ Цель достигнута!</span>}
        </div>
      )}

      {/* Палитра */}
      <Palette
        numbers={hand.numbers}
        operators={paletteOperators}
        expression={expression}
        onNumber={handleNumber}
        onOperator={handleOperator}
      />

      {/* Кнопка Вычислить */}
      <div className={styles.actions}>
        <Button size="lg" onClick={handleEvaluate} disabled={isEvaluating}>
          {isEvaluating ? 'Считаем…' : 'Вычислить'}
        </Button>
        {targetReached && (
          <Button size="lg" variant="secondary" onClick={handleNextLevel}>
            Следующий уровень →
          </Button>
        )}
      </div>

      {/* Оверлей результата */}
      <ResultOverlay
        show={showResultAnimation}
        resultString={lastResultString}
        onClose={handleNextLevel}
      />
    </div>
  )
}
