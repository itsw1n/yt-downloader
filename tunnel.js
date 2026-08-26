#!/usr/bin/env node
// tunnel.js — starts local server + public tunnel (works outside WiFi)
// Usage: npm run tunnel  -> auto-picks cloudflared (stable) with localtunnel fallback
//        npm run tunnel:lt -> force localtunnel
//        npm run tunnel:cf -> force cloudflared

import { spawn } from 'child_process';
import http from 'http';

const PORT = process.env.PORT || 8787;

function isPortOpen(port) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}/api/health`, res => resolve(res.statusCode === 200)).on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await isPortOpen(PORT)) {
    console.log(`✓ Server already running on http://localhost:${PORT}`);
    return null;
  }
  console.log(`→ Starting server on port ${PORT}...`);
  const server = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit'
  });
  // wait a bit
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await isPortOpen(PORT)) break;
  }
  return server;
}

function startCloudflared() {
  console.log('\n→ Starting Cloudflare Tunnel (https://...trycloudflare.com)...\n');
  const cf = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], { stdio: 'inherit' });
  cf.on('error', err => {
    console.error('cloudflared not found, falling back to localtunnel:', err.message);
    startLocaltunnel();
  });
  return cf;
}

function startLocaltunnel() {
  console.log('\n→ Starting Localtunnel (https://...loca.lt)...\n');
  console.log('  If it asks for Tunnel Password, open https://loca.lt/mytunnelpassword and copy your IP\n');
  const lt = spawn('npx', ['localtunnel', '--port', String(PORT)], { stdio: 'inherit' });
  lt.on('error', err => console.error('localtunnel error:', err.message));
  return lt;
}

async function main() {
  const arg = process.argv[2];
  await ensureServer();

  // small delay to show server URL
  console.log(`\n✓ Local: http://localhost:${PORT}`);
  console.log(`✓ LAN:   http://192.168.254.104:${PORT} (same WiFi only)`);

  if (arg === 'lt') startLocaltunnel();
  else if (arg === 'cf') startCloudflared();
  else {
    // auto: try cloudflared first (you have it installed), fallback to lt
    const cf = startCloudflared();
    cf.on('exit', code => {
      if (code !== 0) {
        console.log('Cloudflared exited, trying localtunnel...');
        startLocaltunnel();
      }
    });
  }
}

main();
