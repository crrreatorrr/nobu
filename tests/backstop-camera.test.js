import * as THREE from 'three';
import {expect,it,vi,afterEach} from 'vitest';
import {GameCamera} from '../src/camera/camera.js';
import {Track,turtle} from '../src/world/track.js';
import {makeKit} from '../src/levels/kit.js';
afterEach(()=>vi.restoreAllMocks());
function fixture({rear=-8,end=80,marked=true}={}){
 const track=new Track(turtle([0,0,10],[[24,0,0],[30,35,1],[30,-20,-1]]));
 const stage={scene:new THREE.Scene(),entities:[],game:{session:{}},add:e=>{stage.entities.push(e);return e;}};
 const kit=makeKit(stage.game,stage,null,track),stop=kit.backstop(rear),endStop=kit.backstop(end);
 track.ground(rear,100);
 if(!marked){delete stop.cameraBackstop;delete endStop.cameraBackstop;}
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const meshes=track.buildMeshes(stage,{ground:material,wall:material,platform:material});stage.scene.updateMatrixWorld(true);
 const player=s=>({pos:track.toWorld(s,0,0),body:{s,u:0,grounded:true}});
 return{track,kit,stop,endStop,meshes,player};
}
function camera(f,mode='track',s=1,aspect=1100/800,u=0){const c=new GameCamera(aspect);c.setMode(mode,{track:f.track});const p=f.player(s);p.body.u=u;f.track.toWorld(s,u,0,p.pos);c.snap(p);c.cam.updateMatrixWorld(true);return{c,p};}
function occluded(f,c,p){const target=p.pos.clone().add(new THREE.Vector3(0,.7,0)),delta=target.clone().sub(c.cam.position);return new THREE.Raycaster(c.cam.position,delta.clone().normalize(),0,delta.length()-.01).intersectObjects(f.meshes,false).length>0;}
function visible(c,p){
 c.cam.updateMatrixWorld(true);
 for(const y of[.1,.7,1.25])for(const x of[-.3,0,.3])for(const z of[-.3,0,.3]){
  const ndc=p.pos.clone().add(new THREE.Vector3(x,y,z)).project(c.cam);
  expect(Math.abs(ndc.x),`body x at${p.body.s}/${p.body.u}`).toBeLessThan(1);
  expect(Math.abs(ndc.y),`body y at${p.body.s}/${p.body.u}`).toBeLessThan(1);
  expect(ndc.z).toBeGreaterThan(-1);expect(ndc.z).toBeLessThan(1);
 }
}
it('marks only kit backstops while preserving their original collision dimensions',()=>{
 const f=fixture();expect(f.stop).toMatchObject({d0:-8,d1:-6.8,w:20,dy:8,depth:9,cameraBackstop:true});
 expect(f.track.groundAt(-7,0).y).toBe(8);
 expect(f.track.spans.filter(s=>s.cameraBackstop)).toEqual([f.stop,f.endStop]);
 expect(f.track.spans.at(-1).cameraBackstop).toBeUndefined();
});
it('reproduces the opaque opening with unmarked terrain and clears the actual backstop mesh when marked',()=>{
 const legacy=fixture({marked:false}),old=camera(legacy);
 expect(legacy.track.project(old.c.cam.position.x,old.c.cam.position.z).s).toBeCloseTo(-7.6);
 expect(occluded(legacy,old.c,old.p)).toBe(true);
 const fixed=fixture(),{c,p}=camera(fixed);
 expect(fixed.track.project(c.cam.position.x,c.cam.position.z).s).toBeCloseTo(-6.6);
 expect(occluded(fixed,c,p)).toBe(false);visible(c,p);
});
for(const mode of['track','rise'])for(const aspect of[1100/800,390/844])it(`${mode}: spawn and feet against the rear stop remain framed at aspect${aspect}`,()=>{
 const f=fixture();for(const s of[1,-6.49])for(const u of[-3,0,3]){const{c,p}=camera(f,mode,s,aspect,u);visible(c,p);expect(occluded(f,c,p)).toBe(false);}
});
it('keeps the constrained lookahead short near the rear wall and preserves ordinary distant framing',()=>{
 const f=fixture(),{c,p}=camera(f,'track',-6.49);
 expect(f.track.project(c.look.x,c.look.z).s-p.body.s).toBeLessThan(.1);
 const normal=camera(f,'track',20),expected=f.track.toWorld(11.4,0,4.3);
 expect(normal.c.pos.distanceTo(expected)).toBeLessThan(.01);
 expect(f.track.project(normal.c.look.x,normal.c.look.z).s).toBeCloseTo(25.5,1);
});
it('keeps actual eased and shaken cameras outside the marked rear stop',()=>{
 const f=fixture(),{c,p}=camera(f,'track',1);vi.spyOn(Math,'random').mockReturnValue(1);
 for(let i=0;i<100;i++){
  p.body.s=Math.max(-6.49,1-i*.08);f.track.toWorld(p.body.s,0,0,p.pos);c.shake(.8,.2);c.update(1/60,p);
  expect(f.track.project(c.cam.position.x,c.cam.position.z).s).toBeGreaterThanOrEqual(-6.61);
 }
});
it('constrains trackFront only at an ahead end stop and preserves open front framing',()=>{
 const f=fixture(),normal=camera(f,'trackFront',1);
 expect(f.track.project(normal.c.pos.x,normal.c.pos.z).s).toBeCloseTo(13.5,1);
 for(const aspect of[1100/800,390/844]){
  const {c,p}=camera(f,'trackFront',79.69,aspect);
  expect(f.track.project(c.cam.position.x,c.cam.position.z).s).toBeCloseTo(79.8,1);visible(c,p);expect(occluded(f,c,p)).toBe(false);
 }
});
it('leaves side, arena, legacy and cinematic framing unchanged',()=>{
 const f=fixture(),unmarked=fixture({marked:false});
 for(const mode of['side','arena','behind','front']){
  const a=camera(f,mode),b=camera(unmarked,mode);expect(a.c.pos.toArray()).toEqual(b.c.pos.toArray());expect(a.c.look.toArray()).toEqual(b.c.look.toArray());
 }
 const {c,p}=camera(f);c.cinematic(f.track.toWorld(-7.5,0,4),f.track.toWorld(1,0,1),100);c.update(1,p);
 expect(f.track.project(c.cam.position.x,c.cam.position.z).s).toBeCloseTo(-7.5);
});

for(const mode of['track','rise'])it(`${mode}: backing to the wall keeps the actual eased body in frame`,()=>{
 const f=fixture(),{c,p}=camera(f,mode,1,390/844);
 for(let i=0;i<100;i++){
  p.body.s=Math.max(-6.49,1-i*.13);f.track.toWorld(p.body.s,0,0,p.pos);c.update(1/60,p);visible(c,p);
 }
});
