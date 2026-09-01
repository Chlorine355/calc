import type { ExpressionToken } from '../../entities/expression'
import styles from './ExpressionField.module.css'

interface ExpressionFieldProps {
  tokens: ExpressionToken[]
  cursor: number
  onSelectSlot: (index: number) => void
  /** Удалить токен по id (клик по токену — аналог Backspace на мобильных). */
  onRemoveToken?: (id: string) => void
  /** Живой предпросмотр результата (полупрозрачный «= число» после токенов). */
  preview?: string | null
}

/**
 * Поле выражения: массив карточек-токенов + мигающий курсор.
 * Курсор рисуется в зазоре (слоте) между токенами; клик по слоту
 * перемещает курсор в эту позицию. Клик по самому токену удаляет его
 * (удобно на мобильных, где нет клавиатуры).
 */
export function ExpressionField({
  tokens,
  cursor,
  onSelectSlot,
  onRemoveToken,
  preview,
}: ExpressionFieldProps) {
  if (tokens.length === 0) {
    return (
      <div className={styles.field + ' ' + styles['field--empty']}>
        <span className={styles.placeholder}>Собери выражение…</span>
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
          <button
            type="button"
            className={styles[`token--${token.type}`]}
            aria-label={`Удалить ${String(token.value)}`}
            onClick={() => onRemoveToken?.(token.id)}
          >
            {token.value}
          </button>
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

      {/* Живой предпросмотр результата */}
      {preview && (
        <span className={styles.preview}>
          <span className={styles.previewEquals}>=</span>
          <span className={styles.previewValue}>{preview}</span>
        </span>
      )}
    </div>
  )
}

function Cursor() {
  return <span className={styles.cursor} />
}
