import { useEffect } from 'react'
import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { ExpressionField } from '../../components/ExpressionField/ExpressionField'
import { Palette } from '../../components/Palette/Palette'
import { useKeyboardInput } from '../../features/input/useKeyboardInput'
import {
  $hand,
  $expression,
  $cursorPosition,
  $previewResult,
  $validationError,
  $targetScore,
  $isEvaluating,
  insertToken,
  removeToken,
  setCursorPosition,
  evaluateExpressionEvent,
  resetRound,
  numberToken,
  operatorToken,
  parenthesisToken,
} from '../../features/game/model'
import {
  $dailyBestScore,
  $dailyFinished,
  $dailyAvailable,
  startDaily,
  stopDaily,
} from '../../features/daily/model'
import { formatLog10Target } from '../../shared/lib/formatHugeNumber'
import styles from './Daily.module.css'

interface DailyProps {
  onExit: () => void
}

/**
 * «Ежедневное испытание»: большой пример (10 чисел, 9 операторов, без факториала),
 * доступный раз в день. Нужно превзойти цель. После прохождения — экран результата.
 */
export function Daily({ onExit }: DailyProps) {
  const hand = useUnit($hand)
  const expression = useUnit($expression)
  const cursor = useUnit($cursorPosition)
  const previewResult = useUnit($previewResult)
  const validationError = useUnit($validationError)
  const targetScore = useUnit($targetScore)
  const isEvaluating = useUnit($isEvaluating)
  const bestScore = useUnit($dailyBestScore)
  const finished = useUnit($dailyFinished)
  const available = useUnit($dailyAvailable)

  useKeyboardInput(true)

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
  const handleReset = () => resetRound()

  // Запускаем испытание при входе на экран (если ещё доступно).
  useEffect(() => {
    if (available) startDaily()
    return () => stopDaily()
  }, [available])

  const handleExit = () => {
    stopDaily()
    onExit()
  }

  if (finished) {
    return (
      <div className={styles.daily}>
        <header className={styles.header}>
          <Button variant="ghost" size="sm" onClick={handleExit}>
            ← Меню
          </Button>
          <div className={styles.stats}>
            <span className={styles.score}>Рекорд: {formatLog10Target(bestScore)}</span>
          </div>
        </header>

        <div className={styles.result}>
          <h2 className={styles.resultTitle}>🎉 Испытание пройдено!</h2>
          <p className={styles.resultText}>
            Ты превзошёл цель. Возвращайся завтра за новым испытанием.
          </p>
          <div className={styles.resultActions}>
            <Button size="lg" variant="secondary" onClick={handleExit}>
              В меню
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!available) {
    return (
      <div className={styles.daily}>
        <header className={styles.header}>
          <Button variant="ghost" size="sm" onClick={handleExit}>
            ← Меню
          </Button>
        </header>
        <div className={styles.result}>
          <h2 className={styles.resultTitle}>⏳ Уже проходил сегодня</h2>
          <p className={styles.resultText}>
            Ежедневное испытание доступно раз в день. Загляни завтра!
          </p>
          <div className={styles.resultActions}>
            <Button size="lg" variant="secondary" onClick={handleExit}>
              В меню
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.daily}>
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={handleExit}>
          ← Меню
        </Button>
        <div className={styles.stats}>
          <span className={styles.score}>Рекорд: {formatLog10Target(bestScore)}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Сбросить
        </Button>
      </header>

      <div className={styles.target}>
        Цель: превзойти <b>{formatLog10Target(targetScore)}</b>
      </div>

      <ExpressionField
        tokens={expression}
        cursor={cursor}
        onSelectSlot={setCursorPosition}
        onRemoveToken={removeToken}
        preview={previewResult}
      />

      {validationError && <div className={styles.error}>{validationError}</div>}

      <Palette
        numbers={hand.numbers}
        binaryOperators={binaryOperators}
        unaryOperators={unaryOperators}
        parenPairs={hand.operators.includes('()') ? 2 : 0}
        expression={expression}
        onNumber={handleNumber}
        onOperator={handleOperator}
      />

      <div className={styles.actions}>
        <Button size="lg" onClick={handleEvaluate} disabled={isEvaluating}>
          {isEvaluating ? 'Считаем…' : 'Вычислить'}
        </Button>
      </div>
    </div>
  )
}
