import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {save} from '../src/core/save.js';
import {input} from '../src/core/input.js';
import {itemById} from '../src/gear/catalog.js';
import {writeFileSync} from 'node:fs';
import {resetWorld} from './helpers.js';
const fixtures=[];
beforeEach(()=>resetWorld());afterEach(()=>{input.state.x=input.state.y=0;vi.restoreAllMocks();for(const f of fixtures.splice(0))f.stage.dispose();});
function launch({riser=true,lane=1,shutters=true}={}){
 for(const id of[1,2,3,4,6])save.data.beaten[id]=true;save.data.beaten[5]=false;
 const f=pipelineFixture({shutters});fixtures.push(f);
 for(const b of f.stage.timedBoxes)if(b.d>=(lane?392:236)&&b.d<(lane?446:252)){b.entity.dead=true;if(b.entity.solid)b.entity.solid.enabled=false;}
 if(!riser)for(const s of f.stage.pipeline.cases[1].riserSolids)s.enabled=false;
 f.game.loadout.effects={...Object.fromEntries(itemById('nobu_champions_crown').effects.map(e=>[e.id,e.params])),air_dash:itemById('nobu_clown_collar').effect.params};
 const{p,track}=f;p.spawnAt(track.toWorld(lane?401.5:235.5,lane?-1.1:0,0),track.yaw(lane?401.5:235.5));p.body.grounded=true;p.zoomArmed=true;p.vel.copy(track.tangent(lane?401.5:235.5)).multiplyScalar(12.4);f.session.cp.pos.copy(p.pos);
 f.end=lane?446:252;return f;
}
function replay(f,{first=24,dash=48}={}){
 const{p,track,stage}=f,pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');let flight=0,lastJump=-100;const trace=[];
 try{for(let frame=0;frame<1080&&!p.dead;frame++){
  const grounded=p.body.grounded,jumpGround=grounded&&frame-lastJump>12;if(jumpGround){flight=0;lastJump=frame;}
  const jump=jumpGround||!grounded&&[first,first+36,first+56].includes(flight);
  held.mockImplementation(k=>k==='jump'||k==='slide');pressed.mockImplementation(k=>k==='jump'&&jump||k==='dash'&&flight===dash);
  input.state.x=0;input.state.y=1;stage.update(1/120,p);p.update(1/120,stage,{right:track.right(p.body.s),forward:track.tangent(p.body.s)});flight++;
  if(frame%12===0)trace.push({frame,s:p.body.s,u:p.body.u,y:p.pos.y,ground:p.body.ground?.ref?.kind||p.body.ground?.kind});
  if(p.body.grounded&&p.body.s>f.end+.1)return{escaped:true,s:p.body.s,trace};
 }return{escaped:false,s:p.body.s,trace};}finally{pressed.mockRestore();held.mockRestore();}
}
it('blocks both demonstrated legal Crown+Clown bypasses with actual collision, with door-removed controls escaping',()=>{
 for(const lane of[0,1]){
  const schedule=lane?{first:48,dash:96}:{};
  expect(replay(launch({lane,shutters:false}),schedule).escaped).toBe(true);
  const fixed=replay(launch({lane}),schedule);writeFileSync(`/tmp/h50-shutter-${lane}.json`,JSON.stringify(fixed,null,2));
  expect(fixed.escaped).toBe(false);
 }
});
