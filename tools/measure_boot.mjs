// Cold-boot measurement: serves dist/ at /nobu/, opens the game in headless Chromium,
// waits for the title screen, then prints the same-origin requests and bytes it took to get there,
// plus an estimate of the texture memory uploaded to WebGL (w * h * 4 per level-0 upload, x 4/3
// when mipmaps are generated). Usage: npm run build && node tools/measure_boot.mjs [--json]
//   [--after-ms N]  keep counting for N ms after the title screen (background loads)
//   [--mbps N]      throttle downloads to N Mbit/s (40 ms latency)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright is not a dependency of this repo; use the one on the machine (as tools/playtest.mjs does).
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const PORT = Number(opt('--port', 4317));
const AFTER = Number(opt('--after-ms', 0));
const MBPS = Number(opt('--mbps', 0)); // throttle the link (e.g. 20) to see what the title waits for
const URL_ = `http://127.0.0.1:${PORT}/nobu/`;

// A plain static server for dist/ at /nobu/ (the production base; `vite preview` would serve /play/nobu/).
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.ktx2': 'image/ktx2' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (!u.pathname.startsWith('/nobu/')) { res.writeHead(404); res.end(); return; }
  let file = path.join(DIST, decodeURIComponent(u.pathname.slice('/nobu/'.length)) || 'index.html');
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  const vram = { bytes: 0, uploads: 0 };
  window.__vram = vram;
  const wrap = (proto) => {
    const tex = proto.texImage2D;
    proto.texImage2D = function (...a) {
      const src = a[5];
      const w = a.length >= 9 ? a[3] : src?.naturalWidth || src?.videoWidth || src?.width || 0;
      const h = a.length >= 9 ? a[4] : src?.naturalHeight || src?.videoHeight || src?.height || 0;
      if (a[1] === 0 && w * h > 4) { vram.bytes += w * h * 4; vram.uploads++; }
      return tex.apply(this, a);
    };
    const st = proto.texStorage2D;
    if (st) proto.texStorage2D = function (target, levels, fmt, w, h) {
      vram.bytes += w * h * 4 * (levels > 1 ? 4 / 3 : 1); vram.uploads++;
      return st.apply(this, arguments);
    };
    const mip = proto.generateMipmap;
    proto.generateMipmap = function (...a) { vram.mips = (vram.mips || 0) + 1; return mip.apply(this, a); };
  };
  // Decoded images the page holds (w * h * 4): <img> made by THREE.ImageLoader, ImageBitmaps made by GLTFLoader.
  vram.decoded = 0; vram.images = 0;
  const seen = new WeakSet();
  const noteImg = (img) => img.addEventListener('load', () => { if (seen.has(img)) return; seen.add(img); vram.decoded += img.naturalWidth * img.naturalHeight * 4; vram.images++; });
  const ce = Document.prototype.createElementNS;
  Document.prototype.createElementNS = function (ns, name) { const el = ce.call(this, ns, name); if (String(name).toLowerCase() === 'img') noteImg(el); return el; };
  const cb = window.createImageBitmap;
  if (cb) window.createImageBitmap = function (...a) { return cb.apply(this, a).then((b) => { vram.decoded += b.width * b.height * 4; vram.images++; return b; }); };
  if (window.WebGLRenderingContext) wrap(WebGLRenderingContext.prototype);
  if (window.WebGL2RenderingContext) wrap(WebGL2RenderingContext.prototype);
});

// External requests (Google Fonts) are counted but not fetched, so the result does not depend on the network.
await page.route((u) => !u.href.startsWith(`http://127.0.0.1:${PORT}/`), (route) => route.abort());
const reqs = new Map();
const client = await page.context().newCDPSession(page);
await client.send('Network.enable');
await client.send('Network.setCacheDisabled', { cacheDisabled: true });
if (MBPS) await client.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: MBPS * 125000, uploadThroughput: MBPS * 125000 });
client.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, bytes: 0, done: false, t: Date.now() }));
client.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.done = true; r.end = Date.now(); } });

const snapshot = async (label, before = Infinity) => {
  const local = [...reqs.values()].filter((r) => r.url.startsWith(`http://127.0.0.1:${PORT}/`) && r.done && r.end <= before);
  const ext = [...reqs.values()].filter((r) => !r.url.startsWith(`http://127.0.0.1:${PORT}/`) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
  const vram = await page.evaluate(() => window.__vram);
  return {
    label,
    requests: local.length,
    bytes: local.reduce((s, r) => s + r.bytes, 0),
    externalRequests: ext.length,
    textureUploads: vram.uploads,
    textureMiB: Math.round((vram.bytes / 1048576) * 10) / 10,
    decodedImages: vram.images,
    decodedMiB: Math.round((vram.decoded / 1048576) * 10) / 10,
    files: local.map((r) => `${r.url.replace(URL_, '')} ${r.bytes}`),
  };
};

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.title-logo', { timeout: 120000 });
const titleAt = Date.now();
const titleMs = titleAt - t0;
const out = [{ ...(await snapshot('loaded before the title', titleAt)), titleMs }];
if (AFTER) { await page.waitForTimeout(AFTER); out.push(await snapshot(`title+${AFTER}ms`)); }
await browser.close();
server.close();
if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
else for (const s of out) {
  console.log(`${s.label}: ${s.requests} requests, ${(s.bytes / 1048576).toFixed(2)} MiB, ${s.externalRequests} external, ${s.textureUploads} GPU texture uploads (~${s.textureMiB} MiB), ${s.decodedImages} decoded images (~${s.decodedMiB} MiB)${s.titleMs ? `, title after ${s.titleMs} ms` : ''}`);
}
