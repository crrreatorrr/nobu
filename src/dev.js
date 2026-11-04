// Dev-only playtest helpers (loaded by main.js when running `npm run dev`).
// In the console: await T.go(1) starts level 1; T.warp(120) jumps to distance 120; T.boss() skips to the boss.
import { gatedCountables } from './game/gateRules.js';

export function installDevTools(game) {
  const checkGates = () => {
    const violations = gatedCountables(game.session?.stage?.entities || []);
    for (const { entity, gate } of violations) console.error('gated countable', entity, gate);
    return violations;
  };
  const startLevel = game.startLevel.bind(game);
  game.startLevel = async (...args) => {
    const result = await startLevel(...args);
    checkGates();
    return result;
  };
  const T = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    down(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); },
    up(code) { window.dispatchEvent(new KeyboardEvent('keyup', { code })); },
    async hold(code, ms) { T.down(code); await T.sleep(ms); T.up(code); },
    async tap(code) { T.down(code); await T.sleep(50); T.up(code); await T.sleep(30); },
    async skipTalk() { for (let i = 0; i < 12 && game.ui.talking; i++) { await T.tap('Enter'); await T.sleep(250); } },
    async go(level) {
      const done = game.startLevel(level);
      for (let i = 0; i < 40 && !game.ui.talking; i++) await T.sleep(100);
      await T.skipTalk();
      await done;
      return T.info();
    },
    // await T.props(): H04a lifecycle strip. T.at(10/26/55/76/96) visits each prop;
    // T.die() tests the normal checkpoint rollback while a prop is moving.
    async props() {
      const [{ Session }, { makeKit, makeTrack, turtle }] = await Promise.all([
        import('./game/session.js'), import('./levels/kit.js'),
      ]);
      await game.ui.fade(1); game.ui.clearScreen();
      game.session?.dispose();
      const session = new Session(game, 1);
      session.def = { ...session.def, name: 'Gameplay prop strip', build(g, stage, tickets) {
        const track = makeTrack(stage, turtle([0, 0, 0], [[140, 0, 0]]));
        const k = makeKit(g, stage, tickets, track);
        k.floor(-18, 96); k.floor(120, 140); k.walls([[-18, 4.3, 4.3], [140, 4.3, 4.3]]);
        k.backstop(-18); k.backstop(140);
        k.spinDrum(10, { y: 3.2, crumble: [1] });
        k.tut(5, 'spindrum'); k.snacks(3, 0, 18);
        k.platform(0, 1, 20); k.platform(0, 2, 22); k.platform(0, 2.75, 24);
        k.zipline(0, 4, 26, 0, 5, 44); k.platform(0, 3.75, 44, 3, 4);
        k.tut(21, 'zipline'); k.snacks(3, 0, 50);
        k.toaster(0, 0, 55); k.platform(0, 4.2, 60, 3, 3); k.tut(52, 'toaster');
        k.toaster(-3, 0, 64, { skin: 'valve' });
        k.market(0, 3.2, 76, { group: 'b' }); k.market(0, 3.2, 80, { group: 'b', invert: true });
        k.ticker(3, 2, 73, { group: 'b' }); k.tut(70, 'market'); k.snacks(3, 0, 90);
        k.rugPull(96, 120); k.cat(0, 0, 105); k.tut(93, 'rugpull');
        return { spawn: k.W(0, 0, 1), facing: track.yaw(1), camera: { mode: 'track', track, height: 4.3, dist: 8.6, ahead: 5.5 } };
      } };
      game.session = session; game.state = 'play'; game.flyingMasks.length = 0;
      const done = session.startLevel();
      for (let i = 0; i < 40 && !game.ui.talking; i++) await T.sleep(100);
      await T.skipTalk(); await done;
      return T.info();
    },
    // H04c: T.at(18/80/120/155/184) visits chase, detour, dark, side and rise.
    async environment() {
      const [{ Session }, { buildEnvironmentStrip }] = await Promise.all([
        import('./game/session.js'), import('./levels/environmentStrip.js'),
      ]);
      await game.ui.fade(1); game.ui.clearScreen(); game.session?.dispose();
      const session = new Session(game, 1);
      session.def = { ...session.def, name: 'Environment strip', build: buildEnvironmentStrip };
      game.session = session; game.state = 'play'; game.flyingMasks.length = 0;
      const done = session.startLevel();
      for (let i = 0; i < 40 && !game.ui.talking; i++) await T.sleep(100);
      await T.skipTalk(); await done;
      return T.info();
    },
    die() { game.player.die('fall'); return T.info(); },
    // await T.gates(): optional helper strip; T.armPity() activates its dormant checkpoint.
    async gates() {
      const [{ Session }, { buildGatedTestStrip }] = await Promise.all([
        import('./game/session.js'), import('./levels/gatedTestStrip.js'),
      ]);
      await game.ui.fade(1); game.ui.clearScreen(); game.session?.dispose();
      const session = new Session(game, 1);
      session.def = { ...session.def, name: 'Gated helper strip', build: buildGatedTestStrip };
      game.session = session; game.state = 'play'; game.flyingMasks.length = 0;
      let finished = false;
      const done = session.startLevel().finally(() => { finished = true; });
      while (!finished) {
        if (game.ui.talking) await T.skipTalk();
        else await T.sleep(100);
      }
      await done;
      checkGates(); return T.info();
    },
    armPity() { return game.session?.stage?.pityTestSpot?.arm() ?? false; },
    checkGates,
    // await T.boxes(); T.boxAt('P6'); T.gauntletCheck(); T.die() tests normal rollback.
    async boxes({ teach = false } = {}) {
      const [{ Session }, { buildBoxDevStrip }] = await Promise.all([
        import('./game/session.js'), import('./levels/boxDevStrip.js'),
      ]);
      await game.ui.fade(1); game.ui.clearScreen(); game.session?.dispose();
      const session = new Session(game, 1);
      session.boxDev = true;
      session.def = { ...session.def, name: 'Box timing strip', build: (g, stage, tickets) => buildBoxDevStrip(g, stage, tickets, { teach }) };
      // Exercise post-Bird patterns without modifying the save or granting moves outside this strip.
      if (!game.player._boxDevAbilities) {
        const get = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(game.player), 'abilities').get;
        Object.defineProperty(game.player, 'abilities', { configurable: true, get() {
          return game.session?.boxDev ? { ...get.call(this), glide: true } : get.call(this);
        } });
        game.player._boxDevAbilities = true;
      }
      // The strip is for mechanics, with no Ticket/1UP awards or results submission.
      session.addTickets = () => {}; session.addLife = () => {};
      game.session = session; game.state = 'play'; game.flyingMasks.length = 0;
      const done = session.startLevel();
      for (let i = 0; i < 40 && !game.ui.talking; i++) await T.sleep(100);
      await T.skipTalk(); await done;
      return game.stage.boxStrip.map(({ id, d0 }) => ({ id, d0 }));
    },
    boxAt(id) {
      const section = game.stage?.boxStrip?.find(p => p.id === id || p.id === id + '-teach');
      if (!section) throw new Error('Start T.boxes() and select a pattern id');
      T.at(section.d0 - 3);
      for (const entity of game.stage.entities) entity.onRespawn?.();
      return T.info();
    },
    async gauntletCheck() {
      const { validatePattern } = await import('./levels/gauntletMath.js');
      const problems = (game.stage?.timedPatterns || []).flatMap(p => validatePattern(p).map(issue => ({ id: p.id, ...issue })));
      for (const problem of problems) console.warn('[gauntlet]', problem);
      return problems;
    },
    warp(d, x = 0) { const p = game.player; p.pos.set(x, 0.5, -d); p.vel.set(0, 0, 0); game.camera.snap(p); return T.info(); },
    async boss() {
      game.session.reachBossGate();
      for (let i = 0; i < 60 && !game.ui.talking; i++) await T.sleep(100);
      await T.skipTalk();
      await T.sleep(500);
      return T.info();
    },
    // render a frame and save it to tools/_raw/shots/<name>.jpg
    async shot(name = 'shot') {
      game.render();
      const url = game.renderer.domElement.toDataURL('image/jpeg', 0.72);
      await fetch('/__shot?n=' + name, { method: 'POST', body: url });
      return name;
    },
    // place Nobu at track distance d (lateral x), facing forward
    at(d, x = 0) {
      const tr = game.stage.track, p = game.player;
      const g = tr.groundAt(d, x);
      const w = tr.toWorld(d, x, 0);
      p.pos.set(w.x, (g ? g.y : tr.heightAt(d)) + 0.05, w.z);
      p.vel.set(0, 0, 0);
      p.facing = p.targetFacing = tr.yaw(d);
      p.idleTime = 0;
      p.body.s = d; p.body.u = x;
      game.camera.snap(p);
      return T.info();
    },
    info() {
      const p = game.player, s = game.session;
      return { state: game.state, pos: p.pos.toArray().map((v) => +v.toFixed(2)), mode: p.mode, grounded: p.body.grounded, dead: p.dead,
        lives: game.ui && (s ? undefined : undefined), mask: s?.mask, boss: s?.boss ? { hp: s.boss.hp, phase: s.boss.phase, state: s.boss.state } : null };
    },
  };
  window.T = T;
  // Browsers pause requestAnimationFrame in hidden tabs; keep the game ticking for automated playtests.
  setInterval(() => { if (document.hidden && game.ui) game.loop(performance.now(), true); }, 16);
  import('./art/assets.js').then((m) => { window.__assets = m.Assets; });
}
