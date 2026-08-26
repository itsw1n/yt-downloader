import { Download, Music } from 'lucide-react'
import styles from './QualityGrid.module.css'

interface QualityGridProps {
  qualities: { height: number; ext: string; label: string }[]
  hasAudio: boolean
  url: string
}

export function QualityGrid({ qualities, hasAudio, url }: QualityGridProps) {
  function download(quality: number | 'audio' | 'best') {
    if (!url) return
    const params = new URLSearchParams({ url })
    if (quality === 'audio') params.set('audio', '1')
    else if (quality !== 'best') params.set('quality', String(quality))
    const target = `/api/download?${params.toString()}`

    const a = document.createElement('a')
    a.href = target
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()

    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.location.href = target
    }
  }

  if (qualities.length === 0) {
    return (
      <button onClick={() => download('best')} className={styles.best}>
        <Download className={styles.icon} /> Download Video
      </button>
    )
  }

  const [best, ...rest] = qualities
  return (
    <div className={styles.grid}>
      <button onClick={() => download(best.height)} className={styles.best}>
        <Download className={styles.icon} /> Best Quality ({best.height}p)
      </button>
      {rest.map((q) => (
        <button key={q.height} onClick={() => download(q.height)} className={styles.qBtn}>
          <Download className={styles.qIcon} />
          <span className={styles.qLabel}>{q.height}p</span>
          <span className={styles.qSub}>{q.ext}</span>
        </button>
      ))}
      {hasAudio && (
        <button onClick={() => download('audio')} className={styles.audioBtn}>
          <Music className={styles.icon} /> Download MP3 (Audio Only)
        </button>
      )}
    </div>
  )
}
