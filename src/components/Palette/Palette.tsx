import type { ExpressionToken } from '../../entities/expression'
import styles from './Palette.module.css'

interface PaletteProps {
  numbers: number[]
  operators: string[]
  expression: ExpressionToken[]
  onNumber: (n: number) => void
  onOperator: (op: string) => void
}

/**
 * Палитра кнопок: числа из `$hand` + операторы (из руки + открытых).
 * Клик по кнопке добавляет токен в позицию курсора.
 * Уже использованные токены затемняются и блокируются.
 */
export function Palette({
  numbers,
  operators,
  expression,
  onNumber,
  onOperator,
}: PaletteProps) {
  const uniqueNumbers = [...new Set(numbers)]

  const isNumberUsed = (n: number) =>
    expression.some((t) => t.type === 'number' && t.value === n)
  // Скобки не блокируются (их можно использовать несколько раз)
  const isOperatorUsed = (op: string) =>
    op !== '(' &&
    op !== ')' &&
    expression.some((t) => t.type === 'operator' && t.value === op)

  return (
    <div className={styles.palette}>
      <div className={styles.group}>
        {uniqueNumbers.map((n) => {
          const used = isNumberUsed(n)
          return (
            <button
              key={n}
              type="button"
              className={`${styles.number} ${used ? styles.used : ''}`}
              disabled={used}
              onClick={() => onNumber(n)}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className={styles.group}>
        {operators.map((op) => {
          const used = isOperatorUsed(op)
          return (
            <button
              key={op}
              type="button"
              className={`${styles.operator} ${used ? styles.used : ''}`}
              disabled={used}
              onClick={() => onOperator(op)}
            >
              {op}
            </button>
          )
        })}
      </div>
    </div>
  )
}
