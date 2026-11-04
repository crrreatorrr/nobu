import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
vi.mock('../src/art/assets.js', () => ({ Assets: { model: () => null } }));
import { Chaser, chaseSpeed, chaseDda } from '../src/entities/chaser.js';
import { Track, turtle } from '../src/world/track.js';
import { GameCamera } from '../src/camera/camera.js';
function fixture(opts = {}) {
  const track = new Track(turtle([0,0,0], [[200,0,0]])); track.ground(-30,210);
  const player = { pos: track.toWorld(20), body: { s:20,u:0 }, dead:false, die:vi.fn(function(){this.dead=true;}) };
  const game = { player, camera: new GameCamera(1), ui:{banner:vi.fn()}, fx:{dust:vi.fn()}, session:{cp:{pos:player.pos.clone()}, deathsAtCp:0} };
  const stage = { game, defaultCamera:{mode:'track',track}, scene:new THREE.Scene() };
  const chase = new Chaser(stage,track,20,100,opts);
  return {chase,track,game,player};
}
describe('Chaser runtime', () => {
  it('starts only in its segment and restores the default camera at the end', () => {
    const {chase,player,game}=fixture({model:'giant_coconut',scale:2});
    player.body.s=19; chase.update(.1); expect(chase.state).toBe('idle');
    player.body.s=20; chase.update(.1); expect(chase.state).toBe('wait'); expect(chase.s).toBe(7); expect(game.camera.mode).toBe('trackFront');
    player.body.s=100; chase.update(.1); expect(chase.state).toBe('done'); expect(game.camera.mode).toBe('track');
  });
  it('preserves the original cat speed trajectory on flat ground', () => {
    const rig = {root:new THREE.Group(),gait:0,pose(_m,dt,s=1){this.gait+=dt*(7.5+5.5*Math.min(s,1.5));}};
    const {chase,player}=fixture({legacy:true,rig,speed:6.7}); chase.begin(7,0);
    let expected=2.5, cs=7;
    // Original loop measures gap before advancing and damps with k=2.
    chase.update(1/240);
    for(let i=0;i<2400;i++) {
      player.body.s+=8/240;
      const gap=player.body.s-cs;
      const target=gap<5?6.7:gap<9?6.7+(gap-5)*.375:Math.min(10.5,8.2+(gap-9)*.575);
      expected+=(target-expected)*(1-Math.exp(-2/240)); cs+=expected/240;
      chase.update(1/240);
      expect(chase.s).toBeCloseTo(cs,9); expect(chase.speed).toBeCloseTo(expected,9);
    }
    expect(player.die).not.toHaveBeenCalled();
  });
  it('restores wait/idle/done from the checkpoint with independent chases', () => {
    const {chase,game,track}=fixture();
    game.session.cp.pos.copy(track.toWorld(50)); chase.onRespawn(); expect(chase.s).toBeCloseTo(37); expect(chase.waitT).toBe(1.6);
    game.session.cp.pos.copy(track.toWorld(5)); chase.onRespawn(); expect(chase.state).toBe('idle');
    game.session.cp.pos.copy(track.toWorld(105)); chase.onRespawn(); expect(chase.state).toBe('done');
  });
  it('keeps the active segment camera when later idle chases reset', () => {
    const {chase,game,track}=fixture(); const later = new Chaser(chase.stage,track,120,150,{});
    game.session.cp.pos.copy(track.toWorld(50));chase.onRespawn();later.onRespawn();expect(game.camera.mode).toBe('trackFront');expect(game.camera.chaseOwner).toBe(chase);
    game.session.cp.pos.copy(track.toWorld(130));chase.onRespawn();later.onRespawn();expect(game.camera.chaseOwner).toBe(later);
    game.session.cp.pos.copy(track.toWorld(5));chase.onRespawn();later.onRespawn();expect(game.camera.mode).toBe('track');
  });
  it('shares a track position across model lanes and applies model/scale', () => {
    const {chase}=fixture({model:'model_mini_roomba',scale:2,count:3,lanes:[-2.2,0,2.2]});
    expect(chase.rig.parts.map(p=>p.position.x)).toEqual([-2.2,0,2.2]); expect(chase.rig.parts[0].scale.x).toBe(2);
    chase.update(.1); expect(chase.count).toBe(3);
  });
  it('uses cone death for smog, and god mode holds the minimum gap', () => {
    const {chase,player}=fixture({model:'smog_wall'}); chase.begin(19,0); chase.update(.01); chase.update(.01); expect(player.die).toHaveBeenCalledWith('cone');
    player.dead=false; player.god=true; chase.state='run'; chase.s=20; chase.update(.01); expect(chase.s).toBeCloseTo(player.body.s-2.4);
  });
  it('rolls into pits, reappears beyond the far lip, and still leaps raised logs', () => {
    const {chase,track,player}=fixture({model:'giant_coconut'});track.spans=[];track.ground(-30,35);track.ground(40,200);player.body.s=50;
    chase.begin(32.3,0);chase.update(.01);chase.update(.01);expect(chase.pitT).toBe(.6);expect(chase.visible).toBe(false);
    for(let i=0;i<61;i++)chase.update(.01);expect(chase.visible).toBe(true);expect(chase.s).toBeGreaterThan(40);
    track.spans=[];track.ground(-30,200);track.ground(35,36,{dy:1});chase.begin(32.3,0);chase.update(.01);chase.update(.01);expect(chase.leap).not.toBe(null);expect(chase.pitT).toBeLessThanOrEqual(0);
  });
  it('scales only rubber-band slopes and excludes competitive modes from DDA', () => {
    expect(chaseSpeed(4,6.7,2)).toBe(6.7); expect(chaseSpeed(7,6.7,2)).toBe(8.2);
    expect(chaseDda({deathsAtCp:5})).toBe(.92);
    for(const mode of ['trial','remix','medalRun','rush']) expect(chaseDda({deathsAtCp:8,[mode]:true})).toBe(1);
  });
});
