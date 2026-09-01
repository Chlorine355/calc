import { useEffect } from 'react'
import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { ExpressionField } from '../../components/ExpressionField/ExpressionField'
import { Palette } from '../../components/Palette/Palette'
import { useKeyboardInput } from '../../features/input/useKeyboardInput'
import {
  $currentLevel,
  $hand,
  $expression,
  $cursorPosition,
  $result,
  $previewResult,
  $score,
  $validationError,
  $resultMessage,
  $hugeAchievement,
  $targetScore,
  $hasTarget,
  $isEvaluating,
  insertToken,
  setCursorPosition,
  evaluateExpressionEvent,
  resetRound,
  numberToken,
  operatorToken,
  parenthesisToken,
} from '../../features/game/model'
import { formatLog10Target } from '../../shared/lib/formatHugeNumber'
import styles from './Game.module.css'

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
  const previewResult = useUnit($previewResult)
  const score = useUnit($score)
  const validationError = useUnit($validationError)
  const resultMessage = useUnit($resultMessage)
  const hugeAchievement = useUnit($hugeAchievement)
  const targetScore = useUnit($targetScore)
  const hasTarget = useUnit($hasTarget)
  const isEvaluating = useUnit($isEvaluating)

  useKeyboardInput(true)

  // Операторы палитры: ТОЛЬКО из руки уровня.
  // Бинарные (+ - * / ^) — ровно числа−1 (счётчик), унарные (√, !) — отдельно.
  const binaryOperators = hand.operators.filter(
    (op) => op !== '√' && op !== '!' && op !== '()',
  )
  const unaryOperators = hand.operators.filter((op) => op === '√' || op === '!')

  const handleNumber = (n: number) => insertToken(numberToken(n))
  const handleOperator = (op: string, unary = false) => {
    if (op === '(' || op === ')') {
      insertToken(parenthesisToken(op as '(' | ')'))
    } else {
      insertToken(operatorToken(op, unary))
    }
  }

  const handleEvaluate = () => evaluateExpressionEvent()

  const handleReset = () => {
    resetRound()
  }

  // Достигнута ли цель:
  // - уровень с целью — результат превзошёл цель (или «ОЧЕНЬ БОЛЬШОЕ ЧИСЛО»);
  // - уровень без цели (генерируемый) — любой валидный результат.
  const targetReached =
    (result !== null && (!hasTarget || score >= targetScore)) || hugeAchievement

  // При достижении цели сразу переходим на экран результата (без лишнего клика)
  useEffect(() => {
    if (targetReached) onLevelComplete()
  }, [targetReached, onLevelComplete])

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

      {/* Цель (только у обучающих уровней) */}
      {hasTarget ? (
        <div className={styles.target}>
          Цель: превзойти <b>{formatLog10Target(targetScore)}</b>
        </div>
      ) : (
        <div className={styles.target}>
          Цель: собрать <b>любое</b> число
        </div>
      )}

      {/* Поле выражения */}
      <ExpressionField
        tokens={expression}
        cursor={cursor}
        onSelectSlot={setCursorPosition}
        preview={previewResult}
      />

      {/* Ошибка валидации */}
      {validationError && (
        <div className={styles.error}>{validationError}</div>
      )}

      {/* Сообщение о результате (цель не достигнута) */}
      {resultMessage && <div className={styles.resultMessage}>{resultMessage}</div>}

      {/* Палитра */}
      <Palette
        numbers={hand.numbers}
        binaryOperators={binaryOperators}
        unaryOperators={unaryOperators}
        parenPairs={hand.operators.includes('()') ? 2 : 0}
        expression={expression}
        onNumber={handleNumber}
        onOperator={handleOperator}
      />

      {/* Кнопка Вычислить */}
      <div className={styles.actions}>
        <Button size="lg" onClick={handleEvaluate} disabled={isEvaluating}>
          {isEvaluating ? 'Считаем…' : 'Вычислить'}
        </Button>
      </div>
    </div>
  )
}
