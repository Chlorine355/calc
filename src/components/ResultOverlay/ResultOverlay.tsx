import { AnimatePresence, motion } from 'framer-motion'
import styles from './ResultOverlay.module.css'

interface ResultOverlayProps {
  show: boolean
  resultString: string
  onClose: () => void
}

/**
 * Оверлей результата: число «раздувается» из центра экрана с частицами.
 */
export function ResultOverlay({ show, resultString, onClose }: ResultOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Частицы */}
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              className={styles.particle}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 500,
                y: (Math.random() - 0.5) * 500,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          ))}

          <motion.div
            className={styles.result}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12 }}
          >
            <div className={styles.label}>Результат</div>
            <div className={styles.value}>{resultString}</div>
            <div className={styles.hint}>Нажмите, чтобы продолжить</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
