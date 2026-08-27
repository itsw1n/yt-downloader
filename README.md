# YT Save — Self-hosted YouTube Downloader

Paste link → Choose quality → Save to iPhone Gallery / Laptop Downloads → Use in CapCut

No ads, no paywall. You own it.

---

## 1. Install

### Option A — Docker (recommended, easiest)

You only need **Docker** installed. No Node, no `yt-dlp`, no `ffmpeg` — they're baked into the image.

```bash
git clone <your-repo-url> yt-downloader
cd yt-downloader
make run          # builds the image and starts the app on :8787
```

### Option B — Run natively (Node)

```bash
git clone <your-repo-url> yt-downloader
cd yt-downloader
npm install
```

Requirements:
- Node.js 18+
- `yt-dlp` — install/update: `pip install -U yt-dlp`
  (or `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`)
- `ffmpeg` (for merging audio/video)

---

## 2. Run the server

**Docker:**
```bash
make run          # build + start (http://localhost:8787)
make stop         # stop containers
make logs         # tail logs
make status       # container + health status
```
Or with plain Docker Compose:
```bash
docker compose up -d --build
```

**Native:**
```bash
npm start
```

Server starts on `http://0.0.0.0:8787`.

### How people connect (two options)

**A) Same WiFi (no internet exposure)**
Open the app on any device on the same network as this machine:

```bash
# Find this machine's LAN IP:
ip addr | grep inet        # Linux
# or: ifconfig (Mac) / ipconfig (Windows)
```

- On this machine: http://localhost:8787
- On phone (same WiFi): http://YOUR_LAN_IP:8787
  (example: http://192.168.1.20:8787)

**B) Public link (any phone, anywhere — over mobile data)**
Opens a tunnel so you can send the link to any phone without sharing WiFi:

```bash
make tunnel       # Docker / Makefile setup
# or, native:
npm run tunnel
```

It prints a public `https://xxxx.trycloudflare.com` URL — send that to any phone.
Keep the terminal open while you need it. (Free quick tunnels give a new random URL each restart.)

> Alternatives: `npm run tunnel:cf` (Cloudflare only) · `npm run tunnel:lt` (localtunnel only)

---

## 3. How to use (iPhone → CapCut)

1. Copy YouTube link (Share → Copy link)
2. Paste in YT Save → Tap Get Video → Pick 1080p (best for CapCut)
3. Video opens → Tap Share icon ↗ → Save Video
4. Open CapCut → New Project → Video is in Gallery

## How to use (Laptop)

Same site on laptop → Pick quality → File downloads to `Downloads/*.mp4` → Drag into CapCut Desktop

---

## Features
- Qualities: 144p to 4K (whatever YouTube has) + MP3 audio
- MP4 / H264 — CapCut compatible
- Shorts supported

## API
- `GET /api/info?url=YOUTUBE_URL` → `{ title, thumbnail, qualities[], hasAudio }`
- `GET /api/download?url=...&quality=1080` → streams MP4 attachment
- `GET /api/download?url=...&audio=1` → streams MP3

## Notes
- For personal use. Respect creators & YouTube ToS.
- If a video fails: try updating yt-dlp; some age-restricted/private videos require auth.
- Docker users: `yt-dlp` is pinned at build time — rebuild the image (`make run` / `docker compose build`) to get the latest version.
- The optional `bgutil` service (POT provider) is included in `docker-compose.yml` but is not yet consumed by `server.js`.
