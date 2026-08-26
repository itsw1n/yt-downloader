import { Scissors } from 'lucide-react'
import styles from './CapcutTip.module.css'

export function CapcutTip() {
  return (
    <div className={styles.tip}>
      <Scissors className={styles.icon} />
      <p className={styles.text}>
        <strong>CapCut tip:</strong> 1080p MP4 is best for editing. If original is 4K, picking 1080p gives a
        smaller file &amp; faster import.
      </p>
    </div>
  )
}
