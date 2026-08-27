import { ClipboardPaste, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './UrlForm.module.css'

interface UrlFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function UrlForm({ value, onChange, onSubmit, isLoading }: UrlFormProps) {
  async function paste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) onChange(text.trim())
    } catch {
      // clipboard may be blocked; user can type manually
    }
  }

  return (
    <div>
      <div className={styles.wrap}>
        <Link2 className={styles.inputIcon} />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste YouTube or TikTok link here..."
          className={styles.inputWithIcon}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
        />
        <button
          type="button"
          onClick={paste}
          aria-label="Paste from clipboard"
          className={styles.pasteBtn}
        >
          <ClipboardPaste />
        </button>
      </div>
      <Button onClick={onSubmit} disabled={isLoading} fullWidth className={styles.submit}>
        {isLoading ? 'Loading...' : 'Get Video'}
      </Button>
    </div>
  )
}
