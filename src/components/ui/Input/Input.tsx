import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Input.module.css'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(styles.input, className)} {...props} />
}
