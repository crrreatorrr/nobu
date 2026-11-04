import {test,expect,vi} from 'vitest';
import * as THREE from 'three';
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import {audio} from '../src/audio/audio.js';
import {Track,turtle} from '../src/world/track.js';
import {World,moveBody,rideGround} from '../src/world/physics.js';
import {Whirlpool,Outflow,Slick,DriftLog,FloatDisc,PityLily} from '../src/entities/river.js';
const ctx=new Proxy({},{get:()=>()=>{}});HTMLCanvasElement.prototype.getContext=()=>ctx;
function setup(){const track=new Track(turtle([0,0,0],[[50,50,0],[50,-30,0]]));track.wall(0,4.6,4.6,3);track.wall(100,4.6,4.6,3);track.ground(0,100,{dy:-.98,w:9.2,visible:false});
 const pos=track.toWorld(30,0,-.98),body={pos,vel:new THREE.Vector3(),s:30,u:0,h:1.5,hw:.36,hd:.36,grounded:true};const player={pos,vel:body.vel,body,dead:false,frozen:false,hurt:vi.fn(()=>true)};
 const game={player,session:{phase:'level',deathsAtCp:0,cp:{pos:track.toWorld(10,0,-.98)}},fx:{dust:vi.fn(),burst:vi.fn()}};
 const world=new World();world.track=track;const stage={game,track,world,time:0,scene:new THREE.Scene(),entities:[],dispose(){this.scene.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};
 const add=e=>{stage.entities.push(e);stage.scene.add(e.obj);return e;};return{stage,game,player,track,add};}
test('whirlpool pulls through actual world push vectors and hurts only grounded water centre, with competitive DDA exclusion',()=>{
 const{stage,game,player,track,add}=setup(),w=add(new Whirlpool(stage,track,0,30));player.pos.copy(track.toWorld(30,1,-.98));w.update(.1);const toward=w.pos.clone().sub(player.pos).setY(0).normalize();expect(new THREE.Vector3(player.pushX,0,player.pushZ).normalize().dot(toward)).toBeCloseTo(1);
 player.pos.copy(track.toWorld(30,0,-.98));player.body.grounded=false;w.update(.1);expect(player.hurt).not.toHaveBeenCalled();player.body.grounded=true;w.update(.1);expect(player.hurt).toHaveBeenCalledWith('whirl');player.hurt.mockClear();player.pos.y=3;w.update(.1);expect(player.hurt).not.toHaveBeenCalled();
 player.pos.copy(track.toWorld(30,1,-.98));game.session.deathsAtCp=5;player.pushX=player.pushZ=0;w.update(.1);const helped=Math.hypot(player.pushX,player.pushZ);game.session.trial=true;player.pushX=player.pushZ=0;w.update(.1);expect(helped/Math.hypot(player.pushX,player.pushZ)).toBeCloseTo(.85);stage.dispose();
});
test('outflow uses track-local bank strip and one velocity push, with a full .8s visible/audio warning despite remote updates',()=>{
 const{stage,player,track,add}=setup(),out=add(new Outflow(stage,track,30,{side:'left',push:4.2,period:2.2}));player.body.u=-2;player.pos.copy(track.toWorld(30,-2,-.98));stage.time=1.4;out.update(.1);expect(out.stateAt(1.4).tell).toBe(true);expect(out.spray.visible).toBe(true);expect(audio.play).toHaveBeenCalledWith('gurgle',.5);expect(player.pushX).toBeUndefined();
 stage.time=2.2;out.update(.01);const right=track.right(30,new THREE.Vector3());expect(player.pushX).toBeCloseTo(right.x*4.2);expect(player.pushZ).toBeCloseTo(right.z*4.2);
 player.pushX=player.pushZ=0;player.body.u=3;out.update(.5);expect(player.pushX).toBe(0);player.body.u=-2;player.body.s=34;out.update(.1);expect(player.pushX).toBe(0);expect(out.stateAt(.99).on).toBe(false);stage.dispose();
});
test('slick affects only the authored lateral river band and raft, never raised or foot routes',()=>{
 const{stage,player,track,add}=setup(),slick=add(new Slick(stage,track,25,35,{x:-1.6,w:4.4}));player.ride={meshKind:'raft'};player.body.u=2.6;slick.update(.1);expect(player.ride.slick).toBeUndefined();player.body.u=-2;slick.update(.1);expect(player.ride.slick).toBe(.25);player.ride.slick=0;player.pos.y=10;slick.update(.1);expect(player.ride.slick).toBe(0);player.ride=null;slick.update(.1);stage.dispose();
});
test('drift log uses canonical ride Hazard and actual moving World support on foot; respawn restores it',()=>{
 const{stage,player,track,add}=setup(),log=add(new DriftLog(stage,track,30,{range:2,speed:1,w:2.6}));player.ride={};log.update(.1);expect(log.solid.enabled).toBe(false);log.onTouch(player);expect(player.hurt).toHaveBeenCalledWith('splash',log.pos.x,log.pos.z);expect(log.dead).toBe(true);
 player.ride=null;log.onRespawn();expect(log.dead).toBe(false);expect(log.solid.enabled).toBe(true);player.hurt.mockClear();log.onTouch(player);expect(player.hurt).not.toHaveBeenCalled();player.pos.copy(log.pos).add(new THREE.Vector3(0,1.5,0));player.vel.y=-2;player.body.grounded=false;
 for(let i=0;i<30&&!player.body.grounded;i++){stage.world.beginFrame();log.update(1/120);player.vel.y-=50.4/120;moveBody(stage.world,player.body,1/120);}expect(player.body.ground).toBe(log.solid);const before=player.pos.clone();stage.world.beginFrame();log.update(.1);rideGround(player.body);expect(player.pos.distanceTo(before)).toBeGreaterThan(.05);stage.dispose();
});
test('float disc follows actual rollback state; fall-specific pity lilies never leak into a trial or later checkpoint',()=>{
 const{stage,game,track,add}=setup(),pack={pos:track.toWorld(30,0,-1),broken:false,dead:false},disc=add(new FloatDisc(stage,pack));disc.update();expect(disc.visible).toBe(true);pack.broken=true;disc.update();expect(disc.visible).toBe(false);pack.broken=false;disc.update();expect(disc.visible).toBe(true);
 const span={cfg:{y:-1},falls:[[40,44],[70,74]]},a=add(new PityLily(stage,track,span,span.falls[0])),b=add(new PityLily(stage,track,span,span.falls[1]));game.session.deathsAtCp=7;a.update();b.update();expect(a.solid.enabled).toBe(true);expect(b.solid.enabled).toBe(false);game.session.cp.pos=track.toWorld(60,0,-.98);a.onRespawn();b.onRespawn();expect(a.solid.enabled).toBe(false);expect(b.solid.enabled).toBe(true);game.session.trial=true;b.update();expect(b.solid.enabled).toBe(false);
 const geom=disc.obj.children[0].geometry,map=disc.obj.children[0].material.map,g=vi.spyOn(geom,'dispose'),t=vi.spyOn(map,'dispose');stage.dispose();stage.dispose();expect(g).toHaveBeenCalledTimes(1);expect(t).toHaveBeenCalledTimes(1);
});
