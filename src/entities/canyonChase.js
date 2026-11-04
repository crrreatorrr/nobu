// Layout-2 opt-in behavior; the shipped ChaseCat and arena keep their original defaults.
import { ChaseCat } from '../bosses/bigCat.js';
import { CF } from '../levels/data/l2-extended.js';
import { chaseDda } from './chaser.js';
export class CanyonChase extends ChaseCat {
  constructor(stage, track, s, cuts = []) { super(stage, track, s); this.cuts = cuts; this.usedCuts = new Set(); this.holdPose = 'swipe'; }
  begin(s, delay) { super.begin(s, delay); this.usedCuts = new Set(); this.inFort = false; this.speedMul = chaseDda(this.session); }
  hold() { this.state = 'stop'; this.speed = 0; this.leap = null; }
  update(dt) {
    const s=this.player.body.s??0;
    if(s>=CF+1&&s<CF+13){
      if(!this.inFort){this.s=CF-1;this.y=this.track.heightAt(this.s);this._place();}
      this.inFort=true;this.hold();
    } else if(this.inFort){this.inFort=false;this.begin(CF-1,1);}
    super.update(dt);
  }
  canCatch(gap, p) { return gap > -1 && gap < 2.4 && Math.abs(p.pos.y - this.y) < 2.5; }
  afterAdvance(ps, dt = 0) {
    if (this.leap?.corner) {
      this.s += Math.max(0, Math.min(8 * dt, this.leap.s1 - this.s, ps - 3.5 - this.s));
      return;
    }
    if (this.state !== 'run' || this.leap) return;
    for (let i = 0; i < this.cuts.length; i++) {
      const [from, to] = this.cuts[i];
      if (this.usedCuts.has(i) || this.s < from) continue;
      this.usedCuts.add(i);
      if (this.s > to || ps - to < 3.5) continue;
      this.leap = { s0: from, s1: to, y0: this.y, h: 1.8, corner: true };
      this.speed = Math.max(this.speed, 7.5);
    }
  }
}
