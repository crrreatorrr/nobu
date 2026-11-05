import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),setRate:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {RugPull} from '../src/entities/props2.js';
import {Session} from '../src/game/session.js';
import {save} from '../src/core/save.js';
import {input} from '../src/core/input.js';
import {resetWorld} from './helpers.js';
const noop=()=>{},fixtures=[];
beforeEach(()=>{resetWorld();vi.spyOn(input,'pressed').mockReturnValue(false);vi.spyOn(input,'held').mockReturnValue(false);input.state.x=input.state.y=0;});
afterEach(()=>{for(const f of fixtures.splice(0))f.stage.dispose();input.state.x=input.state.y=0;vi.restoreAllMocks();});
function setup(d=429,y=1){
 const f=pipelineFixture();fixtures.push(f);vi.spyOn(f.game.ui,'banner');f.stage.finalize();f.tickets.finalize();
 const s=f.session;Object.assign(s,new Session(f.game,5));Object.setPrototypeOf(s,Session.prototype);
 for(const key of Object.keys(s))if(typeof s[key]==='function'&&typeof Session.prototype[key]==='function')delete s[key];
 s.stage=f.stage;s.info=f.info;s.tickets=f.tickets;s.projectiles={clear:noop,update:noop};s.dogsTotal=7;
 Object.assign(f.game.ui,{setHud:noop,showHud:noop,trialTime:noop});f.game.mask={setLevel:noop,snapTo:noop,update:noop};f.game.state='play';f.game.camera.update=noop;
 f.p.spawnAt(f.k.W(0,y,d),f.track.yaw(d));s.cp={pos:f.p.pos.clone(),facing:f.p.facing,seq:0,tickets:save.data.tickets,levelTickets:0,fieldRaw:0,snackRaw:0,freedIds:new Set()};
 f.rug=f.stage.entities.find(e=>e instanceof RugPull&&e.d0===426);
 f.step=()=>{f.game.camera.basis={right:f.track.right(f.p.body.s??d),forward:f.track.tangent(f.p.body.s??d)};s.update(1/120);};return f;
}
function untilLanding(f,max=180){for(let i=0;i<max&&!f.p.dead;i++){f.step();const tile=f.rug.tiles.findIndex(t=>t.solid===f.p.body.ground);if(f.p.body.grounded&&tile>=0){f.step();return tile;}}return-1;}
it('opts all three authored strips into ground-contact activation without changing their speeds',()=>{
 const f=setup();expect(f.stage.entities.filter(e=>e instanceof RugPull).map(e=>[e.d0,e.triggerOnAnyTile,e.speed])).toEqual([[348,true,7.4],[369,true,7.6],[426,true,7.5]]);
});
it.each([[348,352],[369,373]])('arms the other opted strip D%s from a real later-tile landing', (start,d)=>{
 const f=setup(d);f.rug=f.stage.entities.find(e=>e instanceof RugPull&&e.d0===start);expect(untilLanding(f)).toBeGreaterThan(0);expect(f.rug.state).toBe('pulling');
});
it('arms from the natural RUN drop off the raised423 rest onto a later rug tile',()=>{
 const f=setup(424.7,4.2);input.state.y=1;const tile=untilLanding(f);
 expect(tile).toBeGreaterThan(0);expect(f.rug.state).toBe('pulling');expect(f.rug.t).toBeGreaterThan(0);expect(f.rug.front).toBeCloseTo(426+7.5*f.rug.t);expect(f.game.ui.banner).toHaveBeenCalled();expect(f.p.dead).toBe(false);
});
it.each([426.9,429,433])('arms an actual supported landing at D%s and retains normal collapse/cat tells',d=>{
 const f=setup(d);expect(untilLanding(f)).toBeGreaterThanOrEqual(0);expect(f.rug.state).toBe('pulling');
 // Observe the ordinary front from real elapsed time; no direct onLand calls.
 input.state.y=0;for(let i=0;i<36;i++)f.step();expect(f.rug.tiles[0].state).not.toBe('idle');expect(f.rug.front).toBeCloseTo(426+7.5*f.rug.t);
 if(d===433){f.rug.update(1.2);expect(f.rug.litCats.size).toBeGreaterThan(0);expect(f.rug.tiles[0].solid.enabled).toBe(false);}
});
it('does not arm from an airborne overflight above its owned tiles',()=>{
 const f=setup(429,5);input.state.y=1;for(let i=0;i<24;i++){f.step();expect(f.p.body.grounded).toBe(false);expect(f.rug.state).toBe('idle');}
});
it('preserves default first-tile-only behavior for an unopted strip',()=>{
 const f=setup();for(const t of f.rug.tiles)t.solid.enabled=false;
 const rug=new RugPull(f.stage,f.track,426,436,{tile:2,speed:7.5});f.stage.entities.push(rug);f.rug=rug;
 expect(rug.triggerOnAnyTile).toBe(false);expect(untilLanding(f)).toBe(1);expect(rug.state).toBe('idle');
 f.p.spawnAt(f.k.W(0,1,426.9),f.track.yaw(426.9));expect(untilLanding(f)).toBe(0);expect(rug.state).toBe('pulling');
});
it('restores an armed strip on real checkpoint respawn and permits the next later-tile landing',()=>{
 const f=setup(429);expect(untilLanding(f)).toBe(1);expect(f.rug.state).toBe('pulling');for(let i=0;i<40;i++)f.step();
 f.session.respawn();expect(f.rug.state).toBe('idle');expect(f.rug.t).toBe(0);expect(f.rug.front).toBe(426);expect(f.rug.tiles.every(t=>t.solid.enabled&&t.state==='idle')).toBe(true);
 expect(untilLanding(f)).toBe(1);expect(f.rug.state).toBe('pulling');
});
