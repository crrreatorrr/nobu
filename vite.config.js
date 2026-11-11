import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Shown in feedback notes (src/hub/feedback.js): package.json version plus the short commit.
function buildVersion() {
  const { version } = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  let sha = (process.env.GITHUB_SHA || '').slice(0, 7);
  if (!sha) {
    try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { sha = ''; }
  }
  return `${version}+${sha || 'dev'}`;
}

// Dev-only helper: POST a canvas data URL to /__shot to save a screenshot for playtesting.
const devShot = {
  name: 'dev-shot',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__shot', (req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const name = (new URL(req.url, 'http://x').searchParams.get('n') || 'shot').replace(/[^\w-]/g, '');
        fs.mkdirSync('tools/_raw/shots', { recursive: true });
        fs.writeFileSync(`tools/_raw/shots/${name}.jpg`, Buffer.from(body.split(',')[1] || '', 'base64'));
        res.end('ok');
      });
    });
  },
};

// Production is served at /nobu/. Local `vite` dev is mounted at /play/nobu/.
// VITE_BASE overrides either one. It is not applied to VITE_HUB_URL: Exit to Hub
// stays on the hub origin path (default /hub/#from=nobu).
function viteBase(command, mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const fallback = command === 'serve' ? '/play/nobu/' : '/nobu/';
  const raw = String(env.VITE_BASE || fallback).trim() || fallback;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export default defineConfig(({ command, mode }) => ({
  base: viteBase(command, mode),
  plugins: [devShot],
  define: { __NOBU_VERSION__: JSON.stringify(buildVersion()) },
  server: {
    // Same-origin /v2 in dev. Production Caddy proxies Nakama; serverUrl stays ''.
    proxy: {
      '/v2': { target: 'http://127.0.0.1:7350', changeOrigin: true },
      '/ws': { target: 'http://127.0.0.1:7350', ws: true, changeOrigin: true },
    },
  },
}));
