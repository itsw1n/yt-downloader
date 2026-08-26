import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import styles from './Spinner.module.css'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx(styles.spinner, className)} />
}
