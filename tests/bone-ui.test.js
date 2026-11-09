import * as THREE from 'three';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { UI } from '../src/ui/ui.js';
import { Assets } from '../src/art/assets.js';
import { HiddenBone, installBoneHelpers } from '../src/entities/hiddenBone.js';
import { save } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
beforeEach(() => { resetWorld(); vi.spyOn(Assets, 'url').mockReturnValue('/bone.png'); vi.spyOn(Assets, 'tex').mockReturnValue(new THREE.Texture()); vi.spyOn(Assets, 'aspect').mockReturnValue(1); });
afterEach(() => vi.restoreAllMocks());
it('renders six main slots and exactly three bonus slots with saved and live states distinct', () => {
 save.data.bones[1] = true;
 const el = document.createElement('div');
 el.innerHTML = UI.prototype.boneBoard(1, { run: { goodBoy: true, snack: 2 } });
 expect(el.querySelectorAll('[data-bone]')).toHaveLength(6);
 expect(el.querySelector('[data-bone="golden"]').style.filter).toBe('none');
 expect(el.querySelector('[data-bone="goodBoy"]').style.filter).toContain('grayscale');
 expect(el.querySelector('[data-bone="snack3"]').style.opacity).toBe('0.18');
 el.innerHTML = UI.prototype.boneBoard('ride', { bonus: true });
 expect(el.querySelectorAll('[data-bone]')).toHaveLength(3);
});
it('builds a cyan placeholder ghost for a saved hidden bone, and builds none in excluded contexts', () => {
 save.data.boneBoard[1] = { hidden: true };
 const game = { session: { level: 1 } }, stage = { game, add: vi.fn((e) => e) };
 const hidden = new HiddenBone(stage, 0, 0, 0);
 expect(hidden.bone.material.color.getHex()).toBe(0x74ffff);
 expect(hidden.bone.material.opacity).toBe(0.22);
 const k = { W: (x,y,z) => ({ x,y,z }) }; installBoneHelpers(k, game, stage);
 for (const flag of ['trial','remix','rush']) { game.session = { [flag]: true }; expect(k.hiddenBone(0,0,0)).toBeNull(); }
 expect(stage.add).not.toHaveBeenCalled();
});
