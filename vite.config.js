import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { UNUSED } from './src/art/assetTiers.js';

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

// Build-only: dist/ gets a runtime manifest (id -> file; the authoring prompts and job ids stay in
// public/assets/manifest.json) and none of the authoring-only files in src/art/assetTiers.js UNUSED.
const shipAssets = {
  name: 'ship-assets',
  apply: 'build',
  writeBundle(options) {
    const out = path.join(options.dir || 'dist', 'assets');
    const src = JSON.parse(fs.readFileSync(new URL('./public/assets/manifest.json', import.meta.url), 'utf8'));
    const assets = {};
    for (const [id, a] of Object.entries(src.assets || {})) {
      if (UNUSED.has(id)) { fs.rmSync(path.join(out, a.file), { force: true }); continue; }
      assets[id] = { file: a.file };
    }
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ assets }));
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
  plugins: [devShot, shipAssets],
  define: { __NOBU_VERSION__: JSON.stringify(buildVersion()) },
  build: {
    rollupOptions: {
      output: {
        // three and the hub SDK change far less often than the game: separate chunks stay cached
        // across game releases.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three';
          // third_party/ (modern-screenshot) stays the lazy chunk the feedback screenshot imports.
          if (/[\\/]third_party[\\/]/.test(id)) return undefined;
          if (/[\\/](vendor[\\/]hub-sdk|node_modules[\\/]@metaverse[\\/]hub-sdk)[\\/]/.test(id)) return 'hub-sdk';
          return undefined;
        },
      },
    },
  },
  server: {
    // Same-origin /v2 in dev. Production Caddy proxies Nakama; serverUrl stays ''.
    proxy: {
      '/v2': { target: 'http://127.0.0.1:7350', changeOrigin: true },
      '/ws': { target: 'http://127.0.0.1:7350', ws: true, changeOrigin: true },
    },
  },
}));
