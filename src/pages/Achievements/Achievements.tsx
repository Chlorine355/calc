import { useUnit } from 'effector-react'
import { Button } from '../../shared/ui/Button/Button'
import { Card } from '../../shared/ui/Card/Card'
import { $achievements } from '../../features/achievements/model'
import { ACHIEVEMENT_DEFS } from '../../features/achievements/definitions'
import styles from './Achievements.module.css'

interface AchievementsProps {
  onBack: () => void
}

/**
 * Экран достижений: список полученных и ещё не полученных.
 */
export function Achievements({ onBack }: AchievementsProps) {
  const achievements = useUnit($achievements)

  const earned = ACHIEVEMENT_DEFS.filter((a) => achievements[a.id]).length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Меню
        </Button>
        <h1 className={styles.title}>Достижения</h1>
        <span className={styles.counter}>
          {earned} / {ACHIEVEMENT_DEFS.length}
        </span>
      </header>

      <div className={styles.list}>
        {ACHIEVEMENT_DEFS.map((a) => {
          const unlocked = achievements[a.id]
          return (
            <Card
              key={a.id}
              className={`${styles.item} ${unlocked ? styles.itemUnlocked : styles.itemLocked}`}
            >
              <div className={styles.icon}>{unlocked ? a.icon : '🔒'}</div>
              <div className={styles.body}>
                <div className={styles.itemTitle}>{a.title}</div>
                <div className={styles.itemDesc}>{a.description}</div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
