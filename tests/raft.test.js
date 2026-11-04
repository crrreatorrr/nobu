import {test,expect,vi} from 'vitest';
import * as THREE from 'three';
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import {audio} from '../src/audio/audio.js';
import {Track,turtle} from '../src/world/track.js';
import {World} from '../src/world/physics.js';
import {makeKit} from '../src/levels/kit.js';
import {installRiverKit} from '../src/levels/riverKit.js';
import {raftSpanAt,boostAt,raftFallAt,raftHelp,raftFeasibility} from '../src/game/raft.js';
function setup(){
 const track=new Track(turtle([0,0,10],[[30,0,0],[30,12,-.4],[30,-16,-.4],[25,10,0]]));
 const player={pos:track.toWorld(26,0,-.98),vel:new THREE.Vector3(),body:{s:26,u:0,grounded:true},mode:'normal',dead:false,frozen:false,setRide:vi.fn(function(cfg){this.ride=cfg?{...cfg,mesh:new THREE.Group()}:null;})};
 const camera={opts:{height:4.3,dist:8.6,ahead:5.5},cam:{fov:60,updateProjectionMatrix:vi.fn()},setMode:vi.fn(function(_,opts){this.opts=opts;})};
 const game={player,camera,session:{phase:'level',deathsAtCp:0,busy:false},fx:{},ui:{}};
 const stage={game,track,scene:new THREE.Scene(),world:new World(),entities:[],time:0,add(e){this.entities.push(e);if(e.obj)this.scene.add(e.obj);return e;},dispose(){this.scene.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};
 const k=installRiverKit(makeKit(game,stage,{add(){}},track),game,stage),span=k.raft(26,108,{speed:10.5,boost:[[60,66,1.3]],falls:[[80,84]]});
 return{track,player,camera,game,stage,k,span,c:stage.raftController};
}
test('actual river kit splits invisible floors and water death zones around falls',()=>{
 const{span,track,stage}=setup();expect(span.floors.map(s=>[s.d0,s.d1,s.visible,s.dy])).toEqual([[26,80,false,-.98],[84,108,false,-.98]]);
 expect(track.groundAt(82,0)).toBeNull();expect(track.groundAt(79,0).span.raftSpan).toBe(span);expect(track.waters.map(w=>[w.d0,w.d1])).toEqual([[26,80],[84,108]]);stage.dispose();
});
test('polling mounts once, preserves airborne hops, dismounts at docks and never mounts on raised optional routes',()=>{
 const{c,player,span,track,stage}=setup();c.update(.01);expect(player.setRide).toHaveBeenCalledTimes(1);expect(player.ride.speedK).toBe(.5);expect(c.current).toBe(span);
 player.pos.y+=2;player.body.grounded=false;player.vel.y=4;c.update(.1);expect(player.setRide).toHaveBeenCalledTimes(1);
 player.body.grounded=true;c.update(.1);expect(player.ride).toBeNull();expect(player.vel.y).toBe(4); // aqueduct exit does not add dock hop
 player.body.s=90;player.pos.copy(track.toWorld(90,0,-.98));player.vel.y=-2;c.update(.1);expect(player.ride).not.toBeNull();
 player.body.s=108;c.update(.1);expect(player.ride).toBeNull();expect(player.vel.y).toBe(7.5);expect(c.boats[0].beached.visible).toBe(true);stage.dispose();
});
test('checkpoint projection is immutable, remounts drifting once and respects exact boundaries/falls/height',()=>{
 const{c,player,track,stage}=setup();const cp=track.toWorld(95,0,-.98),copy=cp.clone();c.onRespawn();c.restoreAtCheckpoint(cp);expect(cp.equals(copy)).toBe(true);expect(player.ride.speedK).toBe(.35);const n=player.setRide.mock.calls.length;c.update(0);expect(player.setRide).toHaveBeenCalledTimes(n);expect(player.ride.speedK).toBe(.35);
 for(const [d,y,riding] of [[26,-.98,true],[108,-.98,false],[82,-.98,false],[95,10,false]]){c.restoreAtCheckpoint(track.toWorld(d,0,y));expect(!!player.ride).toBe(riding);}stage.dispose();
});
test('frozen, hanging, dead, busy and completed players do not auto-mount',()=>{
 for(const key of ['frozen','dead','hang']){const{player,c,stage}=setup();player[key]=true;c.update(.1);expect(player.setRide).not.toHaveBeenCalled();stage.dispose();}
 for(const state of [{busy:true},{phase:'complete'},{dying:true}]){const{game,player,c,stage}=setup();Object.assign(game.session,state);c.update(.1);expect(player.setRide).not.toHaveBeenCalled();stage.dispose();}
});
test('camera blends for .6 seconds, DDA excludes boards, and owned boats dispose once',()=>{
 const{c,game,camera,player,stage}=setup();game.session.deathsAtCp=5;c.update(.3);expect(player.ride.speed).toBe(10.5*.92);expect(camera.opts.height).toBeCloseTo(4.6);c.update(.3);expect(camera.cam.fov).toBe(66);
 game.session.trial=true;c.update(0);expect(player.ride.speed).toBe(10.5);expect(raftHelp({deathsAtCp:9})).toEqual({speed:.92,force:.85,lily:true});for(const flag of ['trial','remix','rush','board','medal'])expect(raftHelp({deathsAtCp:9,[flag]:true})).toEqual({speed:1,force:1,lily:false});
 const mesh=c.boats[0].moored,geo=mesh.children[0].geometry,mat=mesh.children[0].material,g=vi.spyOn(geo,'dispose'),m=vi.spyOn(mat,'dispose');stage.dispose();stage.dispose();expect(g).toHaveBeenCalledTimes(1);expect(m).toHaveBeenCalledTimes(1);expect(mesh.parent).toBeNull();
});
test('span and highest boost bounds are exact; literal stagger failures remain visible under +.5 perturbation',()=>{
 const{span,stage}=setup();expect(raftSpanAt([span],26)).toBe(span);expect(raftSpanAt([span],108)).toBeNull();expect(raftFallAt(span,80)).toEqual([80,84]);expect(raftFallAt(span,84)).toBeNull();expect(boostAt(span,60)).toBe(1.3);expect(boostAt(span,66)).toBe(1);
 const literal=[{id:'a',x:-2.4,d:44},{id:'b',x:2.4,d:51}];expect(raftFeasibility(literal,[span])).toEqual([]);expect(raftFeasibility(literal,[span],{perturb:.5})).toHaveLength(1);expect(raftFeasibility([literal[0],{...literal[1],d:51.5}],[span],{perturb:.5})).toEqual([]);stage.dispose();
});
test('river-created surface/depth geometry and materials dispose once without disposing borrowed water uniform textures',()=>{
 const{stage}=setup();let surface;stage.scene.traverse(o=>{if(!surface&&o.material?.uniforms?.uTime)surface=o;});expect(surface).toBeTruthy();const geo=vi.spyOn(surface.geometry,'dispose'),mat=vi.spyOn(surface.material,'dispose'),textures=Object.values(surface.material.uniforms).map(u=>u.value).filter(v=>v?.isTexture).map(t=>vi.spyOn(t,'dispose'));stage.dispose();stage.dispose();expect(geo).toHaveBeenCalledTimes(1);expect(mat).toHaveBeenCalledTimes(1);for(const t of textures)expect(t).not.toHaveBeenCalled();
});
test('actual GameCamera holds its pre-fall height for .3 seconds then resumes ordinary tracking',async()=>{
 const {GameCamera}=await import('../src/camera/camera.js');const{game,p,player,c,span,track,stage}=setup();
 const camera=game.camera=new GameCamera(1);camera.setMode('track',{track,height:4.9,dist:9.6,ahead:7.5});player.pos.copy(track.toWorld(80,0,-.98));player.body.s=80;player.body.grounded=false;player.vel.y=-1;c.current=span;player.setRide({...span.cfg,mesh:'raft'});player.ride.raftSpan=span;camera.snap(player);const heldY=camera.trackY;
 for(let i=0;i<18;i++){player.pos.y-=.05;c.update(1/60);camera.update(1/60,player);expect(camera.trackY).toBe(heldY);}
 for(let i=0;i<3;i++){player.pos.y-=.05;c.update(1/60);camera.update(1/60,player);}expect(camera.opts.holdY).toBeUndefined();expect(camera.trackY).toBe(player.pos.y);stage.dispose();
});
