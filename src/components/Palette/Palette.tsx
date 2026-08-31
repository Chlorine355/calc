import type { ExpressionToken } from '../../entities/expression'
import styles from './Palette.module.css'

interface PaletteProps {
  numbers: number[]
  /** Список бинарных операторов (например ['+','*']) — без '√' и '!' */
  binaryOperators: string[]
  /** Список унарных операторов (['√'], ['!'], ['√','!']) */
  unaryOperators: string[]
  /** Сколько пар скобок доступно на уровне (0 — скобки закрыты). */
  parenPairs?: number
  expression: ExpressionToken[]
  onNumber: (n: number) => void
  onOperator: (op: string, unary?: boolean) => void
}

/**
 * Палитра кнопок: числа + бинарные операторы + унарные (√, !) + скобки.
 * Клик добавляет токен в позицию курсора.
 * Использованные числа и использованные операторы блокируются (каждый символ — 1 раз).
 * Скобки не имеют лимита (их число не ограничено по правилам), показываются,
 * только если уровень открыл '()'.
 */
export function Palette({
  numbers,
  binaryOperators,
  unaryOperators,
  parenPairs = 0,
  expression,
  onNumber,
  onOperator,
}: PaletteProps) {
  const uniqueNumbers = [...new Set(numbers)]

  /** Сколько экземпляров каждого числа осталось неиспользованными. */
  const numberRemaining = new Map<number, number>()
  for (const n of numbers) numberRemaining.set(n, (numberRemaining.get(n) ?? 0) + 1)
  for (const t of expression) {
    if (t.type === 'number') {
      numberRemaining.set(t.value, (numberRemaining.get(t.value) ?? 0) - 1)
    }
  }

  const isBinaryUsed = (op: string) =>
    expression.some((t) => t.type === 'operator' && t.value === op && !t.unary)

  /** Сколько применений каждого унарного оператора осталось (обычно 1). */
  const unaryRemaining = new Map<string, number>()
  for (const op of unaryOperators) unaryRemaining.set(op, (unaryRemaining.get(op) ?? 0) + 1)
  for (const t of expression) {
    if (t.type === 'operator' && t.unary) {
      unaryRemaining.set(t.value, (unaryRemaining.get(t.value) ?? 0) - 1)
    }
  }

  return (
    <div className={styles.palette}>
      <div className={styles.group}>
        {uniqueNumbers.map((n) => {
          const remaining = numberRemaining.get(n) ?? 0
          const usedUp = remaining <= 0
          return (
            <button
              key={n}
              type="button"
              className={`${styles.number} ${usedUp ? styles.used : ''}`}
              disabled={usedUp}
              onClick={() => onNumber(n)}
            >
              {n}
              {remaining > 1 && <span className={styles.count}>×{remaining}</span>}
            </button>
          )
        })}
      </div>

      {binaryOperators.length > 0 && (
        <div className={styles.group}>
          {binaryOperators.map((op) => {
            const used = isBinaryUsed(op)
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
      )}

      {unaryOperators.length > 0 && (
        <div className={styles.group}>
          {unaryOperators.map((op) => {
            const remaining = unaryRemaining.get(op) ?? 0
            const usedUp = remaining <= 0
            return (
              <button
                key={op}
                type="button"
                className={`${styles.operator} ${usedUp ? styles.used : ''}`}
                disabled={usedUp}
                onClick={() => onOperator(op, true)}
              >
                {op}
                {remaining > 1 && <span className={styles.count}>×{remaining}</span>}
              </button>
            )
          })}
        </div>
      )}

      {parenPairs > 0 && (
        <div className={styles.group}>
          {['(', ')'].map((p) => {
            const used = expression.filter(
              (t) => t.type === 'parenthesis' && t.value === p
            ).length
            const remaining = parenPairs - used
            const usedUp = remaining <= 0
            return (
              <button
                key={p}
                type="button"
                className={`${styles.operator} ${styles.paren} ${usedUp ? styles.used : ''}`}
                disabled={usedUp}
                onClick={() => onOperator(p)}
              >
                {p}
                {/* Бейдж — только когда осталось больше одной пары */}
                {remaining > 1 && <span className={styles.count}>×{remaining}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
