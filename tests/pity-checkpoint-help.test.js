import { test, vi, expect } from 'vitest';
import * as THREE from 'three';

vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({ width: 256, height: 256 }),
  tiled: () => new THREE.Texture({ width: 256, height: 256 }),
  url: () => '',
} }));

const gradient = { addColorStop() {} };
const ctx = new Proxy({
  measureText: () => ({ width: 100 }),
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
  getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
}, { get: (obj,k) => k in obj ? obj[k] : () => {}, set: (obj,k,v) => (obj[k]=v,true) });
HTMLCanvasElement.prototype.getContext = () => ctx;
HTMLCanvasElement.prototype.toDataURL = () => '';



const {Stage}=await import('../src/world/stage.js');
const {Session}=await import('../src/game/session.js');
const {TicketSystem}=await import('../src/entities/tickets.js');
const {PitySnacks}=await import('../src/entities/gatedObjects.js');
const {makeKit,makeTrack,turtle}=await import('../src/levels/kit.js');
const {save}=await import('../src/core/save.js');
const {ddaFor}=await import('../src/game/dda.js');
vi.spyOn(Stage.prototype,'decor').mockImplementation(()=>{});
function fixture(flags={}) {
 save.load();save.data.tickets=0;
 const noop=()=>{},game={
  state:'play',loadout:{ranked:false},player:{pos:new THREE.Vector3(),facing:Math.PI,body:{s:0,u:0},abilities:{},
   spawnAt(pos,facing){this.pos.copy(pos);this.facing=facing;const p=game.stage.track.project(pos.x,pos.z);this.body.s=p.s;this.body.u=p.u;}},
  ui:new Proxy({banner:vi.fn()},{get:(o,k)=>o[k]??noop}),fx:new Proxy({burst:vi.fn()},{get:(o,k)=>o[k]??noop}),
  camera:{snap:noop,shake:noop},mask:{setLevel:vi.fn(),snapTo:noop},
 };
 const session=new Session(game,'1');Object.assign(session,flags);game.session=session;
 const stage=new Stage(game,1);session.stage=game.stage=stage;
 const tickets=new TicketSystem(game,stage);game.tickets=session.tickets=tickets;
 session.projectiles={clear:noop};
 const track=makeTrack(stage,turtle([0,0,0],[[120,35,0]])),k=makeKit(game,stage,tickets,track);
 k.floor(-4,120);k.section(0,30,'First Section');k.section(30,60,'Second Section');k.section(60,120,'Later Section');
 // The nearest distance belongs to an unrelated sky route and must be ignored.
 const sky=k.pitySnacks(0,8,5);sky.detour=true;
 const past=k.pitySnacks(0,0,-1),nearest=k.pitySnacks(0,0,20),second=k.pitySnacks(0,0,40),later=k.pitySnacks(0,0,80);
 const ordinary=k.snacks(0,0,60);tickets.finalize();
 session.checkpoint(k.W(0,0,0));game.ui.banner.mockClear();
 return {game,session,stage,tickets,k,sky,past,nearest,second,later,ordinary};
}
test('actual Session deaths6→7→9 arm one authored pity checkpoint and grant the correct masks',()=>{
 const f=fixture(),{session:s,game,stage,nearest,second,later,sky,past}=f;
 const before={tickets:save.data.tickets,raw:s.fieldRaw,snack:s.snack.raw,entities:stage.entities.length};
 for(let i=1;i<=6;i++){s.respawn();expect(s.deathsAtCp).toBe(i);expect(s.mask).toBe(i>=3?1:0);expect(nearest.armed).toBe(false);}
 // Entity hooks run before spawnAt. Selection must use cp.pos, not the death location.
 game.player.pos.copy(f.k.W(0,0,95));game.player.body.s=95;
 s.respawn();expect(s.deathsAtCp).toBe(7);expect(nearest.armed).toBe(true);expect(nearest.interactive).toBe(true);expect(nearest.visible).toBe(true);
 expect([second,later,sky,past].every(e=>!e.armed)).toBe(true);expect(nearest.solid).toBeUndefined();expect(nearest.countable).toBe(false);
 stage.update(.5,game.player);expect(nearest.obj.visible).toBe(true);expect(nearest.obj.position.y).toBeCloseTo(nearest.pos.y);
 const bursts=game.fx.burst.mock.calls.length;s.respawn();s.respawn();expect(s.mask).toBe(2);expect(s.deathsAtCp).toBe(9);
 expect(game.fx.burst.mock.calls.length).toBe(bursts);expect(second.armed).toBe(false);expect(game.ui.banner).not.toHaveBeenCalled();
 expect({tickets:save.data.tickets,raw:s.fieldRaw,snack:s.snack.raw,entities:stage.entities.length}).toEqual(before);
});
test('actual pity hit checkpoints once, resets assistance and remains armed after an earlier rollback',()=>{
 const {session:s,k,nearest,second,tickets}=fixture();const original=s.cp;
 s.deathsAtCp=6;s.respawn();const seq=s.seq;nearest.onTouch();
 expect(nearest.broken).toBe(true);expect(s.seq).toBe(seq+1);expect(s.cp.pos.equals(nearest.pos)).toBe(true);expect(s.deathsAtCp).toBe(0);
 expect(ddaFor(s.deathsAtCp,s)).toEqual({masks:0,hazardMul:1,pityCp:false});
 expect(s.fieldRaw).toBe(0);expect(s.snack.raw).toBe(0);expect(save.data.tickets).toBe(0);expect(tickets.flying).toHaveLength(0);
 const checkpoint=s.cp;nearest.onTouch();expect(s.cp).toBe(checkpoint);
 s.respawn();expect(s.mask).toBe(0);expect(nearest.armed).toBe(true);expect(second.armed).toBe(false);
 // A real rollback to the earlier checkpoint restores its entity and keeps help available.
 s.cp=original;s.respawn();expect(nearest.broken).toBe(false);expect(nearest.armed).toBe(true);expect(nearest.interactive).toBe(true);
 s.checkpoint(k.W(0,0,20));s.deathsAtCp=6;s.respawn();expect(second.armed).toBe(true);
});
test('next ordinary checkpoint bounds activation even if the nearest future spot is in another section',()=>{
 const {session:s,nearest,second,later,ordinary}=fixture();
 nearest.broken=true;second.broken=true;ordinary.broken=true; // Its authored boundary still counts.
 s.deathsAtCp=8;s.respawn();expect(later.armed).toBe(false);
});
test('selection is independent of authoring order and an armed nearest spot never cascades to a second spot',()=>{
 const {session:s,stage,nearest,second}=fixture();stage.entities.reverse();s.deathsAtCp=6;s.respawn();
 expect(nearest.armed).toBe(true);expect(second.armed).toBe(false);s.respawn();expect(second.armed).toBe(false);
});
const excluded=['trial','remix','rush','bossRush','medal','medalMode','medalRun','bossMedal','bossMedalRun','ranked','board','boardRun','competitive','postsToBoard'];
for(const flag of excluded)test(`real Session respawn and direct pity arming exclude ${flag}`,()=>{
 const {session:s,nearest}=fixture({[flag]:true});s.deathsAtCp=8;s.respawn();
 expect(s.mask).toBe(0);expect(nearest.armed).toBe(false);expect(nearest.arm()).toBe(false);
});
test('ranked ownership mode excludes ordinary checkpoint help and boss phase retains its separate mask policy',()=>{
 const ranked=fixture();ranked.game.loadout.ranked=true;ranked.session.deathsAtCp=8;ranked.session.respawn();
 expect(ranked.session.mask).toBe(0);expect(ranked.nearest.arm()).toBe(false);
 const boss=fixture();boss.session.phase='boss';boss.session.mask=1;boss.session.deathsAtCp=8;boss.session.respawn();
 expect(boss.session.mask).toBe(1);expect(boss.nearest.armed).toBe(false);expect(boss.nearest.arm()).toBe(false);
});
test('activation waits for the complete restore pass before choosing among previously broken spots',()=>{
 const {session:s,stage,nearest,second}=fixture(),earlier=s.cp;
 s.deathsAtCp=6;s.respawn();nearest.onTouch();expect(nearest.broken).toBe(true);
 s.cp=earlier;s.deathsAtCp=6;stage.entities.reverse();s.respawn();
 expect(nearest.broken).toBe(false);expect(nearest.armed).toBe(true);expect(second.armed).toBe(false);
});
