import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// ---- Cache for video info (avoid double-fetch, faster UI) ----
const infoCache = new Map(); // url -> {data, ts}
const CACHE_TTL = 10 * 60 * 1000; // 10 min

function getCached(url) {
  const c = infoCache.get(url);
  if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
  return null;
}
function setCached(url, data) {
  infoCache.set(url, { data, ts: Date.now() });
  // limit size
  if (infoCache.size > 100) {
    const first = infoCache.keys().next().value;
    infoCache.delete(first);
  }
}

function getVideoInfo(url) {
  const cached = getCached(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    // use fast args: no playlist, no warnings, socket timeout 15s
    const args = ['--dump-single-json', '--no-playlist', '--no-warnings', '--socket-timeout', '15', url];
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.slice(0, 600) || `yt-dlp exited ${code}`));
      try {
        const data = JSON.parse(stdout);
        setCached(url, data);
        resolve(data);
      } catch (e) {
        reject(new Error('Failed to parse video info: ' + e.message));
      }
    });
    proc.on('error', reject);
  });
}

// quick filename without blocking download (extract id, sanitize)
function quickFilename(url, title) {
  if (title) return title.replace(/[^a-z0-9_\- ]/gi, '').slice(0, 60) || 'video';
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v') || u.pathname.split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
    return v.slice(0, 40);
  } catch { return 'video'; }
}

// GET info
app.get('/api/info', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return res.status(400).json({ error: 'Please provide a YouTube link' });
  }
  try {
    const info = await getVideoInfo(url);
    const formats = info.formats || [];
    const qualityMap = new Map();
    for (const f of formats) {
      if (!f.height || !f.vcodec || f.vcodec === 'none') continue;
      const key = f.height;
      const existing = qualityMap.get(key);
      if (!existing || (f.ext === 'mp4' && existing.ext !== 'mp4')) {
        qualityMap.set(key, { height: f.height, ext: f.ext, fps: f.fps });
      }
    }
    const qualities = Array.from(qualityMap.values())
      .sort((a, b) => b.height - a.height)
      .map(q => ({ label: `${q.height}p${q.fps > 30 ? q.fps : ''} ${q.ext}`, height: q.height, ext: q.ext }));
    const hasAudio = formats.some(f => f.acodec !== 'none' && f.vcodec === 'none');
    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      duration_string: info.duration_string,
      uploader: info.uploader,
      view_count: info.view_count,
      qualities,
      hasAudio,
      id: info.id
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message.slice(0, 500) });
  }
});

// GET download - OPTIMIZED
app.get('/api/download', async (req, res) => {
  const url = req.query.url;
  const quality = req.query.quality;
  const audioOnly = req.query.audio === '1';
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  // OPTIMIZATION 1: Don't block download on getVideoInfo (was +3-5s delay).
  // Use cached title if available, else quick fallback and start immediately.
  let filename = 'video';
  const cached = getCached(url);
  if (cached?.title) filename = quickFilename(url, cached.title);
  else {
    // try quick non-blocking fetch with 2s timeout, else use id
    try {
      const info = await Promise.race([
        getVideoInfo(url),
        new Promise((_, rej) => setTimeout(() => rej(new Error('title timeout')), 2000))
      ]);
      filename = quickFilename(url, info.title);
    } catch {
      filename = quickFilename(url, null);
    }
  }

  let contentType = audioOnly ? 'audio/mpeg' : 'video/mp4';
  filename += audioOnly ? '.mp3' : '.mp4';

  // Download to a temp file first, then stream to client. This lets us auto-retry
  // with different player clients on 403/SABR errors BEFORE any bytes are sent.
  const tmp = path.join(os.tmpdir(), `yt_${Date.now()}_${Math.random().toString(36).slice(2)}.${audioOnly ? 'mp3' : 'mp4'}`);

  function buildArgs(client) {
    const clientArg = client ? ['--extractor-args', `youtube:player_client=${client}`] : [];
    if (audioOnly) {
      return [
        ...clientArg,
        '-f', 'bestaudio[protocol*=m3u8]/bestaudio/best',
        '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0',
        '--hls-prefer-native', '-N', '8', '--http-chunk-size', '10M',
        '--no-playlist', '--no-warnings',
        '-o', tmp, url
      ];
    }
    const h = (quality && quality !== 'best' && quality !== 'highest') ? parseInt(quality, 10) : null;
    const m3u8Best = h
      ? `bestvideo[height<=${h}][protocol*=m3u8]+bestaudio/best[height<=${h}][protocol*=m3u8]`
      : `bestvideo[protocol*=m3u8]+bestaudio/best[protocol*=m3u8]`;
    const dashFallback = h ? `bv*[height<=${h}]+ba/bv*+ba/b` : `bv*+ba/b`;
    return [
      ...clientArg,
      '-f', `${m3u8Best}/${dashFallback}`,
      '--hls-prefer-native', '-N', '8', '--http-chunk-size', '10M',
      '--merge-output-format', 'mp4',
      '--no-playlist', '--no-warnings',
      '-o', tmp, url
    ];
  }

  console.log(`[download] ${audioOnly ? 'MP3' : quality || 'best'} <- ${url.slice(0,60)} -> ${filename}`);
  const t0 = Date.now();

  const clients = [null, 'android', 'mweb', 'web'];
  let ci = 0;

  function cleanup() { try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {} }

  function attempt() {
    const client = clients[ci];
    const a = buildArgs(client);
    console.log(`[download] attempt ${ci} client=${client || 'default'} <- ${url.slice(0, 50)}`);
    const ytdlp = spawn('yt-dlp', a);
    let stderrBuf = '';
    ytdlp.stderr.on('data', d => {
      const s = d.toString();
      stderrBuf += s;
      if (s.includes('ERROR')) console.error('[yt-dlp]', s.slice(0, 300).trim());
    });
    ytdlp.on('close', code => {
      const ok = code === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 0;
      if (ok) {
        const stat = fs.statSync(tmp);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        const rs = fs.createReadStream(tmp);
        rs.on('close', cleanup);
        rs.on('error', cleanup);
        rs.pipe(res);
        console.log(`[download] done code=0 in ${((Date.now() - t0) / 1000).toFixed(1)}s ${filename} (${(stat.size / 1e6).toFixed(1)}MB)`);
        return;
      }
      if (ci < clients.length - 1) {
        ci++;
        console.log(`[download] client ${client || 'default'} failed (code=${code}), retry with ${clients[ci]}`);
        cleanup();
        attempt();
      } else {
        console.log(`[download] all clients failed code=${code} ${filename}`);
        if (!res.headersSent) res.status(500).json({ error: stderrBuf.slice(-600) || `yt-dlp exited ${code}` });
        else res.end();
        cleanup();
      }
    });
    ytdlp.on('error', err => {
      console.error(err);
      if (ci < clients.length - 1) { ci++; cleanup(); attempt(); }
      else { if (!res.headersSent) res.status(500).json({ error: err.message }); else res.end(); cleanup(); }
    });
    req.on('close', () => { try { ytdlp.kill('SIGKILL'); } catch {} });
  }

  attempt();
});

app.get('/api/health', (req, res) => res.json({ ok: true, ytDlp: true, cache: infoCache.size, bgutil: true }));

// SPA fallback — serve the built index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ Server running (OPTIMIZED)`);
  console.log(`  Laptop: http://localhost:${PORT}`);
  console.log(`  iPhone LAN: http://192.168.254.104:${PORT}`);
  console.log(`  Tunnel: npm run tunnel  (public link)`);
  console.log(`  Perf: -N 8 concurrent fragments, HLS native, 10M chunks, cached info\n`);
});
