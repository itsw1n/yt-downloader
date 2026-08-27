import { Laptop, Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import styles from './HowToSteps.module.css'

const iphoneSteps = [
  'Paste link from YouTube or TikTok → Tap Get Video',
  'Pick quality (1080p recommended for CapCut)',
  'Video opens → Tap Share icon ↗ → Save Video',
  'Open CapCut → New Project → Video is in your Gallery!',
]
const laptopSteps = [
  'Same steps — file saves to your Downloads folder as MP4',
  'Drag into CapCut Desktop or Premiere directly',
]

function StepList({ steps }: { steps: string[] }) {
  return (
    <div className={styles.steps}>
      {steps.map((step, i) => (
        <div key={i} className={styles.step}>
          <div className={styles.stepNum}>{i + 1}</div>
          <p className={styles.stepText}>{step}</p>
        </div>
      ))}
    </div>
  )
}

export function HowToSteps() {
  return (
    <div className={styles.section}>
      <Card>
        <div className={styles.head}>
          <Smartphone className={styles.icon} />
          <h3 className={styles.headTitle}>How to save (iPhone)</h3>
        </div>
        <StepList steps={iphoneSteps} />
      </Card>
      <div className={styles.section}>
        <Card>
          <div className={styles.head}>
            <Laptop className={styles.icon} />
            <h3 className={styles.headTitle}>How to save (Laptop)</h3>
          </div>
          <StepList steps={laptopSteps} />
        </Card>
      </div>
    </div>
  )
}
