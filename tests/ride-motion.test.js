import{test,expect,vi}from'vitest';
import * as THREE from'three';
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
vi.mock('../src/art/assets.js',()=>({Assets:{model:()=>null}}));
import{setPlayerRide,releasePlayerRaft,stepRide}from'../src/player/rideMotion.js';
import{World}from'../src/world/physics.js';
import{Track,turtle}from'../src/world/track.js';
import{Player}from'../src/player/player.js';
function player(){return{root:new THREE.Group(),body:{s:10,grounded:true},pos:new THREE.Vector3(),vel:new THREE.Vector3(),facing:0,game:{fx:{dust:vi.fn()}},_approach:Player.prototype._approach,_dustColor:()=>0x123456};}
test('raft metadata is opt-in, cancels inherited dash/glide and owns its separate reusable mesh',()=>{
 const p=player();p.airDashT=.2;p.glideOn=true;p.airJumps=3;setPlayerRide(p,{mesh:'raft',steer:6,hop:1,airJumps:0,speed:11,boost:[[0,20,1.3]]});const raft=p.ride.mesh;expect(p.airDashT).toBe(0);expect(p.glideOn).toBe(false);expect(p.airJumps).toBe(0);expect(p.ride).toMatchObject({meshKind:'raft',steer:6,airJumps:0});
 setPlayerRide(p,null);setPlayerRide(p,{mesh:'raft'});expect(p.ride.mesh).toBe(raft);setPlayerRide(p,{speed:10.5});expect(p.ride.meshKind).toBe('vacuum');expect(p.ride.mesh).not.toBe(raft);expect(p.ride.airJumps).toBeUndefined();const g=vi.spyOn(raft.children[0].geometry,'dispose');releasePlayerRaft(p,raft);releasePlayerRaft(p,raft);expect(g).toHaveBeenCalledTimes(1);expect(p.ride.meshKind).toBe('vacuum');
});
test('actual Player acceleration uses authored steering, boost maximum and slick rate without changing legacy defaults',()=>{
 const p=player(),track=new Track(turtle([0,0,0],[[80,0,0]]));const stage={track,world:new World()};setPlayerRide(p,{speed:10.5});p.ride.speedK=1;stepRide(p,stage,1,1);expect(p.vel.x).toBeCloseTo(6.8);expect(p.vel.z).toBeCloseTo(-10.5);
 setPlayerRide(p,{mesh:'raft',speed:11,steer:6,boost:[[0,20,1.3],[0,20,1.1]]});p.ride.speedK=1;p.vel.set(0,0,0);stepRide(p,stage,1,1);expect(p.vel.x).toBeCloseTo(6);expect(p.vel.z).toBeCloseTo(-14.3);
 p.vel.set(0,0,0);p.ride.slick=.25;stepRide(p,stage,-1,.1);expect(Math.hypot(p.vel.x,p.vel.z)).toBeCloseTo(1.2);expect(p.ride.slick).toBeCloseTo(.15);releasePlayerRaft(p,p.ride.mesh);
});
