import type { ExpressionToken } from '../../entities/expression'
import styles from './ExpressionField.module.css'

interface ExpressionFieldProps {
  tokens: ExpressionToken[]
  cursor: number
  onSelectSlot: (index: number) => void
}

/**
 * Поле выражения: массив карточек-токенов + мигающий курсор.
 * Курсор рисуется в зазоре (слоте) между токенами; клик по слоту
 * перемещает курсор в эту позицию.
 */
export function ExpressionField({ tokens, cursor, onSelectSlot }: ExpressionFieldProps) {
  if (tokens.length === 0) {
    return (
      <div className={styles.field + ' ' + styles['field--empty']}>
        <span className={styles.placeholder}>Собери наибольшее выражение…</span>
      </div>
    )
  }

  return (
    <div className={styles.field}>
      {tokens.map((token, index) => (
        <span key={token.id} className={styles.slot}>
          <button
            type="button"
            className={styles.slotGap}
            aria-label={`Вставить перед ${String(token.value)}`}
            onClick={() => onSelectSlot(index)}
          >
            {index === cursor ? <Cursor /> : null}
          </button>
          <span className={styles[`token--${token.type}`]}>{token.value}</span>
        </span>
      ))}
      {/* Курсор в конце */}
      <span className={styles.slot}>
        <button
          type="button"
          className={styles.slotGap}
          aria-label="Вставить в конец"
          onClick={() => onSelectSlot(tokens.length)}
        >
          {tokens.length === cursor ? <Cursor /> : null}
        </button>
      </span>
    </div>
  )
}

function Cursor() {
  return <span className={styles.cursor} />
}
