// L3-only controllers: the shared kit and Session keep their existing contracts.
import * as THREE from 'three';
import { Entity, Breakable } from '../entities/entity.js';
import { ConedDog } from '../entities/dogs.js';
import { save } from '../core/save.js';
import { finishSessionChain, removeChainDrops } from '../game/chain.js';
import { audio } from '../audio/audio.js';

export class ReversingFactoryBelt extends Entity {
  constructor(stage, span, scroller, pos) {
    super(stage, ...pos.toArray());
    this.span = span; this.scroller = scroller; this.originalScroll = scroller.update.bind(scroller);
    this.phase = 0; this.direction = 1; this.warning = false; this.beepT = 0;
    this.interactive = false; this.alwaysActive = true;
    this.lamp = new THREE.Mesh(new THREE.SphereGeometry(.22,8,6), new THREE.MeshBasicMaterial({color:0xffb020}));
    this.lamp.position.y = 2.3; this.obj.add(this.lamp); this.lamp.visible = false;
    scroller.update = dt => this.originalScroll(dt * this.direction);
  }
  update(dt) {
    if (this.session?.busy || this.player?.frozen || this.player?.dead) return;
    this.phase += dt;
    while (this.phase >= 4) { this.phase -= 4; this.direction *= -1; this.span.conveyor.z *= -1; }
    this.warning = this.phase >= 3; this.lamp.visible = this.warning;
    this.lamp.scale.setScalar(1 + .25 * Math.sin(this.phase * 24));
    if (this.warning && (this.player.body.s ?? 0) >= 136 && (this.player.body.s ?? 0) <= 174) {
      this.beepT -= dt;
      if (this.beepT <= 0) { audio.play('beep', this.phase % .4 < .2 ? 1 : .65); this.beepT = .2; }
    } else this.beepT = 0;
  }
  onRespawn() { this.span.conveyor.z = 4; this.direction = 1; this.phase = 0; this.warning = false; this.lamp.visible = false; }
}

export function scopeFactoryRoller(roller, rugs) {
  roller.press = () => {
    if (!roller.markBroken()) return;
    roller.hide(); audio.play('switch');
    roller.fx.burst(roller.pos.x,roller.pos.y+.5,roller.pos.z,{count:14,colors:[0x3ec46d,0xffffff,0x2a6ad0],speed:4,floor:roller.pos.y});
    for (const rug of rugs) if (!rug.broken) rug.rollUp();
  };
}

export class FactoryDetourRecovery extends Entity {
  constructor(stage, detour, { entryX = 0, launch = false, exitD = detour.exitD, backD = detour.entryD } = {}) {
    super(stage, ...detour.pos.toArray());
    Object.assign(this, { detour, entryX: detour.track.authorU ? detour.track.authorU(entryX) : entryX, launch, exitD, backD });
    this.interactive = false; this.alwaysActive = true; this.snapshot = null;
  }
  capture() {
    const s = this.session;
    this.snapshot = { seq:s.nextSeq(), tickets:save.data.tickets, lives:save.data.lives,
      levelTickets:s.levelTickets, fieldRaw:s.fieldRaw, coconutRaw:s.coconutRaw,
      snackRaw:s.snack.raw, lifeLine:s.lifeLine || 0, cpLifeLine:s.cp?.lifeLine,
      freedIds:new Set(s.freedIds), sphereGiven:s.chain?.sphereGiven,
      back:this.detour.track.toWorld(this.backD, this.entryX, .05) };
  }
  rollback() {
    const b = this.snapshot, s = this.session, g = this.game;
    if (!b) return;
    finishSessionChain(s); removeChainDrops(s,b.seq);
    for (const e of this.stage.entities) {
      if (e instanceof Breakable && e.broken && e.brokenSeq > b.seq) e.restore();
      if (e instanceof ConedDog && e.freed && e.seq > b.seq) e.restore();
      if (this.detour.factoryEntities?.has(e)) e.reset?.();
    }
    s.tickets.restoreAfter(b.seq); s.tickets.clearFlying();
    save.data.tickets = b.tickets; save.data.lives = b.lives;
    s.levelTickets=b.levelTickets; s.fieldRaw=b.fieldRaw; s.coconutRaw=b.coconutRaw;
    s.snack.raw=b.snackRaw; s.freedIds=new Set(b.freedIds); s.lifeLine=b.lifeLine;
    if (s.cp) s.cp.lifeLine=b.cpLifeLine;
    if (s.chain) s.chain.sphereGiven=b.sphereGiven;
    s._lifeLineHold=true; s._pushHud();
    const p=g.player; p.hang=null; p.spawnAt(b.back,this.detour.track.yaw(this.detour.entryD));
    const pr=this.detour.track.project(p.pos.x,p.pos.z); p.body.s=pr.s; p.body.u=pr.u;
    g.camera.snap(p); g.mask.snapTo(p);
    this.snapshot=null; this.restoreCamera();
  }
  restoreCamera() {
    const camera=this.stage.defaultCamera;
    if(camera)this.game.camera.setMode(camera.mode,camera);
  }
  update() {
    const p=this.player, tr=this.detour.track, s=p.body.s ?? 0, y=p.pos.y-tr.heightAt(s);
    if (p.dead || p.frozen || this.session.busy || this.detour.busy) return;
    if (!this.snapshot) {
      if (this.session.trial) return;
      const near=Math.abs(s-this.detour.entryD)<1.8 && Math.abs((p.body.u ?? 0)-this.entryX)<.85;
      // Slide in under the roof, or stand on top of the pipe: both take Nobu up into the ducts.
      // (Standing on the pipe used to do nothing, so players were stuck on top of it.)
      const onPipe=near && p.body.grounded && y>=.8 && y<2.6;
      if (!this.launch && ((near && y<1 && p.mode==='slide') || onPipe)) {
        this.capture(); this.detour.travel(this.detour.startPos,this.detour.entryD);
      } else if (this.launch && s>=275 && s<279 && y>=5 && Math.abs((p.body.u ?? 0)-(tr.authorU ? tr.authorU(-2.8) : -2.8))<1.7) this.capture();
      return;
    }
    if (s>=this.exitD && y < this.detour.y-1) { this.snapshot=null; this.restoreCamera(); return; }
    if(y>=this.detour.y-1 && this.game.camera.opts!==this.detour.cameraOpts) this.game.camera.setMode('trackFront',this.detour.cameraOpts);
    if (y < this.detour.y-2 && !p.hang) this.rollback();
  }
  onRespawn() { this.snapshot=null; }
}

