import * as THREE from 'three';
import { ZippedBackpack, BlueSphere, Cat, Trampoline } from './breakables.js';
import { rollMystery } from '../game/rng.js';
import { canvasTex } from '../core/util.js';
import { audio } from '../audio/audio.js';
import { MYSTERY_SURPRISE } from '../story/script.js';
import { MYSTERY_RAW_MAX } from '../config/tickets.js';

let questionMat;
const questionGeo = new THREE.PlaneGeometry(0.7, 0.7);
function decal() {
  questionMat ||= new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#7a3fd0'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 96px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 64, 69);
  }), transparent: true });
  return new THREE.Mesh(questionGeo, questionMat);
}
export class MysteryBackpack extends ZippedBackpack {
  constructor(stage, x, y, z, { slot, tramp = false } = {}) {
    super(stage, x, y, z); this.kind = 'mystery'; this.maxHits = this.hits = 1;
    this.tickets = 0; this.authoredTickets = 0; // Budget counts the separate 9-raw Mystery maximum.
    this.slot = slot; this.allowTramp = tramp; this.spawned = [];
    this.tags.forEach((t) => { t.visible = false; });
    const q = decal(); q.position.set(0, 0.56, 0.39); this.model.add(q);
    // Until H12 seeds the session at entry, initialize once, never once per break.
    this.session.runSeed ??= (Math.random() * 4294967296) >>> 0;
  }
  update(dt) {
    // Zipped's tutorial refers to three bites; this object always opens in one.
    this.t += dt; this.model.position.y = Math.sin(this.t * 2) * 0.06;
  }
  break() {
    if (!this.markBroken()) return;
    this.hide(); audio.play('break');
    let result = rollMystery(this.session.runSeed, this.session.level, this.slot);
    if (result === 'tramp' && !this.allowTramp) result = 'sphere';
    this.result = result;
    const { x, y, z } = this.pos;
    this.fx.burst(x, y + 0.6, z, { count: 16, colors: [0x7a3fd0, 0xffffff], speed: 4 });
    if (result === 'tickets') this.game.tickets.spawnFlying(x, y + 1, z, MYSTERY_RAW_MAX, 'mystery');
    else if (result === 'oneUp') { this.session.addLife(1); this.fx.burst(x, y + 1, z, { count: 20, colors: [0xffd23f, 0xffffff], speed: 5 }); }
    else {
      const Cls = result === 'cat' ? Cat : result === 'tramp' ? Trampoline : BlueSphere;
      // Mystery's only Ticket outcome is its capped 9-raw roll. A normal trampoline
      // defaults to 10 untagged raw Tickets, which would exceed that declared budget.
      const e = new Cls(this.stage, x, y, z, result === 'tramp' ? { tickets: 0 } : undefined); e.countable = false;
      this.stage.add(e); this.spawned.push(e);
      if (result === 'cat') { e.arm(); e.update(0); this.game.ui.banner(MYSTERY_SURPRISE.title, MYSTERY_SURPRISE.sub, 1.5); }
    }
  }
  onRestore() {
    this.hits = this.maxHits;
    for (const e of this.spawned) { e.hide(); this.stage.remove?.(e); }
    this.spawned.length = 0;
    this.tags.forEach((t) => { t.visible = false; });
  }
  onRespawn() {} // Session's Breakable.restore owns checkpoint-sequence rollback.
}
