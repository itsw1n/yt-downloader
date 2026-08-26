import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './StatusMessage.module.css'

export type Status = 'idle' | 'loading' | 'error' | 'success'

interface StatusMessageProps {
  status: Status
  children?: ReactNode
}

export function StatusMessage({ status, children }: StatusMessageProps) {
  if (status === 'idle') return null
  return (
    <div className={clsx(styles.wrapper, styles[status])}>
      {status === 'loading' && <Loader2 className={clsx(styles.icon, styles.spin)} />}
      {status === 'error' && <AlertCircle className={styles.icon} />}
      {status === 'success' && <CheckCircle2 className={styles.icon} />}
      <span>{children}</span>
    </div>
  )
}
