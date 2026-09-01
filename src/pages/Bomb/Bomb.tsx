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
  setCursorPosition,
  evaluateExpressionEvent,
  resetRound,
  numberToken,
  operatorToken,
  parenthesisToken,
} from '../../features/game/model'
import {
  $bombTimeLeft,
  $bombScore,
  $bombHighScore,
  $bombRunning,
  $bombFinished,
  startBomb,
  stopBomb,
  bombTick,
} from '../../features/bomb/model'
import { formatLog10Target } from '../../shared/lib/formatHugeNumber'
import styles from './Bomb.module.css'

interface BombProps {
  onExit: () => void
}

/**
 * Режим «Часовая бомба»: за минуту собрать как можно больше выражений,
 * каждое из которых превосходит свою цель. За каждый решённый пример — +1 очко.
 */
export function Bomb({ onExit }: BombProps) {
  const hand = useUnit($hand)
  const expression = useUnit($expression)
  const cursor = useUnit($cursorPosition)
  const previewResult = useUnit($previewResult)
  const validationError = useUnit($validationError)
  const targetScore = useUnit($targetScore)
  const isEvaluating = useUnit($isEvaluating)
  const timeLeft = useUnit($bombTimeLeft)
  const score = useUnit($bombScore)
  const highScore = useUnit($bombHighScore)
  const running = useUnit($bombRunning)
  const finished = useUnit($bombFinished)

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
  const handleRestart = () => startBomb()

  // Запускаем раунд при входе на экран.
  useEffect(() => {
    startBomb()
    return () => stopBomb()
  }, [])

  // Тикаем таймером, пока раунд идёт.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => bombTick(), 1000)
    return () => clearInterval(id)
  }, [running])

  const handleExit = () => {
    stopBomb()
    onExit()
  }

  if (finished) {
    return (
      <div className={styles.bomb}>
        <header className={styles.header}>
          <Button variant="ghost" size="sm" onClick={handleExit}>
            ← Меню
          </Button>
          <div className={styles.stats}>
            <span className={styles.time}>⏱ 0с</span>
            <span className={styles.score}>Решено: {score}</span>
            <span className={styles.highScore}>Рекорд: {highScore}</span>
          </div>
        </header>

        <div className={styles.result}>
          <h2 className={styles.resultTitle}>⏰ Время вышло!</h2>
          <p className={styles.resultScore}>
            Ты решил <b>{score}</b> {plural(score)}
          </p>
          <p className={styles.resultRecord}>
            {score >= highScore && score > 0
              ? '🎉 Новый рекорд!'
              : `Рекорд: ${highScore}`}
          </p>
          <div className={styles.resultActions}>
            <Button size="lg" variant="danger" onClick={handleRestart}>
              🔄 Заново
            </Button>
            <Button size="lg" variant="secondary" onClick={handleExit}>
              В меню
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.bomb}>
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={handleExit}>
          ← Меню
        </Button>
        <div className={styles.stats}>
          <span className={styles.time}>⏱ {timeLeft}с</span>
          <span className={styles.score}>Решено: {score}</span>
          <span className={styles.highScore}>Рекорд: {highScore}</span>
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

/** Склонение слова «пример»: 1 пример, 2 примера, 5 примеров. */
function plural(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'пример'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'примера'
  return 'примеров'
}
