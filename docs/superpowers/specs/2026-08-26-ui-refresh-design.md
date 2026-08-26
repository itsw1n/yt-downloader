# YT Save — UI Refresh (React + Vite)

Date: 2026-08-26
Status: Approved (design)

## 1. Goal

Visual refresh of the existing YT Save downloader UI. Same features and behavior,
rebuilt as a **React + Vite + TypeScript** single-page app using the team's standard
stack conventions (see `create-win-project` playbooks). The Express backend (`server.js`)
is unchanged in behavior — it keeps serving the `/api/*` routes and now serves the
built frontend from `dist/` instead of `public/`.

Scope: **visual refresh only.** No new features (no history, no progress bar, no
playlists). Icons come from `lucide-react`.

## 2. Architecture

Single repo, Vite at the root (approach A from the proposal).

- One `package.json` holds both frontend deps and the existing backend deps
  (`express`, `cors`).
- React source in `src/`. Vite builds to `dist/`.
- `server.js` static root changes from `public` → `dist`. API routes unchanged.
- `npm start` runs `build` then `node server.js` so self-host stays
  `npm install && npm start`.
- The app is a single screen — no `react-router`. Avoids needless abstraction.

### Data flow
```
App (providers: QueryClientProvider)
 └─ features/downloader/components/UrlForm
      └─ useVideoInfo(url)        ← TanStack Query
           └─ downloaderApi.getVideoInfo(url)  ← axios (lib/axios.ts)
                └─ GET /api/info?url=...
 └─ VideoResult → QualityGrid / audio button
      └─ on pick: navigate to /api/download?url=&quality=|audio=1
         (anchor + window.location for iPhone, since it streams a file)
```

## 3. Stack & dependencies

- react, react-dom
- vite, @vitejs/plugin-react, typescript
- tailwindcss@3, postcss, autoprefixer
- lucide-react
- @tanstack/react-query
- axios
- zod (response validation)
- clsx, tailwind-merge (for `cn()`)

No shadcn CLI (keeps deps light); hand-rolled `ui/` primitives following the `cn()`
pattern. No state library needed beyond TanStack Query (no Zustand — no cross-feature
state). Keep it minimal per the "complexity must earn abstraction" rule.

## 4. Folder structure

```
index.html                      # Vite entry (replaces public/index.html)
vite.config.ts                  # react plugin + '@' alias
tsconfig.json / tsconfig.node.json
tailwind.config.ts              # darkMode: 'class', semantic tokens
postcss.config.js
src/
  main.tsx                      # ReactDOM root
  index.css                     # tailwind layers + :root/.dark tokens
  app/
    App.tsx                     # composes the single screen
    providers.tsx               # QueryClientProvider
  lib/
    axios.ts                    # axios instance (baseURL '', JSON)
    queryClient.ts              # QueryClient defaults
    logger.ts                   # dev-only console wrapper
    utils.ts                    # cn()
  components/ui/
    Button/Button.tsx
    Input/Input.tsx
    Card/Card.tsx
    Spinner/Spinner.tsx         # Loader2 spin
    StatusMessage/StatusMessage.tsx  # idle/loading/error/success w/ icons
  features/downloader/
    api/downloaderApi.ts        # getVideoInfo()
    hooks/useVideoInfo.ts       # useQuery wrapper
    components/
      UrlForm.tsx               # input + paste + Get Video button
      VideoResult.tsx           # thumbnail, title, meta, quality grid
      QualityGrid.tsx           # best + per-quality cards + audio button
      HowToSteps.tsx            # iPhone + Laptop step lists (lucide nums)
      CapcutTip.tsx             # CapCut tip banner
    types/index.ts              # VideoInfo, Quality
    schemas/videoInfo.schema.ts # Zod schema for GET /api/info
```

## 5. Backend change (server.js)

- `express.static(path.join(__dirname, 'public'))`
  → `express.static(path.join(__dirname, 'dist'))`.
- Add a SPA fallback so unknown non-`/api` routes still return `index.html`
  (cheap, future-proof): `app.get('*', (req,res)=> res.sendFile(dist/index.html))`
  placed **after** API routes.
- Remove old `public/index.html` (superseded by `dist`). `public/` can be deleted
  or kept empty; Vite uses its own `public/` if needed later.

Everything else (port 8787, `/api/info`, `/api/download`, `/api/health`, tunnel)
stays exactly as-is.

## 6. npm scripts (package.json)

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "start": "npm run build && node server.js",
  "tunnel": "node tunnel.js",
  "tunnel:lt": "npx localtunnel --port 8787",
  "tunnel:cf": "cloudflared tunnel --url http://localhost:8787"
}
```

`type` stays `"module"`. Vite/React are ESM; `server.js` and `tunnel.js` are ESM
(already `import`).

## 7. Visual design

Keep the existing identity: dark, mobile-first, YouTube-red→orange gradient accent.
Refine with the design system:

- **Tokens** (Tailwind semantic): `background`, `foreground`, `card`, `muted`,
  `muted-foreground`, `primary` (red), `primary-foreground`, `border`, `destructive`,
  `success`. Defined as HSL CSS vars in `index.css` under `:root` and `.dark`;
  default `<html>` to `.dark`.
- **Layout:** centered `max-w-md` container, sticky-ish header with `Youtube` icon
  + gradient wordmark.
- **UrlForm:** `Input` with `Link2` icon prefix, `ClipboardPaste` button (calls
  `navigator.clipboard.readText`), gradient `Button` "Get Video".
- **VideoResult:** 16:9 thumbnail in `Card` with `Clock` duration badge; title
  (clamp 2 lines); uploader • views meta; `QualityGrid`.
- **QualityGrid:** `Card` per option. "Best" spans full width, gradient. Each shows
  `Download` icon + height + ext. Audio option uses `Music` icon, dashed border.
- **StatusMessage:** `Loader2` (spin) for loading, `AlertCircle` for error
  (destructive), `CheckCircle2` for success. Transition via Tailwind `transition-*`.
- **HowToSteps:** two `Card` sections (iPhone / Laptop), numbered rows using
  `Smartphone` / `Laptop` section icons and step circles.
- **CapcutTip:** `Scissors` icon banner.
- Mobile-first; `sm:`/`md:` only if needed. All icons from `lucide-react`.

## 8. Behavior (unchanged)

- Paste → validate youtube.com / youtu.be → `Get Video` → `useVideoInfo` fetches
  `/api/info` → render qualities.
- Pick quality/audio → trigger download: create `<a download>` to
  `/api/download?...` and click; for iPhone UA also set `window.location.href` after
  a short delay (matches current iOS save flow).
- Auto-fetch on paste if URL looks like YouTube.
- Errors surfaced via `StatusMessage` (network / API error message).

## 9. TypeScript & conventions

- Strict mode, no `any`, no `console.log` (use `lib/logger.ts`).
- Absolute imports `@/...`; no relative `../../`.
- Named exports for components; page/app uses default where conventional.
- One component per file. Zod schema for API response shape.

## 10. Testing & verification

- `npm run build` must succeed (tsc + vite) with no type errors.
- Manual: `npm run dev` → load app, paste a YouTube link, pick 1080p, confirm file
  downloads on laptop and iOS flow still works via tunnel.
- Regression: `npm start` builds and serves on :8787; `/api/health` still 200;
  `/api/info` and `/api/download` unchanged.
- No automated tests added (visual refresh, no logic change beyond restructure);
  optional smoke check is manual.

## 11. Risks / notes

- Build step adds `npm run build` before serve; automated in `start` so self-host
  flow is unchanged.
- `server.js` `import` of path: ensure `__dirname` works under ESM (already handled
  via `fileURLToPath` in current server.js).
- Tailwind v3 chosen to match playbook config style (v4 changes config model).
