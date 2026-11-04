import * as THREE from 'three';
import { DEATH_KEY, appendDeath, appendSections, readRecords, isDeath, deathCounts, sectionFor, advanceTimer } from './tuningData.js';

export function installTuningTools(game, T) {
  if (!import.meta.env.DEV) return;
  let storage;
  try { storage = globalThis.localStorage; } catch { /* Storage may be disabled. */ }
  let enabled = new URLSearchParams(globalThis.location?.search).has('heatmap');
  let overlay = null, material = null;
  let currentStage = null;
  const runs = new WeakMap();
  const runFor = (session) => {
    if (!runs.has(session)) runs.set(session, { times: Object.create(null), finished: false });
    return runs.get(session);
  };
  const rows = () => readRecords(storage, DEATH_KEY).filter(isDeath);
  const clearOverlay = () => {
    overlay?.removeFromParent(); overlay = null;
    material?.map?.dispose();
    material?.dispose(); material = null;
  };
  const redraw = () => {
    clearOverlay();
    const session = game.session, stage = session?.stage, track = stage?.track;
    currentStage = stage;
    if (!enabled || !track || session.phase !== 'level') return;
    overlay = new THREE.Group(); overlay.name = 'dev-death-heatmap';
    const pixels = new Uint8Array(16 * 16 * 4);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.hypot(x - 7.5, y - 7.5) <= 7.5 ? 255 : 0;
    }
    const map = new THREE.DataTexture(pixels, 16, 16); map.needsUpdate = true;
    material = new THREE.SpriteMaterial({ map, color: 0xff0000, opacity: 0.5, transparent: true, depthWrite: false });
    for (const row of rows()) {
      if (String(row.level) !== String(session.level)) continue;
      const dot = new THREE.Sprite(material);
      dot.position.copy(track.toWorld(row.d, row.x, 0));
      dot.position.y = (track.groundAt(row.d, row.x)?.y ?? track.heightAt(row.d)) + 0.2;
      dot.scale.set(0.4, 0.4, 0.4); overlay.add(dot);
    }
    stage.scene.add(overlay);
  };
  Object.assign(T, {
    heatmap(show = true) { enabled = !!show; redraw(); return enabled; },
    deaths(level = game.session?.level) {
      return deathCounts(rows(), level, game.session?.level === level ? game.session.stage?.track?.sections : []);
    },
    clearDeaths() {
      try { storage?.removeItem(DEATH_KEY); } catch { /* Storage may be disabled. */ }
      redraw();
    },
  });
  game.devTuning = {
    death(session, cause) {
      const track = session.stage?.track, player = game.player;
      if (!track) return;
      const point = track.project(player.pos.x, player.pos.z);
      appendDeath(storage, { level: session.level, d: point.s, x: point.u, cause, t: Date.now(),
        section: sectionFor(session.stage, player, point.s)?.name });
      redraw();
    },
    update(session, dt) {
      if (currentStage !== session.stage) redraw();
      const run = runFor(session);
      if (!run.finished) advanceTimer(session, game.player, dt, run.times);
    },
    gate(session) {
      const run = runFor(session);
      if (run.finished) return;
      run.finished = true;
      const deaths = deathCounts(rows(), session.level, session.stage?.track?.sections);
      const sections = Object.fromEntries([...new Set([...Object.keys(run.times), ...Object.keys(deaths)])]
        .map((name) => [name, { seconds: run.times[name] || 0, deaths: deaths[name] || 0 }]));
      console.table(sections);
      appendSections(storage, { level: session.level, t: Date.now(), sections });
    },
  };
  const startLevel = game.startLevel.bind(game);
  game.startLevel = async (...args) => {
    const result = await startLevel(...args);
    redraw(); return result;
  };
  redraw();
}
