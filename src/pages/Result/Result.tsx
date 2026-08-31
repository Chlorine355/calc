import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { Card } from '../../shared/ui/Card/Card'
import {
  $currentLevel,
  $expression,
  $result,
  $score,
  nextLevel,
} from '../../features/game/model'
import { $lastResultString } from '../../features/ui/model'
import { tokensToString } from '../../features/evaluation/engine'
import { serializedLog10 } from '../../shared/lib/formatHugeNumber'
import { useState } from 'react'
import styles from './Result.module.css'

interface ResultProps {
  onContinue: () => void
}

/**
 * Экран 3: Экран результата.
 */
export function Result({ onContinue }: ResultProps) {
  const currentLevel = useUnit($currentLevel)
  const expression = useUnit($expression)
  const result = useUnit($result)
  const score = useUnit($score)
  const lastResultString = useUnit($lastResultString)
  const [copied, setCopied] = useState(false)

  const exprString = tokensToString(expression)
  const logScore = result ? Math.round(serializedLog10(result)) : 0

  const handleContinue = () => {
    nextLevel()
    onContinue()
  }

  const handleShare = async () => {
    const msg = `Я собрал ${lastResultString} (10^${logScore}) в Calc на уровне ${currentLevel}! Попробуй обойти меня →`
    try {
      await navigator.clipboard.writeText(msg)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard недоступен — игнорируем
    }
  }

  return (
    <div className={styles.result}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Уровень {currentLevel} пройден!</h1>
        <p className={styles.subtitle}>Твоё выражение</p>
        <div className={styles.expr}>{exprString || '—'}</div>
        <div className={styles.bigNumber}>{lastResultString}</div>
        <p className={styles.scoreText}>Очки: {Math.round(score)} (10^{logScore})</p>

        <div className={styles.actions}>
          <Button size="lg" onClick={handleContinue}>
            Следующий уровень
          </Button>
          <Button variant="secondary" onClick={handleShare}>
            {copied ? '✓ Скопировано' : 'Поделиться'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
