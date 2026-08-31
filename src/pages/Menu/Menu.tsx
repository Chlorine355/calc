import { useState } from 'react'
import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { Card } from '../../shared/ui/Card/Card'
import { $currentLevel, $bestScore, startGame } from '../../features/game/model'
import styles from './Menu.module.css'

interface MenuProps {
  onPlay: () => void
}

/**
 * Экран 1: Главное меню.
 */
export function Menu({ onPlay }: MenuProps) {
  const currentLevel = useUnit($currentLevel)
  const bestScore = useUnit($bestScore)
  const [showHelp, setShowHelp] = useState(false)

  const handlePlay = () => {
    // Продолжаем с уровня, на котором остановился игрок
    startGame(currentLevel)
    onPlay()
  }

  return (
    <div className={styles.menu}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🧮</span>
        <h1 className={styles.title}>Calc</h1>
        <p className={styles.subtitle}>short for calculator</p>
        <p className={styles.subtitle}>Собери максимальное выражение</p>
      </div>

      <div className={styles.actions}>
        <Button size="lg" onClick={handlePlay}>
          Играть
        </Button>
        <Button size="lg" variant="danger" onClick={handlePlay}>
          Часовая бомба
        </Button>
        <Button size="lg" variant="warning" onClick={handlePlay}>
          Ежедневное испытание
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
