// Headless playtest harness (docs/gameplay-improvement-plan.md, section 2 and item D1).
//
//   node tools/playtest.mjs [suite ...] [--url http://localhost:5173/play/nobu/] [--out dir]
//
// Suites: physics, respawn, tutorials, framing, markers, layout. No suite names runs them all.
// Without --url it starts its own Vite dev server on --port (default 5403) and stops it at the end.
// Screenshots go to --out (default tools/_raw/playtest, which is git-ignored).
//
// It needs Playwright with a Chromium it can launch; this repo does not depend on Playwright, so
// install it yourself or point NODE_PATH at a global copy.
//
// Software rendering runs at about 2 frames per second, and the main loop clamps dt to 0.05 s, so a
// rendered game runs at a tenth of real speed. The harness therefore switches rendering off and
// steps the simulation at 60 Hz in step with the wall clock (setTimeout-based flows stay in sync),
// and renders a single frame only when a screenshot is taken.
//
// It drives the dev build's hooks (window.__nobu and window.T from src/dev.js). When the Test Lab's
// window.testLab API exists (docs/test-lab-plan.md), forcing boss attacks should move to it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const SUITES = ['physics', 'respawn', 'tutorials', 'framing', 'markers', 'layout'];
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const port = Number(opt('port', 5403));
const givenUrl = opt('url', null);
const outDir = path.resolve(opt('out', 'tools/_raw/playtest'));
const wanted = args.length ? args : SUITES;
for (const name of wanted) if (!SUITES.includes(name)) { console.error(`Unknown suite "${name}". Suites: ${SUITES.join(', ')}`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (v, n = 2) => Number(v.toFixed(n));

// ---------- page side ----------
// Installed once per page. Everything here runs in the browser.
function installStepper() {
  const g = window.__nobu;
  const render = g.render.bind(g), loop = g.loop.bind(g), update = g.update.bind(g);
  const pt = { samples: [], recording: false, frames: 0, simT: 0 };
  g.render = () => {};
  g.loop = () => {}; // drops the requestAnimationFrame chain and the hidden-tab ticker in dev.js
  g.update = (dt) => {
    update(dt);
    pt.frames++; pt.simT += dt;
    if (pt.recording) {
      const p = g.player;
      pt.samples.push({ t: pt.simT, x: p.pos.x, y: p.pos.y, z: p.pos.z, vy: p.vel.y, grounded: !!p.body.grounded,
        speed: Math.hypot(p.vel.x, p.vel.z), mode: p.mode, dead: !!p.dead });
    }
  };
  const STEP = 1000 / 60;
  let now = performance.now(), simNow = now;
  g.last = simNow;
  setInterval(() => {
    now = performance.now();
    // Stay in step with the wall clock; after a long stall, drop the backlog instead of racing.
    if (now - simNow > 250) simNow = now - STEP;
    while (simNow + STEP <= now) { simNow += STEP; loop(simNow, true); }
  }, 4);
  pt.record = (on) => { pt.recording = on; if (on) pt.samples = []; return pt.samples; };
  pt.renderFrame = () => { render(); };
  pt.key = (code, type) => window.dispatchEvent(new KeyboardEvent(type, { code }));
  /** Projects a world point to viewport pixels with the live camera. */
  pt.project = (x, y, z) => {
    const cam = g.camera.cam;
    cam.updateMatrixWorld(true);
    const v = g.player.pos.clone().set(x, y, z).project(cam);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, behind: v.z > 1 };
  };
  /** World bounding box of the visible, opaque meshes under an object (skinned meshes in their current pose). */
  pt.box = (obj) => {
    const min = g.player.pos.clone().set(Infinity, Infinity, Infinity), max = g.player.pos.clone().set(-Infinity, -Infinity, -Infinity), v = g.player.pos.clone();
    obj.updateMatrixWorld(true);
    obj.traverseVisible((o) => {
      const pos = o.isMesh && o.geometry?.attributes?.position;
      if (!pos || o.material?.transparent) return;
      if (o.isSkinnedMesh) {
        const step = Math.max(1, Math.floor(pos.count / 400));
        for (let i = 0; i < pos.count; i += step) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); min.min(v); max.max(v); }
        return;
      }
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
        v.set(x, y, z).applyMatrix4(o.matrixWorld); min.min(v); max.max(v);
      }
    });
    return { min, max };
  };
  window.__pt = pt;
  return true;
}

// ---------- node side ----------
async function main() {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.error('Playwright was not found. Install it, or set NODE_PATH to a global node_modules that has it.'); process.exit(2); }

  let server = null, url = givenUrl;
  if (!url) {
    url = `http://localhost:${port}/play/nobu/`;
    if (!await reachable(url)) {
      server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
      for (let i = 0; i < 60 && !await reachable(url); i++) await sleep(250);
      if (!await reachable(url)) { stop(server); console.error(`The dev server did not start on port ${port}.`); process.exit(2); }
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report = {};
  let failed = false;
  try {
    for (const name of wanted) {
      const ctx = await open(browser, url);
      try { report[name] = await SUITE[name](ctx); }
      catch (e) { failed = true; report[name] = { error: String(e?.stack || e) }; }
      report[name].consoleErrors = ctx.errors;
      await ctx.page.close();
    }
  } finally {
    await browser.close();
    stop(server);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed ? 1 : 0);
}

const reachable = (url) => fetch(url).then((r) => r.ok, () => false);
function stop(server) { if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } } }

async function open(browser, url, viewport = { width: 960, height: 540 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__nobu && window.T && window.__nobu.ui, null, { timeout: 60000 });
  await page.evaluate(installStepper);
  const ctx = { page, errors, url, browser };
  ctx.eval = (fn, arg) => page.evaluate(fn, arg);
  ctx.shot = async (name) => {
    await page.evaluate(() => window.__pt.renderFrame());
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file });
    return file;
  };
  /** Starts a level through the dev hook, skipping its dialogue, and waits for control. */
  ctx.go = async (level, { god = false } = {}) => {
    await page.evaluate(async ([lv, godMode]) => {
      const g = window.__nobu;
      const { save } = await import('/play/nobu/src/core/save.js').catch(() => ({ save: null }));
      if (save) { save.data.godMode = godMode; save.data.tutorials ||= {}; }
      window.__ptSave = save;
      let pending = true;
      const done = g.startLevel(lv).finally(() => { pending = false; });
      while (pending) { if (g.ui.dialog) g.ui._nextLine(); await window.T.sleep(100); }
      await done;
    }, [level, god]);
    await page.waitForFunction(() => window.__nobu.state === 'play' && !window.__nobu.session?.loading && !window.__nobu.player.frozen, null, { timeout: 60000 });
  };
  /** Runs the gate and waits until the boss is active. */
  ctx.boss = async () => {
    await page.evaluate(async () => {
      const g = window.__nobu;
      g.session.reachBossGate();
      for (let i = 0; i < 600 && !g.session.boss?.active; i++) { if (g.ui.dialog) g.ui._nextLine(); await window.T.sleep(100); }
    });
    await page.waitForFunction(() => window.__nobu.session?.boss?.active, null, { timeout: 90000 });
  };
  return ctx;
}

const SUITE = {
  // Jump heights and air distances, from position samples (plan section 3 and item C1).
  async physics(ctx) {
    await ctx.go(1, { god: true });
    // Level 1, d 75 at x 1.7: about 11 m of clear floor ahead.
    const flat = async () => { await ctx.eval(() => { window.T.at(75, 1.7); window.__nobu.player.vel.set(0, 0, 0); }); await sleep(400); };
    const run = async (keys) => {
      await flat();
      await ctx.eval(() => window.__pt.record(true));
      await sleep(60); // at least one grounded sample before the first key
      for (const [code, type, wait] of keys) { await ctx.eval(([c, t]) => window.__pt.key(c, t), [code, type]); await sleep(wait); }
      await sleep(1300);
      for (const code of new Set(keys.map((k) => k[0]))) await ctx.eval((c) => window.__pt.key(c, 'keyup'), code);
      const samples = await ctx.eval(() => window.__pt.record(false));
      return airStats(samples);
    };
    const out = {};
    out.tapJump = await run([['Space', 'keydown', 40], ['Space', 'keyup', 0]]);
    out.fullJump = await run([['Space', 'keydown', 900], ['Space', 'keyup', 0]]);
    out.doubleJump = await run([['Space', 'keydown', 330], ['Space', 'keyup', 30], ['Space', 'keydown', 700], ['Space', 'keyup', 0]]);
    out.runningJump = await run([['KeyW', 'keydown', 500], ['Space', 'keydown', 900]]);
    out.slideJump = await run([['KeyW', 'keydown', 500], ['KeyK', 'keydown', 120], ['Space', 'keydown', 900]]);
    return out;
  },

  // Death to regained control, unskipped and skipped (plan A2).
  async respawn(ctx) {
    await ctx.go(1);
    const once = async (type, skip) => {
      await ctx.eval(() => { window.T.at(20); });
      await sleep(600);
      const t0 = await ctx.eval((kind) => { const g = window.__nobu; g.player.die(kind); return performance.now(); }, type);
      if (skip) {
        // Tap Jump until the card goes: the first press after 250 ms of card skips it.
        for (let i = 0; i < 40; i++) {
          if (!await ctx.eval(() => window.__nobu.session.dying)) break;
          await ctx.eval(() => window.__pt.key('Space', 'keydown')); await sleep(30);
          await ctx.eval(() => window.__pt.key('Space', 'keyup')); await sleep(30);
        }
      }
      await ctx.page.waitForFunction(() => !window.__nobu.session.dying && !window.__nobu.player.dead, null, { timeout: 15000, polling: 10 });
      const t1 = await ctx.eval(() => performance.now());
      await sleep(600);
      return round((t1 - t0) / 1000);
    };
    return {
      fallSec: await once('fall', false),
      fallSkippedSec: await once('fall', true),
      otherSec: await once('angel', false),
      targets: { fallSec: 1.8, fallSkippedSec: 1.2, otherSec: 2.1 },
    };
  },

  // Level 1, d 75 to about 110 at run speed without stopping: every tutorial shows in turn (plan A4).
  async tutorials(ctx) {
    await ctx.go(1, { god: true });
    await ctx.eval(() => {
      const g = window.__nobu, save = window.__ptSave;
      // A first-time player has seen the earlier tutorials by now; a warp would fire them all at once.
      const fresh = ['knight', 'slide', 'snacks', 'treat', 'cat', 'trampoline'];
      if (save) { const seen = save.data.tutorials; for (const t of g.stage.track.triggers) if (t.d < 76) t.fired = true; for (const id of fresh) delete seen[id]; }
      g.ui.clearTutorialQueue(); g.ui.popupT = 0; g.ui.popup.classList.remove('show');
      window.T.at(75, -1.4);
      const log = window.__ptTut = [];
      const title = () => g.ui.popup.querySelector('.p-title').textContent;
      const update = g.ui.update.bind(g.ui);
      g.ui.update = (dt) => {
        update(dt);
        if (!g.ui.popup.classList.contains('show')) return;
        const last = log[log.length - 1];
        if (last && last.title === title()) last.sec += dt; else log.push({ title: title(), sec: dt, d: g.player.body.s });
      };
    });
    await ctx.eval(() => window.__pt.key('KeyW', 'keydown'));
    await sleep(4400);
    await ctx.eval(() => window.__pt.key('KeyW', 'keyup'));
    await sleep(24000);
    const log = await ctx.eval(() => window.__ptTut.map((e) => ({ title: e.title, sec: +e.sec.toFixed(2), d: e.d == null ? null : +e.d.toFixed(1) })));
    return { shown: log, target: 'Lid Knight, slide, snacks, treat, cat and trampoline in turn, each for at least 2.5 s' };
  },

  // Nobu's on-screen height at each arena centre, whether the far edge and corners are in frame from
  // the near edge, and whether the Bird's rear-up clears the boss bar (plan B3).
  async framing(ctx) {
    const out = {};
    const HALF = { 1: 11, 2: 11.2, 3: 12.5, 4: 11, 5: 11.7 }; // arena half-widths used by each boss
    for (const level of [1, 2, 3, 4, 5]) {
      await ctx.go(level, { god: true });
      await ctx.boss();
      out[`boss${level}`] = {};
      for (const [vw, vh] of [[960, 540], [1024, 768]]) {
        await ctx.page.setViewportSize({ width: vw, height: vh });
        await sleep(300);
        const m = await ctx.eval((half) => {
          const g = window.__nobu, p = g.player, pt = window.__pt;
          const inFrame = (q) => !q.behind && q.x >= 0 && q.x <= window.innerWidth && q.y >= 0 && q.y <= window.innerHeight;
          /** Screen-space box of an object's world bounding box. */
          const screenBox = (obj) => {
            obj.updateMatrixWorld(true);
            const b = pt.box(obj);
            let top = Infinity, bottom = -Infinity;
            for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
              const q = pt.project(x, y, z); top = Math.min(top, q.y); bottom = Math.max(bottom, q.y);
            }
            return { top, bottom, heightM: b.max.y - b.min.y };
          };
          const stand = (x, z) => { p.pos.set(x, p.pos.y, z); p.vel.set(0, 0, 0); p.root.position.copy(p.pos); g.camera.snap(p); };
          const y0 = p.pos.y;
          stand(0, 0);
          const body = { top: pt.project(0, y0 + 1.3, 0).y, foot: pt.project(0, y0, 0).y };
          const model = screenBox(p.root);
          stand(0, half - 1);
          const far = { edge: pt.project(0, y0, -half), left: pt.project(-half, y0, -half), right: pt.project(half, y0, -half) };
          const bar = document.getElementById('bossbar').getBoundingClientRect();
          return { nobuBodyPct: +((body.foot - body.top) / window.innerHeight * 100).toFixed(2),
            nobuModelPct: +((model.bottom - model.top) / window.innerHeight * 100).toFixed(2), nobuModelHeightM: +model.heightM.toFixed(2),
            fromNearEdge: { farEdge: inFrame(far.edge), farLeft: inFrame(far.left), farRight: inFrame(far.right), farEdgeY: Math.round(far.edge.y), farLeftX: Math.round(far.left.x) },
            bossBarBottom: Math.round(bar.bottom), fov: g.camera.cam.fov };
        }, HALF[level]);
        out[`boss${level}`][`${vw}x${vh}`] = m;
        await ctx.eval(() => { const g = window.__nobu; g.player.pos.set(0, g.player.pos.y, 8); g.camera.snap(g.player); });
        await ctx.shot(`framing-boss${level}-${vw}x${vh}`);
      }
      await ctx.page.setViewportSize({ width: 960, height: 540 });
      if (level === 1) {
        // The Bird's dive wind-up: it rears up to y 8.5 above its target. Is all of it below the boss bar?
        await ctx.eval(() => { const g = window.__nobu; g.player.pos.set(0, g.player.pos.y, 4); g.camera.snap(g.player); g.session.boss.beginAttack('aim'); });
        await sleep(800);
        out.birdRearUp = await ctx.eval(() => {
          const g = window.__nobu, pt = window.__pt, boss = g.session.boss;
          const b = pt.box(boss.obj);
          let top = Infinity;
          for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) top = Math.min(top, pt.project(x, b.max.y, z).y);
          const bar = document.getElementById('bossbar').getBoundingClientRect();
          return { state: boss.state, bossY: +boss.pos.y.toFixed(2), bossTopPx: Math.round(top), bossCentrePx: Math.round(pt.project(boss.pos.x, boss.pos.y + 1, boss.pos.z).y), bossBarBottomPx: Math.round(bar.bottom),
            bossBarGhost: document.getElementById('bossbar').classList.contains('ghost'), bossBarOpacity: +getComputedStyle(document.getElementById('bossbar')).opacity };
        });
        out.birdRearUp.shot = await ctx.shot('framing-bird-rear-up');
      }
    }
    out.target = 'Nobu (nobuModelPct, the visible model) at least 7.5% of the viewport height at the arena centre; far edge and corners in frame from the near edge; the Bird rear-up below the boss bar, or the bar see-through while the Bird is behind it';
    return out;
  },

  // Landing-marker screenshots: the Bird's cone drops on its arena, and Titan leg stomps in the dark (B1, B2).
  async markers(ctx) {
    const out = {};
    await ctx.go(1, { god: true });
    await ctx.boss();
    out.birdBomb = await ctx.eval(async () => {
      const g = window.__nobu, s = g.session;
      g.player.pos.set(0, 0.02, 4); g.camera.snap(g.player);
      for (const [x, z] of [[-4, 0], [0, -2], [4, 1], [-2, 5], [3, 6]]) s.projectiles.dropCone(x, 0, z, 1.2, 1.4);
      await window.T.sleep(60);
      return s.projectiles.list.filter((pr) => pr.marker).map((pr) => ({ rim: +pr.marker.userData.rim.material.opacity.toFixed(2), shadow: +pr.marker.material.opacity.toFixed(2) }));
    });
    out.birdBombShot = await ctx.shot('markers-bird-first-frame');
    await ctx.go(4, { god: true });
    await ctx.boss();
    out.titanStomp = await ctx.eval(async () => {
      const g = window.__nobu, s = g.session, boss = s.boss;
      g.player.pos.set(0, 0.02, 6); g.camera.snap(g.player);
      boss.arena.darken();
      for (const [x, z] of [[-3, 2], [0, 4], [3, 1]]) s.projectiles.falling(x, z, { kind: 'leg', r: 1.2, delay: 1.2 });
      await window.T.sleep(60);
      return { darkT: +boss.arena.darkT.toFixed(1), sun: g.stage.sun?.intensity,
        markers: s.projectiles.list.filter((pr) => pr.marker).map((pr) => +pr.marker.userData.rim.material.opacity.toFixed(2)) };
    });
    out.titanStompShot = await ctx.shot('markers-titan-lights-out');
    return out;
  },

  // Bounding boxes at 960x540: title logo against menu, banner against tutorial card (plan A5).
  async layout(ctx) {
    const out = {};
    const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    for (const [vw, vh] of [[960, 540], [1280, 720]]) {
      await ctx.page.setViewportSize({ width: vw, height: vh });
      await ctx.eval(() => { const g = window.__nobu; g.toTitle?.(); g.titleMenu = true; g.titleSel = 0; g._drawTitleMenu(); });
      await sleep(300);
      const boxes = await ctx.eval(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
        return { logo: r(document.querySelector('.title-logo')), menu: r(document.querySelector('.title-menu .menu')) };
      });
      out[`title${vw}x${vh}`] = { logoBottom: Math.round(boxes.logo.bottom), menuTop: Math.round(boxes.menu.top), overlap: hit(boxes.logo, boxes.menu) };
      await ctx.shot(`layout-title-${vw}x${vh}`);
    }
    await ctx.page.setViewportSize({ width: 960, height: 540 });
    await ctx.go(1, { god: true });
    await ctx.eval(() => {
      const g = window.__nobu;
      if (window.__ptSave) window.__ptSave.data.tutorials = {};
      g.ui.tutorial('stampede'); g.ui.banner('RUN! HOLD ↓ / S TOWARD THE CAMERA', '', 4);
    });
    await sleep(900);
    const boxes = await ctx.eval(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
      const range = document.createRange(); range.selectNodeContents(document.querySelector('.banner'));
      return { banner: r(range), popup: r(document.querySelector('.popup')) };
    });
    out.bannerOverPopup = { overlap: hit(boxes.banner, boxes.popup), popupTop: Math.round(boxes.popup.top), bannerBottom: Math.round(boxes.banner.bottom) };
    await ctx.shot('layout-banner-popup-960x540');
    return out;
  },
};

/** Rise, air time and horizontal air distance of the first airborne stretch in a sample list. */
function airStats(samples) {
  let start = -1, end = -1;
  for (let i = 1; i < samples.length; i++) {
    if (start < 0 && samples[i - 1].grounded && !samples[i].grounded) start = i - 1;
    else if (start >= 0 && !samples[i - 1].grounded && samples[i].grounded) { end = i; break; }
  }
  if (start < 0 || end < 0) return { error: 'no complete jump in the samples', samples: samples.length };
  const a = samples[start], b = samples[end];
  let peak = a.y, topSpeed = 0;
  for (let i = start; i <= end; i++) { peak = Math.max(peak, samples[i].y); topSpeed = Math.max(topSpeed, samples[i].speed); }
  return { riseM: round(peak - a.y), airSec: round(b.t - a.t), airDistM: round(Math.hypot(b.x - a.x, b.z - a.z)), topSpeed: round(topSpeed), landSpeed: round(b.speed) };
}

main();
