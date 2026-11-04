import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({width:256,height:256}), tiled: () => new THREE.Texture({width:256,height:256}), url: () => '',
} }));
const gradient={addColorStop(){}};
const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},
  {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
HTMLCanvasElement.prototype.getContext=()=>ctx;
HTMLCanvasElement.prototype.toDataURL=()=>'';
const {Stage}=await import('../src/world/stage.js');
const {Session}=await import('../src/game/session.js');
const {TicketSystem}=await import('../src/entities/tickets.js');
const {ConedDog}=await import('../src/entities/dogs.js');
const {LEVELS}=await import('../src/levels/registry.js');
const {save}=await import('../src/core/save.js');
afterEach(()=>vi.restoreAllMocks());
function build(id,remix){
  const rng=vi.spyOn(Math,'random').mockReturnValue(.37);
  try{
    const noop=()=>{};
    const game={player:{pos:new THREE.Vector3(),vel:new THREE.Vector3(),body:{s:1,u:0},abilities:{},dead:false,mode:'normal'},
      ui:new Proxy({},{get:()=>noop}),fx:new Proxy({},{get:()=>noop}),camera:{setMode:noop,shake:noop,snap:noop},mask:{snapTo:noop}};
    const session=game.session=new Session(game,id);session.remix=remix;
    const stage=game.stage=session.stage=new Stage(game,LEVELS[id].theme);
    stage.decor=noop;
    const tickets=game.tickets=session.tickets=new TicketSystem(game,stage);
    const info=LEVELS[id].build(game,stage,tickets);
    return{stage,session,tickets,info};
  }finally{rng.mockRestore();}
}
function expectReflection(a,b,axis,label){
  expect(b.x,label+' x').toBeCloseTo(2*axis-a.x,3);
  expect(b.y,label+' y').toBeCloseTo(a.y,3);expect(b.z,label+' z').toBeCloseTo(a.z,3);
}
it.each([1,2,3,4])('reflects actual shipped main builder %s with matching rewards, dogs and collision boxes',id=>{
  save.load();
  const a=build(id,false),b=build(id,true),axis=a.stage.track.mirrorAxisX;
  expect(b.stage.track.length).toBeCloseTo(a.stage.track.length,5);
  expectReflection(a.info.spawn,b.info.spawn,axis,'spawn');
  const packsA=a.stage.entities.filter(e=>e.countable),packsB=b.stage.entities.filter(e=>e.countable);
  expect(packsB.length).toBe(packsA.length);
  packsA.forEach((e,i)=>expectReflection(e.pos,packsB[i].pos,axis,`countable ${i}/${e.constructor.name}`));
  const dogsA=a.stage.entities.filter(e=>e instanceof ConedDog),dogsB=b.stage.entities.filter(e=>e instanceof ConedDog);
  expect(dogsB.map(e=>e.dogId)).toEqual(dogsA.map(e=>e.dogId));
  dogsA.forEach((e,i)=>expectReflection(e.pos,dogsB[i].pos,axis,`dog ${e.dogId}`));
  expect(b.tickets.list.length).toBe(a.tickets.list.length);
  a.tickets.list.forEach((t,i)=>expectReflection(t,b.tickets.list[i],axis,`ticket ${i}`));
  expect(b.stage.world.all.length).toBe(a.stage.world.all.length);
  a.stage.world.all.forEach((s,i)=>{
    const q=b.stage.world.all[i],name=`solid ${i}/${s.ref?.constructor?.name}`;
    expect(q.min.x,name+' minx').toBeCloseTo(2*axis-s.max.x,3);
    expect(q.max.x,name+' maxx').toBeCloseTo(2*axis-s.min.x,3);
    expect(q.min.z,name+' minz').toBeCloseTo(s.min.z,3);
    expect(q.max.z,name+' maxz').toBeCloseTo(s.max.z,3);
    expect(q.min.y,name+' miny').toBeCloseTo(s.min.y,3);
    expect(q.max.y,name+' maxy').toBeCloseTo(s.max.y,3);
  });
});
