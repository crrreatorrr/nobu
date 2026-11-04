import { describe,expect,it,vi } from 'vitest';
import * as THREE from 'three';
import { Glowworm } from '../src/entities/glowworm.js';
import { Track,turtle } from '../src/world/track.js';
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
describe('Lumi lifecycle in dark detours',()=>{
  it('places nests above the path, sleeps without spending energy, and wakes behind the checkpoint',()=>{
    const context={createRadialGradient:()=>({addColorStop(){}}),fillRect(){}};
    const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
    try {
      const track=new Track(turtle([0,0,0],[[100,0,0]]));track.ground(0,100);
      const player={pos:track.toWorld(40,0,10),body:{s:40}},stage={scene:new THREE.Scene(),game:{player,ui:{banner:vi.fn()},fx:{sparkle:vi.fn()}}};
      const lumi=new Glowworm(stage,track,[20,35,50],{baseY:10});
      expect(lumi.nests.map(n=>n.pos.y)).toEqual([10,10,10]);
      lumi.sleep(true);lumi.update(4);expect(lumi.state).toBe('sleep');expect(lumi.energy).toBe(1);expect(lumi.light.intensity).toBe(0);
      lumi.wake(40);expect(lumi.state).toBe('follow');expect(lumi.pos.z).toBeCloseTo(-35);expect(lumi.pos.y).toBeCloseTo(11.9);expect(lumi.energy).toBe(1);
      lumi.zoneRadius=5;lumi.update(.1);expect(lumi.light.distance).toBe(8);
      lumi.sleep();lumi.update(1.2);expect(lumi.state).toBe('sleep');expect(lumi.visible).toBe(false);
    } finally { canvas.mockRestore(); }
  });
});
