import * as THREE from 'three';
import { it, expect, vi, beforeEach } from 'vitest';
vi.mock('../src/entities/fx.js', () => ({ makeShadow: () => new THREE.Group(), placeShadow() {}, textSprite() {}, textTexture() {}, FX: class {} }));
import { Assets } from '../src/art/assets.js';
import { createChain, resetChain } from '../src/game/rewards.js';
import { hitSessionChain, finishSessionChain, updateSessionChain, removeChainDrops } from '../src/game/chain.js';
import { audio } from '../src/audio/audio.js';
function session(pit = false) {
  const scene = new THREE.Scene();
  const game = { player: { pos: new THREE.Vector3(2,3,4), facing: Math.PI / 2, body: { grounded: false } }, ui: { chain: vi.fn(), banner: vi.fn() }, camera: { shake: vi.fn() } };
  const s = { game, phase:'level', chain:createChain(), seq:0, nextSeq() { return ++this.seq; } };
  s.stage = { game, scene, entities:[], track:{ project:()=>({s:10,u:0}),groundAt:()=> pit ? null : { y:0 } }, add(e) { this.entities.push(e); scene.add(e.obj); return e; } };
  game.session = s; return s;
}
beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(Assets,'tex').mockReturnValue(new THREE.Texture()); vi.spyOn(audio,'play').mockImplementation(() => {}); });
it('spawns a real noncountable sphere ahead at eight, punches at five/ten and never changes Tickets', () => {
  const s = session(); for(let i=0;i<16;i++) hitSessionChain(s, {});
  expect(s.stage.entities).toHaveLength(1); const e = s.stage.entities[0];
  expect(e.kind).toBe('sphere'); expect(e.countable).toBe(false); expect(e.chainDrop).toBe(true);
  expect(e.pos.x).toBeCloseTo(3.2); expect(e.pos.y).toBe(3); expect(e.pos.z).toBeCloseTo(4);
  expect(s.game.camera.shake.mock.calls).toEqual([[0.12,0.12],[0.2,0.15]]);
  expect(s.game.ui.banner).toHaveBeenCalledOnce(); expect(s.levelTickets).toBeUndefined();
  finishSessionChain(s); expect(s.chain.best).toBe(16);
  for(let i=0;i<8;i++) hitSessionChain(s,{}); expect(s.stage.entities).toHaveLength(1);
});
it('falls back from a pit to Nobu, and rollback removes only chain drops after its snapshot', () => {
  const s = session(true); for(let i=0;i<8;i++) hitSessionChain(s,{});
  const old = s.stage.entities[0]; expect(old.pos.equals(s.game.player.pos)).toBe(true);
  const cp = s.seq; resetChain(s.chain,true); for(let i=0;i<8;i++) hitSessionChain(s,{});
  const late = s.stage.entities[1]; removeChainDrops(s,cp);
  expect(s.stage.entities).toEqual([old]); expect(late.obj.parent).toBeNull(); expect(late.dead).toBe(true);
  removeChainDrops(s); expect(s.stage.entities).toHaveLength(0); expect(old.obj.parent).toBeNull();
});
it('respects arena/trial contexts, partial ground time and the final-number HUD fade signal', () => {
  const s = session(); s.trial = true; for(let i=0;i<8;i++) hitSessionChain(s,{});
  expect(s.stage.entities).toHaveLength(0); updateSessionChain(s,4); expect(s.chain.n).toBe(8);
  s.game.player.body.grounded = true; updateSessionChain(s,1.1);
  expect(s.chain.n).toBe(0); expect(s.game.ui.chain).toHaveBeenLastCalledWith(8,{ended:true});
  s.phase='boss'; hitSessionChain(s,{}); expect(s.chain.n).toBe(0);
  s.phase='level'; hitSessionChain(s,{countable:false}); expect(s.chain.n).toBe(0);
});
