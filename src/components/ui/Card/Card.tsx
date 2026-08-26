import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Card.module.css'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(styles.card, className)} {...props} />
}
