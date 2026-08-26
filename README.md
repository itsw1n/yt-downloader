# YT Save — Self-hosted YouTube Downloader

Paste link → Choose quality → Save to iPhone Gallery / Laptop Downloads → Use in CapCut

No ads, no paywall. You own it.

---

## 1. Install

```bash
git clone <your-repo-url> yt-downloader
cd yt-downloader
npm install
```

Requirements:
- Node.js 18+
- `yt-dlp` — install/update: `pip install -U yt-dlp`
  (or `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`)

---

## 2. Run the server

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
