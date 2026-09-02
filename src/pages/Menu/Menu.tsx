import { useState } from 'react'
import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { Card } from '../../shared/ui/Card/Card'
import { $currentLevel, $bestScore, startGame } from '../../features/game/model'
import { $bombHighScore } from '../../features/bomb/model'
import { $dailyAvailable } from '../../features/daily/model'
import styles from './Menu.module.css'

interface MenuProps {
  onPlay: () => void
  onBomb: () => void
  onDaily: () => void
  onAchievements: () => void
}

/**
 * Экран 1: Главное меню.
 */
export function Menu({ onPlay, onBomb, onDaily, onAchievements }: MenuProps) {
  const currentLevel = useUnit($currentLevel)
  const bestScore = useUnit($bestScore)
  const bombHighScore = useUnit($bombHighScore)
  const dailyAvailable = useUnit($dailyAvailable)
  const [showHelp, setShowHelp] = useState(false)

  const handlePlay = () => {
    // Продолжаем с уровня, на котором остановился игрок
    startGame(currentLevel)
    onPlay()
  }

  const handleBomb = () => {
    onBomb()
  }

  const handleDaily = () => {
    onDaily()
  }

  // «Часовая бомба» открывается после 20-го уровня — сначала нужно пройти обучение.
  const bombLocked = currentLevel < 20
  // «Ежедневное испытание» открывается после 30-го уровня.
  const dailyLocked = currentLevel < 30

  return (
    <div className={styles.menu}>
      <div className={styles.logo}>
        <h1 className={styles.title}>Calc</h1>
        <p className={styles.subtitle}>short for calculator</p>
      </div>

      <div className={styles.actions}>
        <Button size="lg" onClick={handlePlay}>
          Играть
        </Button>
        <Button
          size="lg"
          variant="danger"
          onClick={handleBomb}
          disabled={bombLocked}
          title={bombLocked ? 'Открывается на 20-м уровне' : undefined}
        >
          {bombLocked ? '🔒 ' : ''}Часовая бомба
        </Button>
        {bombLocked && (
          <p className={styles.lockHint}>
            🔒 Откроется на 20-м уровне!
          </p>
        )}
        <Button
          size="lg"
          variant="warning"
          onClick={handleDaily}
          disabled={dailyLocked || !dailyAvailable}
          title={
            dailyLocked
              ? 'Открывается на 30-м уровне'
              : !dailyAvailable
                ? 'Уже проходил сегодня'
                : undefined
          }
        >
          {dailyLocked || !dailyAvailable ? '🔒 ' : ''}Ежедневное испытание
        </Button>
        {dailyLocked && (
          <p className={styles.lockHint}>
            🔒 Откроется на 30-м уровне!
          </p>
        )}
        {!dailyLocked && !dailyAvailable && (
          <p className={styles.lockHint}>✅ Уже проходил сегодня — загляни завтра!</p>
        )}
        <Button variant="secondary" onClick={onAchievements}>
          Достижения 🏆
        </Button>
        <Button variant="secondary" onClick={() => setShowHelp(true)}>
          Как играть
        </Button>
      </div>

      <Card className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{currentLevel}</span>
          <span className={styles.statLabel}>Уровень</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{Math.round(bestScore)}</span>
          <span className={styles.statLabel}>Рекорд</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{bombHighScore}</span>
          <span className={styles.statLabel}>Бомба</span>
        </div>
      </Card>

      {showHelp && (
        <div className={styles.modal} onClick={() => setShowHelp(false)}>
          <Card className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Как играть</h2>
            <ul className={styles.rules}>
              <li>Тебе даны числа и операторы.</li>
              <li>Расставь их, чтобы получить <b>максимальное</b> число.</li>
              <li>Числа растут до абсурда: факториалы, степени степеней.</li>
              <li>Превзойди цель уровня, чтобы перейти дальше.</li>
              <li>Ввод: клавиатура, клик по кнопкам или перетаскивание.</li>
            </ul>
            <Button variant="secondary" onClick={() => setShowHelp(false)}>
              Понятно
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
