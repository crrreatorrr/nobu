import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:new Proxy({musicTime:()=>null},{get:(o,k)=>o[k]??(()=>{})})}));
import {Session} from '../src/game/session.js';
import {Stage} from '../src/world/stage.js';
import {Player} from '../src/player/player.js';
import {Backpack,Snacks} from '../src/entities/breakables.js';
import {FreezePack} from '../src/entities/secrets.js';
import {TicketSystem} from '../src/entities/tickets.js';
import {input} from '../src/core/input.js';
import {save} from '../src/core/save.js';
import {resetWorld} from './helpers.js';
const noop=()=>{},sessions=[];
const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>k==='then'?undefined:o[k]??noop});
beforeEach(()=>{resetWorld();vi.useFakeTimers();vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('');save.data.beaten={1:true,2:true,3:true,4:true,5:true};save.data.godMode=false;save.data.lives=5;save.data.tickets=77;input.state={x:0,y:0};input._pressed=new Set();input.down.clear();});
afterEach(()=>{for(const s of sessions.splice(0))s.dispose();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();input.state={x:0,y:0};input._pressed.clear();input.down.clear();});
function fixture(){
 const ui=new Proxy({talking:false,fade:async()=>{},say:async()=>{}},{get:(o,k)=>o[k]??noop});
 const game={state:'play',ui,loadout:{effects:{},cosmeticSlots:()=>({})},camera:{cam:new THREE.PerspectiveCamera(60),basis:{right:{x:1,z:0},forward:{x:0,z:-1}},opts:{},snap:noop,setMode:noop,endCinematic:noop,shake:noop,update:noop},mask:{attach:noop,setLevel:noop,snapTo:noop,update:noop},fx:new Proxy({},{get:()=>noop}),onFlop:noop};
 game.player=new Player(game);const s=game.session=new Session(game,4,{trial:true});sessions.push(s);game.onPlayerDeath=type=>s.onPlayerDeath(type);
 const stage=game.stage=s.stage=new Stage(game,4);const tickets=game.tickets=s.tickets=new TicketSystem(game,stage);tickets.finalize();s.projectiles={clear:noop,update:noop};s.loading=false;s.busy=false;
 // Real solids, input and pit threshold: walking past z=-2 eventually triggers Player.die.
 stage.block(-1,-1,-2,1,0,2);
 for(let i=0;i<11;i++)stage.add(new Backpack(stage,i===10?0:20+i,0,i===10?-1.4:0));
 const checkpoint=stage.add(new Snacks(stage,0,0,0));s._attachActors({spawn:new THREE.Vector3(),facing:Math.PI,camera:{mode:'arena'}});s._setupTrial();checkpoint.onTouch(game.player);
 const packs=stage.entities.filter(e=>e instanceof FreezePack),pack=packs.find(e=>e.secs===3);
 return{game,s,stage,p:game.player,pack,packs};
}
function bite(f){input.state={x:0,y:0};input._pressed=new Set(['bite']);for(let i=0;i<6;i++){f.s.update(1/120);input._pressed.clear();}}
async function fallAndRetry(f){
 input.state.y=1;let frames=0;while(!f.p.dead&&frames++<600)f.s.update(1/120);
 expect(f.p.dead).toBe(true);expect(f.s.dying).toBe(true);
 const frozen=f.s.freezeT,score=f.s.trialT;f.s.update(.5);
 expect(f.s.freezeT).toBe(frozen);expect(f.s.trialT).toBe(score);
 input.state={x:0,y:0};await vi.advanceTimersByTimeAsync(2701);
 expect(f.p.dead).toBe(false);expect(f.s.dying).toBe(false);expect(f.p.pos.toArray()).toEqual([0,0,0]);
 expect(f.s.freezeT).toBe(frozen);return{frozen,score};
}
function consumed(pack){expect(pack.consumed).toBe(true);expect(pack.broken).toBe(true);expect(pack.dead).toBe(true);expect(pack.obj.visible).toBe(false);expect(pack.solid.enabled).toBe(false);}
it('keeps a converted pack visibly consumed through the real bite/pit/checkpoint retry farm',async()=>{
 const f=fixture(),rows=[];expect(f.pack.secs).toBe(3);expect(f.p.god).toBe(false);expect(f.p.gear).toEqual({});
 for(let i=0;i<4;i++){bite(f);rows.push(await fallAndRetry(f));consumed(f.pack);}
 expect(f.s.freezeMs).toBe(3000);expect(f.s.freezeT).toBe(0);expect(f.s.trialT).toBeGreaterThan(1);
 expect(rows[1].frozen).toBeLessThan(rows[0].frozen);expect(f.s.deaths).toBe(4);expect(save.data.lives).toBe(5);
});
it('restoring the old replay policy is a positive control for the same physical farm',async()=>{
 const f=fixture();f.pack.restore=function(){this.consumed=false;Backpack.prototype.restore.call(this);};
 for(let i=0;i<4;i++){bite(f);await fallAndRetry(f);expect(f.pack.broken).toBe(false);}
 expect(f.s.freezeT).toBeGreaterThan(7);expect(f.s.freezeMs).toBe(12000);expect(f.s.trialT).toBeLessThan(.1);
});
it('uncollected packs retain normal restore/collect behavior and each gives its own credit once',()=>{
 const f=fixture();for(const pack of f.packs){pack.restore();expect(pack.obj.visible).toBe(true);expect(pack.solid.enabled).toBe(true);pack.onBite(f.p);consumed(pack);pack.restore();pack.onBite(f.p);consumed(pack);}
 expect(f.s.freezeT).toBe(6);expect(f.s.freezeMs).toBe(6000);
});
it('a checkpoint after credit preserves remaining time while ordinary backpacks still restore',async()=>{
 const f=fixture();bite(f);const after=f.stage.add(new Snacks(f.stage,0,0,0));after.onTouch(f.p);
 const ordinary=f.stage.add(new Backpack(f.stage,0,0,1.4));f.p.facing=0;bite(f);expect(ordinary.broken).toBe(true);expect(ordinary.brokenSeq).toBeGreaterThan(f.s.cp.seq);
 await fallAndRetry(f);consumed(f.pack);expect(f.s.freezeMs).toBe(3000);expect(ordinary.broken).toBe(false);expect(ordinary.dead).toBe(false);expect(ordinary.obj.visible).toBe(true);expect(ordinary.solid.enabled).toBe(true);
});
it('a fresh trial build grants new packs without changing saved old trial records',async()=>{
 save.data.trials={1:{best:55,ms:55000,layout:1,medal:'gold'},4:{best:94,ms:94000,layout:1,medal:'gold'}};save.write();save.load();const old=structuredClone(save.data.trials);
 const first=fixture();bite(first);await fallAndRetry(first);consumed(first.pack);
 const next=fixture();expect(next.pack.consumed).toBe(false);expect(next.pack.broken).toBe(false);expect(next.pack.obj.visible).toBe(true);expect(next.pack.solid.enabled).toBe(true);bite(next);expect(next.s.freezeMs).toBe(3000);consumed(next.pack);
 expect(save.data.trials).toEqual(old);save.write();save.load();expect(save.data.trials).toEqual(old);
});
