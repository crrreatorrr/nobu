import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Player } from '../src/player/player.js';
import { Stage } from '../src/world/stage.js';
import { World } from '../src/world/physics.js';
import { Track, turtle } from '../src/world/track.js';
function playerFixture(track) {
  const p=Object.create(Player.prototype);
  Object.assign(p,{game:{stage:{track}},body:{s:100,u:4,trackHint:99},pos:new THREE.Vector3(),root:new THREE.Group(),reset:vi.fn(),rechargeGuard:vi.fn()});
  return p;
}
describe('spawn path metadata before the first stage-controller frame',()=>{
  it('projects the actual spawn without reusing the death-location hint',()=>{
    const track=new Track(turtle([0,0,0],[[30,0,0],[30,35,0]])),p=playerFixture(track);
    const spawn=track.toWorld(7,1,0,new THREE.Vector3());
    p.spawnAt(spawn,track.yaw(7));
    const expected=track.project(spawn.x,spawn.z);
    expect(p.body.s).toBeCloseTo(expected.s);expect(p.body.u).toBeCloseTo(expected.u);expect(p.body.trackHint).toBe(expected.i);
    const observed=[];
    const stage={game:p.game,time:0,wind:{value:0},world:new World(),sun:{position:new THREE.Vector3(),target:{position:new THREE.Vector3()}},activeRange:100,_ambient(){},_emit(){},entities:[{alwaysActive:true,pos:spawn,update(){observed.push([p.body.s,p.body.u]);}}]};
    Stage.prototype.update.call(stage,1/60,p);
    expect(observed).toEqual([[expected.s,expected.u]]);
  });
  it('clears the old path metadata in an arena without a track',()=>{
    const p=playerFixture(null);p.spawnAt(new THREE.Vector3(2,3,4));
    expect(p.body.s).toBeUndefined();expect(p.body.u).toBeUndefined();expect(p.body.trackHint).toBeUndefined();
    expect(p.pos.toArray()).toEqual([2,3,4]);
  });
});
