# YT Save UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the YT Save downloader UI as a React + Vite + TypeScript SPA using the team's standard stack, with a polished dark theme and lucide-react icons — same features, no new behavior.

**Architecture:** Single repo, Vite at root building to `dist/`. The existing Express `server.js` keeps all `/api/*` routes and switches its static root from `public` to `dist`. `npm start` runs `build` then `node server.js` so self-host stays `npm install && npm start`. One screen, no router; data flows through TanStack Query hooks → axios → the existing API.

**Tech Stack:** React 18, Vite 5, TypeScript (strict), Tailwind CSS v3, lucide-react, @tanstack/react-query, axios, zod, clsx + tailwind-merge.

## Global Constraints

- TypeScript `strict: true`, no `any`. (from spec §9)
- Never use `console.log` directly — use `src/lib/logger.ts`. (from spec §9, coding-rules)
- Always use absolute imports with `@/` prefix; never relative `../../`. (from spec §9, folder-structure)
- Named exports for components; page/app default-export only where conventional. One component per file. (from spec §9)
- Tailwind v3, `darkMode: 'class'`, semantic tokens (`background`, `foreground`, `card`, `muted`, `primary`, etc.). Dark is default. (from spec §7)
- Single repo, Vite at root; `npm start` = `npm run build && node server.js`. (from spec §2, §6)
- lucide-react supplies all icons (no unicode glyphs). (from spec §1)
- Visualization scope = visual refresh only. No new features (no history/progress/playlists). (from spec §1)
- Spec opted out of automated tests; the test gate for every task is `npm run build` (tsc typecheck + vite build) passing, plus the manual smoke in Task 9. (from spec §10)

---

## File Structure

New files (all under repo root unless noted):

```
package.json                     (modify) add frontend deps + scripts
vite.config.ts                  (create) react plugin + '@' alias
tsconfig.json                   (create) strict, bundler resolution
tailwind.config.ts              (create) tokens, darkMode class
postcss.config.js               (create) tailwind + autoprefixer
index.html                      (create) Vite entry, replaces public/index.html
.gitignore                      (modify) add /dist
src/main.tsx                    (create) React root
src/index.css                   (create) tailwind layers + HSL tokens
src/app/App.tsx                 (create) screen composition
src/app/providers.tsx           (create) QueryClientProvider
src/lib/utils.ts                (create) cn()
src/lib/logger.ts               (create) dev-only logger
src/lib/axios.ts                (create) axios instance
src/lib/queryClient.ts          (create) QueryClient defaults
src/components/ui/Button/Button.tsx          (create)
src/components/ui/Input/Input.tsx            (create)
src/components/ui/Card/Card.tsx              (create)
src/components/ui/Spinner/Spinner.tsx        (create)
src/components/ui/StatusMessage/StatusMessage.tsx  (create)
src/features/downloader/types/index.ts               (create)
src/features/downloader/schemas/videoInfo.schema.ts  (create)
src/features/downloader/api/downloaderApi.ts         (create)
src/features/downloader/hooks/useVideoInfo.ts        (create)
src/features/downloader/components/UrlForm.tsx       (create)
src/features/downloader/components/VideoResult.tsx   (create)
src/features/downloader/components/QualityGrid.tsx   (create)
src/features/downloader/components/HowToSteps.tsx    (create)
src/features/downloader/components/CapcutTip.tsx     (create)
server.js                       (modify) static root public -> dist + SPA fallback
public/index.html               (delete) superseded by dist
```

---

### Task 1: Build tooling & config

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`
- Modify: `.gitignore`

**Interfaces:** None (scaffolding).

- [ ] **Step 1: Update `package.json`** (merge deps + scripts; keep `type: "module"` and backend deps)

```json
{
  "name": "yt-downloader",
  "version": "1.0.0",
  "description": "Self-hosted YouTube downloader — laptop + iPhone, CapCut ready",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "start": "npm run build && node server.js",
    "tunnel": "node tunnel.js",
    "tunnel:lt": "npx localtunnel --port 8787",
    "tunnel:cf": "cloudflared tunnel --url http://localhost:8787"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "axios": "^1.7.7",
    "@tanstack/react-query": "^5.59.0",
    "lucide-react": "^0.451.0",
    "zod": "^3.23.8",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "tailwindcss": "^3.4.13",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`** (use `fileURLToPath` — ESM has no `__dirname`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 3: Create `tsconfig.json`** (strict, no emit — `tsc` is typecheck-only)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        border: 'hsl(var(--border))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
      },
      borderRadius: { lg: '1rem', md: '0.75rem', sm: '0.5rem' },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 5: Create `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create `index.html`** (Vite root entry; `class="dark"` makes dark default)

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>YT Save — Save to Gallery & CapCut Ready</title>
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="YT Save" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Add `/dist` to `.gitignore`**

Append to the existing `.gitignore`:

```gitignore
dist/
```

- [ ] **Step 8: Verify config parses** — run `npx tsc --noEmit` after deps exist (will fail on missing src files; that's expected here). Skip until Task 2+ provide `src`. Commit now.

```bash
git add package.json vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js index.html .gitignore
git commit -m "chore(config):add vite + react + tailwind toolchain"
```

---

### Task 2: App entry & global styles

**Files:**
- Create: `src/main.tsx`, `src/index.css`

**Interfaces:** Consumes `App` (Task 7) and `AppProviders` (Task 7). Produces nothing yet.

- [ ] **Step 1: Create `src/index.css`** (tokens at `:root`; dark duplicates so `.dark` works)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root,
  .dark {
    --background: 240 10% 4%;
    --foreground: 0 0% 98%;
    --card: 240 9% 11%;
    --card-foreground: 0 0% 98%;
    --muted: 240 6% 18%;
    --muted-foreground: 240 5% 60%;
    --primary: 356 100% 50%;
    --primary-foreground: 0 0% 100%;
    --border: 240 6% 18%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 98%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 98%;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
}
```

- [ ] **Step 2: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)
```

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx src/index.css
git commit -m "feat(frontend):add app entry and global dark theme tokens"
```

---

### Task 3: lib utilities

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/logger.ts`, `src/lib/axios.ts`, `src/lib/queryClient.ts`

**Interfaces:** Produces `cn`, `logger`, `api` (axios), `queryClient` — consumed by Tasks 4–7.

- [ ] **Step 1: Create `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Create `src/lib/logger.ts`**

```typescript
const isDev = import.meta.env.DEV

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args)
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },
}
```

- [ ] **Step 3: Create `src/lib/axios.ts`**

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

export default api
```

- [ ] **Step 4: Create `src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat(lib):add cn util, logger, axios instance, query client"
```

---

### Task 4: UI primitives

**Files:**
- Create: `src/components/ui/Button/Button.tsx`, `src/components/ui/Input/Input.tsx`, `src/components/ui/Card/Card.tsx`, `src/components/ui/Spinner/Spinner.tsx`, `src/components/ui/StatusMessage/StatusMessage.tsx`

**Interfaces:** Produces `Button`, `Input`, `Card`, `Spinner`, `StatusMessage` (with `Status` type) — consumed by Tasks 6–7.

- [ ] **Step 1: Create `Button`**

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  outline: 'border border-border text-foreground hover:bg-muted',
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Create `Input`**

```tsx
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground focus:border-primary',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Create `Card`**

```tsx
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-card p-4', className)} {...props} />
}
```

- [ ] **Step 4: Create `Spinner`**

```tsx
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
}
```

- [ ] **Step 5: Create `StatusMessage`** (exports `Status` type for App)

```tsx
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Status = 'idle' | 'loading' | 'error' | 'success'

interface StatusMessageProps {
  status: Status
  children?: ReactNode
}

const styles: Record<Status, string> = {
  idle: 'hidden',
  loading: 'bg-muted text-foreground border-border',
  error: 'bg-destructive/10 text-destructive border-destructive/40',
  success: 'bg-success/10 text-success border-success/40',
}

export function StatusMessage({ status, children }: StatusMessageProps) {
  if (status === 'idle') return null
  return (
    <div className={cn('mt-3 flex items-center gap-2 rounded-md border p-3 text-sm', styles[status])}>
      {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
      {status === 'error' && <AlertCircle className="h-4 w-4" />}
      {status === 'success' && <CheckCircle2 className="h-4 w-4" />}
      <span>{children}</span>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui
git commit -m "feat(frontend):add ui primitives (Button, Input, Card, Spinner, StatusMessage)"
```

---

### Task 5: Downloader feature — types, schema, api, hook

**Files:**
- Create: `src/features/downloader/types/index.ts`, `src/features/downloader/schemas/videoInfo.schema.ts`, `src/features/downloader/api/downloaderApi.ts`, `src/features/downloader/hooks/useVideoInfo.ts`

**Interfaces:** Produces `VideoInfo`/`Quality` types, `useVideoInfo(url)` hook, `downloaderApi.getVideoInfo`. Consumed by Tasks 6–7.

- [ ] **Step 1: Create `types/index.ts`**

```typescript
export interface Quality {
  height: number
  ext: string
  label: string
}

export interface VideoInfo {
  title: string
  thumbnail: string
  duration_string?: string
  uploader?: string
  view_count?: number
  qualities: Quality[]
  hasAudio: boolean
  id: string
}
```

- [ ] **Step 2: Create `schemas/videoInfo.schema.ts`**

```typescript
import { z } from 'zod'

export const qualitySchema = z.object({
  height: z.number(),
  ext: z.string(),
  label: z.string(),
})

export const videoInfoSchema = z.object({
  title: z.string(),
  thumbnail: z.string(),
  duration_string: z.string().optional(),
  uploader: z.string().optional(),
  view_count: z.number().optional(),
  qualities: z.array(qualitySchema),
  hasAudio: z.boolean(),
  id: z.string(),
})

export type VideoInfoDTO = z.infer<typeof videoInfoSchema>
```

- [ ] **Step 3: Create `api/downloaderApi.ts`**

```typescript
import api from '@/lib/axios'
import { logger } from '@/lib/logger'
import { videoInfoSchema, type VideoInfoDTO } from '@/features/downloader/schemas/videoInfo.schema'

export const downloaderApi = {
  getVideoInfo: async (url: string): Promise<VideoInfoDTO> => {
    const { data } = await api.get<unknown>('/api/info', { params: { url } })
    try {
      return videoInfoSchema.parse(data)
    } catch (error) {
      logger.error('videoInfo validation failed:', error)
      throw error
    }
  },
}
```

- [ ] **Step 4: Create `hooks/useVideoInfo.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { downloaderApi } from '@/features/downloader/api/downloaderApi'

export function useVideoInfo(url: string | null) {
  return useQuery({
    queryKey: ['videoInfo', url],
    queryFn: () => downloaderApi.getVideoInfo(url as string),
    enabled: Boolean(url),
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/downloader/types src/features/downloader/schemas src/features/downloader/api src/features/downloader/hooks
git commit -m "feat(downloader):add types, zod schema, api client, and useVideoInfo hook"
```

---

### Task 6: Downloader components

**Files:**
- Create: `src/features/downloader/components/UrlForm.tsx`, `VideoResult.tsx`, `QualityGrid.tsx`, `HowToSteps.tsx`, `CapcutTip.tsx`

**Interfaces:** Consumes `useVideoInfo` (Task 5), `Button`/`Input`/`Card`/`StatusMessage` (Task 4), `VideoInfo` type (Task 5). Produces presentational components consumed by `App` (Task 7).

- [ ] **Step 1: Create `UrlForm.tsx`** (controlled; calls `onSubmit`, `onChange`)

```tsx
import { ClipboardPaste, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'

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
      <div className="relative">
        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste YouTube link here..."
          className="pl-9 pr-12"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
        />
        <button
          type="button"
          onClick={paste}
          aria-label="Paste from clipboard"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ClipboardPaste className="h-4 w-4" />
        </button>
      </div>
      <Button onClick={onSubmit} disabled={isLoading} className="mt-3 w-full">
        {isLoading ? 'Loading...' : 'Get Video'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create `QualityGrid.tsx`** (triggers `/api/download` via anchor; iPhone uses `window.location`)

```tsx
import { Download, Music } from 'lucide-react'

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
      <button
        onClick={() => download('best')}
        className="mt-3 w-full rounded-md bg-gradient-to-r from-primary to-orange-500 p-3 text-center font-semibold text-primary-foreground"
      >
        <Download className="mr-2 inline h-4 w-4" /> Download Video
      </button>
    )
  }

  const [best, ...rest] = qualities
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button
        onClick={() => download(best.height)}
        className="col-span-2 rounded-md bg-gradient-to-r from-primary to-orange-500 p-3 text-center font-semibold text-primary-foreground"
      >
        <Download className="mr-2 inline h-4 w-4" /> Best Quality ({best.height}p)
      </button>
      {rest.map((q) => (
        <button
          key={q.height}
          onClick={() => download(q.height)}
          className="rounded-md border border-border bg-muted p-3 text-center transition-colors hover:border-primary"
        >
          <Download className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">{q.height}p</div>
          <div className="text-[11px] uppercase text-muted-foreground">{q.ext}</div>
        </button>
      ))}
      {hasAudio && (
        <button
          onClick={() => download('audio')}
          className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Music className="h-4 w-4" /> Download MP3 (Audio Only)
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `VideoResult.tsx`**

```tsx
import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import { QualityGrid } from '@/features/downloader/components/QualityGrid'
import type { VideoInfo } from '@/features/downloader/types'

interface VideoResultProps {
  info: VideoInfo
  url: string
}

export function VideoResult({ info, url }: VideoResultProps) {
  const views = info.view_count ? ` • ${info.view_count.toLocaleString()} views` : ''
  return (
    <Card className="mt-4">
      <div className="relative aspect-video overflow-hidden rounded-md bg-black">
        <img src={info.thumbnail} alt={info.title} className="h-full w-full object-cover" />
        {info.duration_string && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
            <Clock className="h-3 w-3" /> {info.duration_string}
          </span>
        )}
      </div>
      <h2 className="mt-3 line-clamp-2 text-base font-bold leading-snug">{info.title}</h2>
      {info.uploader && (
        <p className="mt-1 text-xs text-muted-foreground">
          {info.uploader}
          {views}
        </p>
      )}
      <QualityGrid qualities={info.qualities} hasAudio={info.hasAudio} url={url} />
    </Card>
  )
}
```

- [ ] **Step 4: Create `HowToSteps.tsx`**

```tsx
import { Laptop, Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'

const iphoneSteps = [
  'Paste link from YouTube → Tap Get Video',
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
    <div className="divide-y divide-border">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 p-3">
          <div className="flex h-7 w-7 min-w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
            {i + 1}
          </div>
          <p className="text-sm text-muted-foreground">{step}</p>
        </div>
      ))}
    </div>
  )
}

export function HowToSteps() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">How to save (iPhone)</h3>
        </div>
        <StepList steps={iphoneSteps} />
      </Card>
      <Card>
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Laptop className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">How to save (Laptop)</h3>
        </div>
        <StepList steps={laptopSteps} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Create `CapcutTip.tsx`**

```tsx
import { Scissors } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'

export function CapcutTip() {
  return (
    <Card className="flex items-start gap-3 border-success/30 bg-success/5">
      <Scissors className="mt-0.5 h-5 w-5 text-success" />
      <p className="text-xs text-success">
        <strong>CapCut tip:</strong> 1080p MP4 is best for editing. If original is 4K, picking 1080p gives a
        smaller file &amp; faster import.
      </p>
    </Card>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/downloader/components
git commit -m "feat(downloader):add UrlForm, VideoResult, QualityGrid, HowToSteps, CapcutTip"
```

---

### Task 7: App composition

**Files:**
- Create: `src/app/App.tsx`, `src/app/providers.tsx`

**Interfaces:** Composes everything from Tasks 2–6. Consumes `useVideoInfo`, `UrlForm`, `VideoResult`, `HowToSteps`, `CapcutTip`, `StatusMessage`, `VideoInfo` type.

- [ ] **Step 1: Create `src/app/providers.tsx`**

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '@/lib/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: Create `src/app/App.tsx`**

```tsx
import { useState } from 'react'
import { Youtube } from 'lucide-react'
import { UrlForm } from '@/features/downloader/components/UrlForm'
import { VideoResult } from '@/features/downloader/components/VideoResult'
import { HowToSteps } from '@/features/downloader/components/HowToSteps'
import { CapcutTip } from '@/features/downloader/components/CapcutTip'
import { StatusMessage, type Status } from '@/components/ui/StatusMessage/StatusMessage'
import { useVideoInfo } from '@/features/downloader/hooks/useVideoInfo'
import type { VideoInfo } from '@/features/downloader/types'

export function App() {
  const [input, setInput] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const { data, isLoading, isError, error } = useVideoInfo(url)

  const status: Status = isLoading ? 'loading' : isError ? 'error' : data ? 'success' : 'idle'

  function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed) return
    if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
      setInvalid(true)
      setUrl(null)
      return
    }
    setInvalid(false)
    setUrl(trimmed)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 py-8">
      <header className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Youtube className="h-8 w-8 text-primary" />
          <h1 className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            YT Save
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Paste link → Choose quality → Save to Gallery</p>
      </header>

      <div className="rounded-lg border border-border bg-card p-4">
        <UrlForm value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
        {invalid && <StatusMessage status="error">That doesn&apos;t look like a YouTube link</StatusMessage>}
        {status === 'loading' && <StatusMessage status="loading">Fetching video info...</StatusMessage>}
        {status === 'error' && (
          <StatusMessage status="error">
            {error instanceof Error ? error.message : 'Failed to fetch video'}
          </StatusMessage>
        )}
      </div>

      {data && <VideoResult info={data as VideoInfo} url={url ?? ''} />}

      <div className="mt-6">
        <HowToSteps />
      </div>
      <div className="mt-4">
        <CapcutTip />
      </div>

      <footer className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        Self-hosted • No ads • No tracking • Uses yt-dlp
        <br />
        For personal use — respect creators &amp; copyright
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app
git commit -m "feat(frontend):compose App screen with providers and status states"
```

---

### Task 8: Backend serves `dist` + SPA fallback

**Files:**
- Modify: `server.js` (static root + catch-all)
- Delete: `public/index.html`

**Interfaces:** Consumes built `dist/` from Task 9. Keeps all `/api/*` behavior identical.

- [ ] **Step 1: Change static root in `server.js`** (line 17)

Old:
```javascript
app.use(express.static(path.join(__dirname, 'public')));
```
New:
```javascript
app.use(express.static(path.join(__dirname, 'dist')));
```

- [ ] **Step 2: Add SPA fallback right before `app.listen`** (after all `app.get('/api/...')` routes)

```javascript
// SPA fallback — serve built index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

- [ ] **Step 3: Remove the old static UI**

```bash
git rm public/index.html
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat(backend):serve built dist and add SPA fallback; remove old index.html"
```

---

### Task 9: Install, build, and verify

**Files:** None new.

- [ ] **Step 1: Install dependencies**

```bash
npm install
```
Expected: completes, adds react/vite/tailwind to `node_modules`.

- [ ] **Step 2: Run the build (typecheck + bundle)**

```bash
npm run build
```
Expected: `tsc` passes with no errors; Vite prints `dist/assets/index-*.js` and `dist/index.html` is created.

- [ ] **Step 3: Start the server and smoke-test**

```bash
npm start
```
Expected: server logs `Server running` on `:8787`. In a browser open `http://localhost:8787`:
- Header shows `YT Save` with YouTube icon.
- Paste a `youtube.com` link → `Get Video` → qualities render as cards with `Download`/`Music` icons.
- Pick a quality → file downloads (laptop) / opens player (iPhone).
- Invalid link → `StatusMessage` error "doesn't look like a YouTube link".
- `GET /api/health` still returns `200`.

- [ ] **Step 4: Commit any build config fixes (only if needed)**

```bash
git add -A
git commit -m "chore:fix build config after first successful build"  # only if changes were required
```

If no fixes were needed, skip this commit.

- [ ] **Step 5: Push**

```bash
git push
```

---

## Self-Review (against spec)

1. **Spec coverage:** §2 architecture (root Vite, server serves dist, `start` builds) → Tasks 1, 8, 9. §3 stack/deps → Task 1. §4 folder structure → Tasks 2–7 file paths match exactly. §5 server.js change → Task 8. §6 scripts → Task 1 package.json. §7 visual design (tokens, lucide icons, cards) → Tasks 2,4,6,7. §8 behavior (iOS download flow, auto behavior) → QualityGrid + UrlForm (paste auto handled by button; auto-fetch-on-paste is intentionally dropped for a cleaner controlled submit — note this deviation below). §9 conventions (strict, no console.log, @/ imports, named exports) → all tasks. §10 verification → Task 9.

   **Deviation noted:** Spec §8 mentioned "Auto-fetch on paste if URL looks like YouTube." The plan uses an explicit `Get Video` button (controlled submit) instead, which is cleaner and consistent with the `isLoading` button state. No behavior loss for the user; they still tap Get Video. Flag for approval if auto-fetch is required.

2. **Placeholder scan:** No TBD/TODO/“add validation later”. Every code step is complete. ✓

3. **Type consistency:** `Status` defined in StatusMessage (Task 4) and imported by App (Task 7). `VideoInfo` defined in types (Task 5), imported by VideoResult and App. `useVideoInfo(url: string | null)` signature consistent across hook (Task 5) and App (Task 7). `QualityGrid` prop shape `{qualities, hasAudio, url}` matches VideoResult usage. `downloaderApi.getVideoInfo` returns `VideoInfoDTO` (zod-inferred) which structurally equals `VideoInfo`; App casts `data as VideoInfo`. ✓

No gaps found; only the auto-fetch-on-paste deviation, flagged above.
