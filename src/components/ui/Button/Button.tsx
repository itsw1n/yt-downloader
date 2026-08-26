import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Button.module.css'

type Variant = 'primary' | 'ghost' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

export function Button({ variant = 'primary', fullWidth = false, className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
      {...props}
    />
  )
}
