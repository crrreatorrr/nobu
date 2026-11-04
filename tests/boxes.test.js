import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { World } from '../src/world/physics.js';
vi.mock('../src/art/assets.js', () => ({ Assets: { tiled: () => null } }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { BeatClock, BlinkBox, FallBox, SlideBox, advanceBeatClocks, ddaTiming } from '../src/entities/boxes.js';
function stage() {
  return { world: new World(), tier: 1, theme: {}, game: { session: { deathsAtCp: 0 }, player: {
    pos: new THREE.Vector3(50, 0, 50), body: { hw: .3, hd: .3, h: 1.3, grounded: false, ground: null },
  } } };
}
describe('timed box lifetime and exact clocks', () => {
  it('advances shared clocks once independent of entity updates and resets phase on death', () => {
    const s = stage(), a = new BlinkBox(s,0,0,0,{group:'wave'}), b = new BlinkBox(s,0,0,3,{group:'wave',phase:-1});
    expect(a.clock).toBe(b.clock);
    advanceBeatClocks(s,.3);a.update(1);b.update(1);
    expect(a.clock.t).toBe(.3);
    advanceBeatClocks(s,1); // even while both boxes sleep off camera
    expect(a.clock.t).toBe(1.3);
    a.onRespawn();b.onRespawn();expect(a.clock.t).toBe(0);
    expect(a.solid.enabled).toBe(true);expect(b.solid.enabled).toBe(false);
  });
  it('never materializes a blinking box through Nobu', () => {
    const s=stage(), b=new BlinkBox(s,0,0,0,{on:1,off:1});
    b.clock.t=1.5;b.update(0);expect(b.solid.enabled).toBe(false);
    s.game.player.pos.set(0,0,0);b.clock.t=2.1;b.update(0);expect(b.solid.enabled).toBe(false);
    s.game.player.pos.x=2;b.update(0);expect(b.solid.enabled).toBe(true);
    s.game.player.pos.set(0,.98,0);b.update(0);expect(b.solid.enabled).toBe(true);
  });
  it('does not materialize after sleeping through a complete off phase',()=>{
    const s=stage(),b=new BlinkBox(s,0,0,0,{on:1,off:1});
    expect(b.solid.enabled).toBe(true);s.game.player.pos.set(0,0,0);
    b.clock.t=2.2;b.update(0);expect(b.solid.enabled).toBe(false);
  });
  it('disables falling collision exactly at delay and defers an occupied return', () => {
    const s=stage(), b=new FallBox(s,0,0,0,{delay:.3});
    s.game.player.body.grounded=true;s.game.player.body.ground=b.solid;
    for(let f=0;f<17;f++)b.update(1/60);
    expect(b.solid.enabled).toBe(true);b.update(1/60);expect(b.solid.enabled).toBe(false);
    s.game.player.body.grounded=false;s.game.player.pos.set(0,0,0);
    b.update(2.8);expect(b.state).toBe('returning');expect(b.solid.enabled).toBe(false);
    s.game.player.pos.x=2;b.update(0);expect(b.state).toBe('idle');expect(b.solid.enabled).toBe(true);
    expect(b.solid.max.y).toBeCloseTo(.98);
  });
  it('resets slider motion without creating a carry delta on respawn', () => {
    const s=stage(), b=new SlideBox(s,0,2,0,{dir:new THREE.Vector3(0,0,-1),phase:.4});
    const initial=b.pos.clone();advanceBeatClocks(s,.7);b.update();expect(b.pos.equals(initial)).toBe(false);
    b.onRespawn();expect(b.pos.equals(initial)).toBe(true);expect(b.solid.delta).toEqual({x:0,y:0,z:0});
    expect(b.solid.max.y).toBeCloseTo(2.98);
  });
  it('centralizes box DDA and disables it for competitive contexts', () => {
    const s=stage();s.game.session.deathsAtCp=5;
    expect(ddaTiming(s)).toEqual({rate:1/1.08,delayK:1.08});
    for(const mode of ['trial','remix','bossRush','medalRun','boardRun']) {
      s.game.session[mode]=true;expect(ddaTiming(s)).toEqual({rate:1,delayK:1});delete s.game.session[mode];
    }
    const c=new BeatClock();c.advance(1,1/1.08);expect(c.t).toBe(1/1.08);c.reset();expect(c.t).toBe(0);
  });
  it('keeps all timed solids outside the Golden Bone count', () => {
    const s=stage();for(const B of [BlinkBox,FallBox,SlideBox])expect(new B(s,0,0,0).countable).toBe(false);
  });
});

import { installBoxHelpers } from '../src/levels/boxKit.js';
describe('track-space helper installation', () => {
  function kitFixture() {
    const s=stage();s.entities=[];s.add=e=>{s.entities.push(e);return e;};
    const k={W:(x,y,d)=>new THREE.Vector3(100-d,y,10+x),yawAt:()=>Math.PI/2,rightAt:()=>new THREE.Vector3(0,0,1),fwdAt:()=>new THREE.Vector3(-1,0,0)};
    k.pack=(x,y,d,tickets)=>{const e={obj:new THREE.Group(),model:new THREE.Group(),tickets,pos:k.W(x,y,d)};s.add(e);return e;};
    k.arrowBox=(x,y,d,power)=>{const body=new THREE.Group(),obj=new THREE.Group(),decal=new THREE.Mesh(new THREE.PlaneGeometry(.8,.8),new THREE.MeshBasicMaterial());decal.rotation.x=-Math.PI/2;body.add(decal);obj.add(body);obj.position.copy(k.W(x,y,d));obj.rotation.y=k.yawAt(d)+Math.PI;return{body,obj,home:k.W(x,y,d),power};};
    installBoxHelpers(k,s.game,s);return{s,k};
  }
  it('maps x/z/y slide axes through the kit vectors',()=>{
    const{s,k}=kitFixture();
    const lateral=k.slideBox(1,2,3,{axis:'x',phase:Math.PI/2,range:1});
    const forward=k.slideBox(1,2,3,{axis:'z',phase:Math.PI/2,range:1});
    const vertical=k.slideBox(1,2,3,{axis:'y',phase:Math.PI/2,range:1});
    expect(lateral.pos.toArray()).toEqual([97,2,12]);expect(forward.pos.toArray()).toEqual([96,2,11]);expect(vertical.pos.toArray()).toEqual([97,3,11]);
    expect(s.timedBoxes.map(p=>p.kind)).toEqual(['slide','slide','slide']);
  });
  it('uses one raw ticket per main bounce pack, zero in gauntlets, with relative heights',()=>{
    const{s,k}=kitFixture();
    const chain=k.bounceChain([[0,3],[0,.5,6]],{y:2});
    expect(chain.map(p=>p.tickets)).toEqual([1,1]);expect(chain.map(p=>p.pos.y)).toEqual([2,2.5]);
    expect(chain.every(p=>p.model.children.length===1)).toBe(true);
    s.gauntlet=true;expect(k.bounceChain([[0,3]])[0].tickets).toBe(0);
  });
  it('guide arcs are visual geometry with no economic pickups',()=>{
    const{s,k}=kitFixture();const e=k.guideArc(0,0,0,1,6,2,7);
    expect(e.obj.children).toHaveLength(7);expect(e.countable).toBe(false);expect(e.interactive).toBe(false);
    expect(s.entities).toEqual([e]);
  });
  it('anchors distant guides at the arc so stage distance culling sees them',()=>{
    const{s,k}=kitFixture(),e=k.guideArc(0,0,200,0,206,2,7);
    s.game.player.pos.copy(k.W(0,0,203));expect(e.distToPlayer()).toBe(0);
    e.obj.updateMatrixWorld(true);
    expect(e.obj.children[0].getWorldPosition(new THREE.Vector3()).distanceTo(k.W(0,.9,200))).toBeLessThan(1e-8);
    expect(e.obj.children.at(-1).getWorldPosition(new THREE.Vector3()).distanceTo(k.W(0,.9,206))).toBeLessThan(1e-8);
  });
  it('points arrow decals at the next curved-track target in world space',()=>{
    const{s,k}=kitFixture();
    for(const yaw of [Math.PI/6,Math.PI/2]) {
      k.yawAt=()=>yaw;
      const [e]=k.arrowChain([[0,0,3],[1,0,6]],{tier:3});e.obj.updateMatrixWorld(true);
      const decal=e.body.children[0],direction=new THREE.Vector3(0,1,0).transformDirection(decal.matrixWorld);
      const target=k.W(1,0,6).sub(e.home).normalize();expect(direction.dot(target)).toBeCloseTo(1);
    }
  });
  it('registers and warns about unsafe raw bounce and arrow chains',()=>{
    const{s,k}=kitFixture(),warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    k.bounceChain([[0,3],[0,30]],{tier:1});k.arrowChain([[0,3],[0,30]],{tier:1});
    expect(s.timedPatterns).toHaveLength(2);expect(s.timedPatterns.every(p=>p.partial)).toBe(true);
    expect(s.timedBoxes.map(p=>p.kind)).toEqual(['bounce','bounce','arrow','arrow']);expect(warn).toHaveBeenCalledTimes(2);warn.mockRestore();
  });
  it('registers exact track coordinates and enforces the timed-box cap',()=>{
    const{s,k}=kitFixture();k.blinkBox(2,3,4,{group:'a'});
    expect(s.timedBoxes[0]).toMatchObject({kind:'blink',x:2,y:3,d:4,params:{group:'a'}});
    for(let i=1;i<40;i++)k.blinkBox(0,0,i);
    expect(()=>k.blinkBox(0,0,41)).toThrow('Too many blink');
  });
});
