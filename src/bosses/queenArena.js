import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { CandlePillar } from './arena.js';
import { audio } from '../audio/audio.js';
import { toon } from '../player/nobuPrims.js';
import { textTexture } from '../entities/fx.js';
import { QUEEN_TICKER_TEXT } from '../story/script.js';

export const QUEEN_OUTER = Object.freeze(
  Array.from({ length: 12 }, (_, i) =>
    Object.freeze([7.5 * Math.cos((i * Math.PI) / 6), 7.5 * Math.sin((i * Math.PI) / 6)])
  )
);
export const QUEEN_INNER = Object.freeze(
  Array.from({ length: 4 }, (_, i) =>
    Object.freeze([
      3.5 * Math.cos(Math.PI / 4 + (i * Math.PI) / 2),
      3.5 * Math.sin(Math.PI / 4 + (i * Math.PI) / 2)
    ])
  )
);

export class QueenCandle extends CandlePillar {
  constructor(stage, x, z, index, inner = false) {
    super(stage, x, z, { y: 1, size: inner ? 2.2 : 2.6, depth: 12 });
    this.index = index;
    this.inner = inner;
    this.angle = Math.atan2(z, x);
    this.glow = new THREE.Mesh(
      new THREE.RingGeometry(this.size * 0.3, this.size * 0.47, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xffe9a0,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        fog: false
      })
    );
    this.glow.position.y = 0.025;
    this.glow.renderOrder = 3;
    this.obj.add(this.glow);
  }
  // The controller drives an analytic wave so the direction tell is exactly
  // half a second ahead; collision deltas still use the shared moving Solid.
  update() {}
  place(top, color, glow = 0) {
    this.pos.y = top;
    this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, top - this.depth, this.pos.z, this.size, this.depth, this.size);
    this.mesh.material.color.setHex(color);
    this.glow.material.opacity = glow;
  }
}

export class QueenRing extends Entity {
  constructor(stage) {
    super(stage, 0, 0, 0);
    this.alwaysActive = true;
    this.interactive = false;
    this.tiles = [];
    const tile = (x, z, w, d) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.025, 0.3, d - 0.025), toon(0x74526f));
      mesh.position.set(x, -0.15, z);
      this.obj.add(mesh);
      const solid = stage.world.addBox(x, -0.3, z, w, 0.3, d, { kind: 'moving', ref: this });
      this.tiles.push({ mesh, solid, elapsed: 0 });
    };
    for (const sign of [-1, 1]) {
      for (let i = 0; i < 10; i++) tile(-13 + (i + 0.5) * 2.6, sign * 11.75, 2.6, 2.5);
      for (let i = 0; i < 8; i++) tile(sign * 11.75, -10.5 + (i + 0.5) * 2.625, 2.5, 2.625);
    }
    this.reset();
  }
  update(dt) {
    const p = this.player;
    this.hotT = Math.max(0, this.hotT - dt);
    for (const tile of this.tiles) {
      if (this.crumble && !tile.elapsed && p.body.ground === tile.solid && p.body.grounded)
        tile.elapsed = Number.EPSILON;
      if (tile.elapsed) {
        tile.elapsed += dt;
        if (tile.elapsed >= 0.5) {
          tile.solid.enabled = false;
          tile.mesh.position.y = -0.15 - Math.min(8, (tile.elapsed - 0.5) * 15);
        }
        if (tile.elapsed >= 5.5) {
          tile.elapsed = 0;
          tile.solid.enabled = true;
          tile.mesh.position.y = -0.15;
        }
      }
      tile.mesh.material.emissive.setHex(
        this.hotT > 0 || (tile.elapsed > 0 && tile.elapsed < 0.5 && Math.floor(tile.elapsed * 16) % 2)
          ? 0x992244
          : 0
      );
      if (this.hotT > 0 && p.body.ground === tile.solid && p.body.grounded) p.hurt('angel', p.pos.x, p.pos.z);
    }
  }
  reset() {
    this.hotT = 0;
    this.crumble = false;
    for (const t of this.tiles) {
      t.elapsed = 0;
      t.solid.enabled = true;
      t.mesh.position.y = -0.15;
      t.mesh.material.emissive.setHex(0);
    }
  }
  onRespawn() {
    this.reset();
  }
}

export class QueenArena extends Entity {
  constructor(stage) {
    super(stage, 0, 0, 0);
    this.alwaysActive = true;
    this.interactive = false;
    this.ring = stage.add(new QueenRing(stage));
    this.pillars = [...QUEEN_OUTER, ...QUEEN_INNER].map(([x, z], i) =>
      stage.add(new QueenCandle(stage, x, z, i, i >= 12))
    );
    this.tickerTextures = Object.fromEntries(
      Object.entries(QUEEN_TICKER_TEXT).map(([kind, label]) => {
        const texture = textTexture(label, {
          color: kind === 'dump' ? '#ff5270' : '#4aff8a',
          w: 1024,
          h: 256,
          size: 160
        });
        texture.wrapS = THREE.RepeatWrapping;
        return [kind, texture];
      })
    );
    this.tickers = [];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.2, 0.15),
        new THREE.MeshBasicMaterial({ color: 0x160d22, fog: false })
      );
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.9, 1.1),
        new THREE.MeshBasicMaterial({ map: this.tickerTextures.pump, transparent: true, fog: false })
      );
      panel.position.z = 0.081;
      mesh.add(panel);
      mesh.userData.panel = panel;
      mesh.position.set(Math.cos((i * Math.PI) / 4) * 15, 3, Math.sin((i * Math.PI) / 4) * 15);
      mesh.lookAt(0, 3, 0);
      stage.scene.add(mesh);
      this.tickers.push(mesh);
    }
    this.setPhase(1);
  }
  nearest(position, { outer = false, inner = false } = {}) {
    let best = null,
      distance = Infinity;
    for (const p of this.pillars) {
      if ((outer && p.inner) || (inner && !p.inner)) continue;
      const d = (p.pos.x - position.x) ** 2 + (p.pos.z - position.z) ** 2;
      if (d < distance) {
        distance = d;
        best = p;
      }
    }
    return best;
  }
  setPhase(phase) {
    this.phase = phase;
    this.reset();
  }
  setTicker(kind) {
    this.tickerKind = kind;
    for (const ticker of this.tickers) ticker.userData.panel.material.map = this.tickerTextures[kind];
  }
  beginCrash(player, tell) {
    const outer = this.nearest(player.pos, { outer: true });
    const inner = this.nearest(outer.pos, { inner: true });
    this.crash = {
      elapsed: 0,
      tell,
      pillars: [
        outer,
        inner,
        this.pillars[12 + ((inner.index - 12 + 2) % 4)],
        this.pillars[(outer.index + 6) % 12]
      ]
    };
    audio.play('blipLow');
  }
  beginLiquidation(player) {
    this.safe = this.nearest(player.pos, { outer: true });
    const first = (this.safe.index + 6) % 12;
    this.liquidation = {
      elapsed: 0,
      order: Array.from({ length: 12 }, (_, i) => (first + i) % 12).filter((i) => i !== this.safe.index)
    };
    return this.safe;
  }
  beginUltimate(player, tell, phase) {
    const safe = this.nearest(player.pos);
    const others = this.pillars
      .filter((p) => p !== safe)
      .sort((a, b) => a.pos.distanceToSquared(safe.pos) - b.pos.distanceToSquared(safe.pos));
    this.ultimate = { elapsed: 0, tell, safe, decoys: others.slice(0, phase - 1) };
    return safe;
  }
  endUltimate() {
    this.ultimate = null;
    this.ring.hotT = 0;
  }
  update(dt) {
    this.clock += dt;
    for (const texture of Object.values(this.tickerTextures)) texture.offset.x += dt * 0.08;
    const player = this.player;
    if (!player.dead && player.pos.y < -4) player.die('puff');
    const period = [0, 6, 4.5, 3.8, 3.8][this.phase],
      w = (2 * Math.PI) / period;
    if (this.crash) this.crash.elapsed += dt;
    if (this.liquidation) this.liquidation.elapsed += dt;
    if (this.ultimate) this.ultimate.elapsed += dt;
    for (const p of this.pillars) {
      let height = this.phase >= 4 ? 1.5 : 1 + 2 * Math.sin(w * this.clock + p.angle);
      const rising = Math.cos(w * (this.clock + 0.5) + p.angle) >= 0;
      let color = rising ? 0x4aff8a : 0xff3a4a,
        glow = 0,
        bounded = false;
      if (this.phase < 4 && p.rising !== undefined && rising !== p.rising && this.nearest(player.pos) === p)
        audio.play(rising ? 'tick' : 'blipLow');
      p.rising = rising;
      const c = this.crash;
      if (c?.pillars.includes(p)) {
        color = 0xff3a4a;
        if (c.elapsed >= c.tell && c.elapsed < c.tell + 3) {
          height = -6;
          bounded = true;
        } else if (c.elapsed < c.tell) glow = 0.4 + 0.4 * Math.sin(c.elapsed * 20);
      }
      const l = this.liquidation;
      if (l && !p.inner) {
        const slot = l.order.indexOf(p.index),
          droppedAt = (slot * 0.45) / this.speed;
        if (p === this.safe) {
          color = 0x4aff8a;
          glow = 0.9;
        } else if (slot >= 0 && l.elapsed >= droppedAt && l.elapsed < droppedAt + 2.5) {
          height = -6;
          bounded = true;
          color = 0xff3a4a;
        } else if (slot >= 0 && droppedAt - l.elapsed < 0.5) {
          color = 0xff3a4a;
          glow = 0.6;
        }
      }
      const u = this.ultimate;
      if (u) {
        const t = u.elapsed - u.tell;
        if (t < 0) {
          color = 0xff3a4a;
          glow = Math.floor(u.elapsed * 10) % 2 ? 0.9 : 0.1;
        } else {
          bounded = true;
          const drop = (p.index / 15) * 2;
          if (t >= drop) {
            height = -6;
            bounded = true;
          }
          if (p === u.safe || u.decoys.includes(p)) {
            height = p === u.safe || t < 2.8 ? 2.5 : -6;
            color = 0x4aff8a;
            glow = p === u.safe ? 0.95 : Math.floor(t * 10) % 2 ? 0.85 : 0.08;
          }
        }
      }
      if (p.wasOverridden && !bounded) p.returning = true;
      const difference = height - p.pos.y;
      if (bounded || p.returning) {
        height = p.pos.y + THREE.MathUtils.clamp(difference, -9 * dt, 9 * dt);
        if (!bounded && Math.abs(difference) <= 9 * dt) p.returning = false;
      }
      p.wasOverridden = bounded;
      p.place(height, color, glow);
    }
    if (this.crash?.elapsed >= this.crash?.tell + 4) this.crash = null;
    if (this.liquidation?.elapsed > (11 * 0.45) / this.speed + 3.5) this.liquidation = null;
  }
  get speed() {
    return [0, 1.2, 1.4, 1.6, 1.7][this.phase];
  }
  reset() {
    this.clock = 0;
    this.crash = null;
    this.liquidation = null;
    this.ultimate = null;
    this.safe = null;
    this.ring.reset();
    this.setTicker(this.phase >= 4 ? 'dump' : 'pump');
    this.ring.crumble = this.phase >= 3;
    for (const p of this.pillars) {
      p.rising = undefined;
      p.wasOverridden = false;
      p.returning = false;
      p.place(this.phase >= 4 ? 1.5 : 1 + 2 * Math.sin(p.angle), 0x4aff8a);
    }
  }
  onRespawn() {
    this.reset();
  }
}

export function buildQueenArena(stage) {
  const arena = stage.add(new QueenArena(stage));
  stage.queenArena = arena;
  return { queenArena: arena, pillars: arena.pillars, ring: arena.ring, tickers: arena.tickers };
}
