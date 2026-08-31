import type { HTMLAttributes, MouseEvent as ReactMouseEvent } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  onClick?: (e: ReactMouseEvent<HTMLDivElement>) => void
}

export function Card({ children, className, onClick, ...rest }: CardProps) {
  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  )
}
