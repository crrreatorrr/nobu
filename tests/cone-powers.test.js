import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{model:()=>null,tex:()=>new THREE.Texture(),tiled:()=>new THREE.Texture(),has:()=>false,aspect:()=>1}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import { ConeArena, ConeTiles, CONE_PEDESTALS, RUG_PATTERNS, buildConeArena } from '../src/bosses/coneArena.js';
import { EvilCone, CONE_PLANS, CONE_CHAINS } from '../src/bosses/evilCone.js';
import { Projectiles, pullToward } from '../src/bosses/common.js';
import { World, moveBody } from '../src/world/physics.js';
import { Stage } from '../src/world/stage.js';
import { buildBoss3Arena } from '../src/levels/level3.js';
import { TUNING } from '../src/config/movement.js';
import { Player } from '../src/player/player.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';

const noop = ()=>{};
const gradient = {addColorStop:noop};
beforeEach(()=>{vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,measureText:()=>({width:100})},{get:(o,k)=>k==='then'?undefined:o[k]??noop}));});
afterEach(()=>vi.restoreAllMocks());
function fixture() {
  const player={pos:new THREE.Vector3(0,0,9),vel:new THREE.Vector3(),body:{grounded:true},forward:new THREE.Vector3(0,0,1),biteT:-1,dead:false,hurt:vi.fn(),die:vi.fn(),cone:vi.fn()};
  const fx=new Proxy({sparks:{spawn:vi.fn()}},{get:(o,k)=>o[k]??(o[k]=vi.fn())});
  const game={player,fx,camera:{shake:vi.fn()},ui:{bossHp:vi.fn(),banner:vi.fn()},session:{onBossPhase:vi.fn(),onBossDefeated:vi.fn()}};
  const stage={game,scene:new THREE.Scene(),world:new World(),entities:[],add(e){this.entities.push(e);this.scene.add(e.obj);return e;}};
  game.session.stage=stage; game.session.projectiles=new Projectiles(game,stage);
  const pieces=buildConeArena(stage),boss=new EvilCone(stage,0,0,-6); stage.add(boss); game.session.boss=boss;boss.active=true;
  return {player,game,stage,boss,...pieces};
}

describe('Cone tiled arena fairness and rollback',()=>{
  it('builds the real arena with36 floor Solids, exact compass pedestals and unchanged7 arena pickups',()=>{
    const {game}=fixture();vi.spyOn(Stage.prototype,'decor').mockImplementation(noop);
    const stage=new Stage(game,'boss3'),tickets={add:vi.fn()}; const info=buildBoss3Arena(game,stage,tickets);
    expect(info.tiles.tiles).toHaveLength(36);expect(info.pedestals.map(p=>[p.pos.x,p.pos.z])).toEqual(CONE_PEDESTALS);
    expect(stage.world.all.filter(s=>s.kind==='static')).toHaveLength(0);expect(tickets.add).toHaveBeenCalledTimes(7);
    expect(info.spawn.toArray()).toEqual([0,0,9]);expect(stage.world.groundBelow(10,1,10)).toBe(0);
  });
  it('caps every pattern at50%, preserves ring/cross standing tiles, and protects all S3 pedestal supports',()=>{
    const {player,tiles}=fixture();
    for(const phase of [2,3])for(const pattern of RUG_PATTERNS)for(const standing of tiles.tiles){
      player.pos.set(standing.x,0,standing.z);const missing=tiles.select(pattern,player,phase);
      expect(missing.length).toBeLessThanOrEqual(18);
      if(pattern==='ring'||pattern==='cross')expect(missing).not.toContain(standing);
      if(phase===3)for(const tile of missing)for(const[x,z]of CONE_PEDESTALS)expect(Math.abs(tile.x-x)<=3.7&&Math.abs(tile.z-z)<=3.7).toBe(false);
    }
  });
  it('keeps full rug tell collisions, drops for2seconds, returns over.4, and really exposes the pit',()=>{
    const {player,tiles,stage,coneArena}=fixture();tiles.begin('rows',player,.9,2);
    const tile=tiles.selected[0];tiles.update(.89);expect(tile.solid.enabled).toBe(true);expect(tile.mesh.material.map).toBeTruthy();
    tiles.update(.02);expect(tile.solid.enabled).toBe(false);expect(stage.world.groundBelow(tile.x,1,tile.z)).toBe(-Infinity);
    tiles.update(1.99);expect(tile.mesh.position.y).toBeCloseTo(-6.15);
    tiles.update(.2);expect(tile.solid.enabled).toBe(false);expect(tile.mesh.position.y).toBeCloseTo(-3.15);
    tiles.update(.201);expect(tile.solid.enabled).toBe(true);expect(tile.mesh.position.y).toBe(-.15);
    tiles.begin('rows',player,.4,2);tiles.update(.5);
    const pos=new THREE.Vector3(tile.x,0,tile.z),body={pos,vel:new THREE.Vector3(),hw:.3,hd:.3,h:1.3,grounded:false};
    for(let i=0;i<90;i++){body.vel.y-=TUNING.GRAVITY/120;moveBody(stage.world,body,1/120);}
    expect(pos.y).toBeLessThan(-2.2);player.pos.copy(pos);coneArena.update(.01);expect(player.die).toHaveBeenCalledWith('puff');
    coneArena.onRespawn();expect(tiles.tiles.every(t=>t.solid.enabled)).toBe(true);
  });
  it('raises pedestals only inS3 overone second and never overlaps floor-changing attacks',()=>{
    const {coneArena:a,player}=fixture();for(const p of a.pedestals){p.update(2);expect(p.top).toBe(0);}
    a.setPhase(3,true);for(const p of a.pedestals){p.update(.5);expect(p.top).toBe(.6);p.update(.5);expect(p.top).toBe(1.2);}
    expect(a.startRug('checker',player,.7,3)).toBe(true);expect(a.startSmog({tell:.84,aimTime:.56,eye:player.pos})).toBe(false);
    a.tiles.reset();expect(a.startSmog({tell:.84,aimTime:.56,eye:player.pos})).toBe(true);expect(a.startRug('rows',player,.7,3)).toBe(false);
    a.onRespawn();expect(a.smog).toBeNull();expect(a.fog.visible).toBe(false);
  });
  it('warns before smog damage, locks each beam to one pedestal and leaves adjacent destinations reachable',()=>{
    const {coneArena:a,player}=fixture();a.setPhase(3);for(const p of a.pedestals)p.update(1);
    player.pos.copy(a.pedestals[0].pos);a.startSmog({tell:.84,aimTime:.56,eye:new THREE.Vector3(0,4,-6)});
    a.update(.83);expect(player.hurt).not.toHaveBeenCalled();a.update(.22);expect(a.aim.x).toBe(4.2);
    player.pos.copy(a.pedestals[1].pos);a.update(.56);expect(a.aim.x).toBe(4.2);expect(player.hurt).not.toHaveBeenCalled();
    player.pos.y=0;a.update(.01);expect(player.hurt).toHaveBeenCalledWith('puff',player.pos.x,player.pos.z);
    a.stopSmog();a.startSmog({tell:1.19,duration:6,ultimate:true,eye:player.pos});
    const safe=a.pedestals.filter(p=>p.safe);expect(safe).toHaveLength(2);expect(safe[0].pos.distanceTo(safe[1].pos)).toBeCloseTo(4.2*Math.SQRT2);
    for(const p of a.pedestals)p.update(1);expect(a.pedestals.filter(p=>p.top===.6)).toHaveLength(2);
  });
  it('lands every5.94m adjacent pedestal hop through actual keyboard-shaped Player movement, with and without Crown',()=>{
    save.reset();save.data.godMode=false;save.data.beaten={};
    const {game,stage,boss,coneArena:a}=fixture();boss.active=false;boss.interactive=false;a.setPhase(3);for(const p of a.pedestals)p.update(1);
    stage.killYAt=()=>-14;game.stage=stage;game.onPlayerDeath=vi.fn();game.onFlop=vi.fn();
    game.loadout={effects:{},cosmeticSlots:()=>({})};
    const p=Object.create(Player.prototype);
    Object.assign(p,{game,pos:new THREE.Vector3(),vel:new THREE.Vector3(),root:new THREE.Group(),model:{},wings:new THREE.Group(),halo:new THREE.Group(),stars:new THREE.Group(),deathCone:new THREE.Group(),_animate:noop,_updateShadow:noop,_paintGear:noop});
    p.body={pos:p.pos,vel:p.vel,h:1.3,hw:.3,hd:.3,onLand:(...args)=>p._onLand(...args)};game.player=p;
    let pressed=false;vi.spyOn(input,'pressed').mockImplementation(key=>key==='jump'&&pressed);vi.spyOn(input,'held').mockImplementation(key=>key==='jump');
    const basis={right:{x:1,z:0},forward:{x:0,z:1}};
    for(const crown of [false,true])for(let from=0;from<4;from++)for(const direction of [-1,1]){
      game.loadout.effects=crown?{extra_air_jumps:{count:1}}:{};
      const start=a.pedestals[from],end=a.pedestals[(from+direction+4)%4];
      p.spawnAt(start.pos.clone());p.body.grounded=true;p.body.ground=start.solid;
      const dx=end.pos.x-start.pos.x,dz=end.pos.z-start.pos.z,distance=Math.hypot(dx,dz);
      expect(distance).toBeCloseTo(5.94,2);
      let landed=false,air=false;
      for(let tick=0;tick<180;tick++){
        const along=((p.pos.x-start.pos.x)*dx+(p.pos.z-start.pos.z)*dz)/distance;
        input.state.x=along<distance?Math.sign(dx):0;input.state.y=along<distance?Math.sign(dz):0;
        pressed=tick===0||tick===48;stage.world.beginFrame();p.update(1/120,stage,basis);
        if(!p.body.grounded)air=true;
        if(air&&p.body.ground===end.solid){landed=true;break;}
      }
      expect(landed,`hop${from}→${(from+direction+4)%4},crown${crown}`).toBe(true);
      expect(p.pos.y).toBeCloseTo(1.2);expect(p.mode).toBe('normal');
    }
    input.state.x=0;input.state.y=0;
  });
});

describe('authored Cone attacks, tells and chains',()=>{
  it('has exact stage plans and chains, with full DDA tells on actual Shame firing',()=>{
    const {boss,game}=fixture();expect(CONE_PLANS[3]).toContain('tide');expect(CONE_CHAINS[3][0]).toEqual(['vortex','grab','spiral']);
    boss.beginAttack('shame');boss.stateT=.77;boss.ai(.01);expect(game.session.projectiles.list).toHaveLength(1);
    game.session.projectiles.clear();boss.beginAttack('shame');boss.dda.tele=1.15;boss.stateT=.77;boss.ai(.01);expect(game.session.projectiles.list).toHaveLength(0);
    boss.stateT=.83;boss.ai(.01);expect(game.session.projectiles.list).toHaveLength(1);
  });
  it('fires S3 Shame homers exactly.6seconds apart and they can be outrun without biting',()=>{
    const {boss,player,game}=fixture();boss.phase=3;boss.beginAttack('shame');boss.stateT=.56;boss.ai(.01);
    boss.stateT=1.15;boss.ai(.01);expect(game.session.projectiles.list).toHaveLength(1);
    boss.stateT=1.16;boss.ai(.01);expect(game.session.projectiles.list).toHaveLength(2);
    for(let i=0;i<1201;i++){player.pos.z+=8/240;game.session.projectiles.update(1/240);}
    expect(player.cone).not.toHaveBeenCalled();expect(game.session.projectiles.list).toHaveLength(0);
  });
  it('continues vortex>grab>spiral only after the full bonus punish, and cancels on a player hit',()=>{
    const {boss}=fixture();boss.phase=3;expect(boss.startChain(CONE_CHAINS[3][0])).toBe(true);
    boss.stateT=boss.tele(.6)+2.8+.001;boss.ai(.01);expect(boss.state).toBe('grab');expect(boss.stateT).toBe(0);
    boss.slammed=true;boss.grabHit=false;boss.stuckT=1.3/Math.sqrt(boss.sp)-.02;boss.stateT=2;boss.ai(.01);expect(boss.state).toBe('grab');expect(boss.vulnerable).toBe(true);
    boss.ai(.02);expect(boss.state).toBe('spiral');expect(boss.stateT).toBe(0);
    boss.clearChain();boss.sinceHurt=.1;expect(boss.startChain(CONE_CHAINS[3][0])).toBe(false);
  });
  it('reverses S2 ultimate spokes halfway and S3 ends with onlytwo safe platforms and longHeat',()=>{
    const {boss,coneArena:a}=fixture();boss.phase=2;boss.beginAttack('ultimate');boss.stateT=boss.tele(1.7)+2.4;boss.ai(.01);const angle=boss.ultA;
    boss.stateT=boss.tele(1.7)+2.6;boss.ai(.01);expect(boss.ultA).toBeLessThan(angle);
    boss.endUlt();boss.ultStarted=false;boss.phase=3;a.setPhase(3,true);for(const p of a.pedestals)p.update(1);
    boss.beginAttack('ultimate');boss.stateT=.01;boss.ai(.01);expect(a.pedestals.filter(p=>p.safe)).toHaveLength(2);
    expect(a.fog.visible).toBe(true);boss.stateT=boss.tele(1.7)+6.01;boss.ai(.01);
    expect(a.smog).toBeNull();expect(boss.state).toBe('overheat');expect(boss.longHeat).toBe(true);
    boss.resetToPhase(3);expect(a.tiles.tiles.every(t=>t.solid.enabled)).toBe(true);expect(a.fog.visible).toBe(false);
  });
  it('shares clamped vortex coefficients through the common overload and ignores dead-player pushes',()=>{
    const {boss,player}=fixture();player.pos.set(3,0,4);boss.pos.set(0,2,0);
    expect(pullToward(boss,3.6,0)).toBe(5);const force=3.6*(1.4-5/14);
    expect(player.pushX).toBeCloseTo(-3/5*force);expect(player.pushZ).toBeCloseTo(-4/5*force);
    player.pushX=0;player.pushZ=0;player.dead=true;expect(pullToward(boss,3.6,.1)).toBe(5);expect(player.pushX).toBe(0);
    player.dead=false;pullToward(player,{x:6,z:8},4);expect(player.pushX).toBeCloseTo(2.4);expect(player.pushZ).toBeCloseTo(3.2);
  });
});
