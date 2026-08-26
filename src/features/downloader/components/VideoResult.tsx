import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import { QualityGrid } from '@/features/downloader/components/QualityGrid'
import type { VideoInfo } from '@/features/downloader/types'
import styles from './VideoResult.module.css'

interface VideoResultProps {
  info: VideoInfo
  url: string
}

export function VideoResult({ info, url }: VideoResultProps) {
  const views = info.view_count ? ` • ${info.view_count.toLocaleString()} views` : ''
  return (
    <Card className={styles.card}>
      <div className={styles.thumbWrap}>
        <img src={info.thumbnail} alt={info.title} className={styles.thumb} />
        {info.duration_string && (
          <span className={styles.duration}>
            <Clock className={styles.icon} /> {info.duration_string}
          </span>
        )}
      </div>
      <h2 className={styles.title}>{info.title}</h2>
      {info.uploader && <p className={styles.meta}>{info.uploader}{views}</p>}
      <QualityGrid qualities={info.qualities} hasAudio={info.hasAudio} url={url} />
    </Card>
  )
}
