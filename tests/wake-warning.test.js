import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { Projectiles } from '../src/bosses/common.js';
it('keeps a warning wake harmless until explicitly armed, preserving default live wakes and Dust passage',()=>{
 const player={pos:new THREE.Vector3(3.4,0,0),dead:false,biteT:0,vel:new THREE.Vector3(),hurt:vi.fn()};
 const game={player},stage={scene:new THREE.Scene()};const shots=new Projectiles(game,stage);
 const wake=shots.wakeRing(0,0);wake.active=false;shots.update(.1);expect(player.hurt).not.toHaveBeenCalled();
 wake.active=true;shots.update(.1);expect(player.hurt).toHaveBeenCalledOnce();shots.clear();player.hurt.mockClear();
 shots.wakeRing(0,0);shots.update(.1);expect(player.hurt).toHaveBeenCalledOnce();player.hurt.mockClear();
 player.dustDashT=.1;shots.update(.1);expect(player.hurt).not.toHaveBeenCalled();shots.clear();
});
