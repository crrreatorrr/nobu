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
    k.arrowBox=(x,y,d,power)=>{const body=new THREE.Group();body.add(new THREE.Mesh(new THREE.PlaneGeometry(.8,.8),new THREE.MeshBasicMaterial()));return{body,obj:new THREE.Group(),home:k.W(x,y,d),power};};
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
  it('registers exact track coordinates and enforces the timed-box cap',()=>{
    const{s,k}=kitFixture();k.blinkBox(2,3,4,{group:'a'});
    expect(s.timedBoxes[0]).toMatchObject({kind:'blink',x:2,y:3,d:4,params:{group:'a'}});
    for(let i=1;i<40;i++)k.blinkBox(0,0,i);
    expect(()=>k.blinkBox(0,0,41)).toThrow('Too many blink');
  });
});
