import { test,expect,vi } from 'vitest';
import * as THREE from 'three';
import { CoconutRoller } from '../src/entities/props.js';
import { measureTicketBudget } from '../src/game/measureTicketBudget.js';
import { rawTicketsForWhole,COCONUT_CAP_PER_CLEAR } from '../src/config/tickets.js';
function fixture(options={}) {
 const player={pos:new THREE.Vector3(20,0,0),body:{s:5},dead:false,biteT:.2,vel:{y:0},hurt:vi.fn(),bounce:vi.fn()};
 const session={coconutSpawned:rawTicketsForWhole(COCONUT_CAP_PER_CLEAR),coconutSeq:7,collectedCoconuts:new Set()};
 const game={player,session,fx:{burst:vi.fn()},tickets:{spawnFlying:vi.fn()}};
 const stage={game,entities:[],scene:new THREE.Scene(),dispose(){this.scene.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};
 const track={groundAt:()=>({y:0}),heightAt:()=>0,toWorld:(s,u,y,out=new THREE.Vector3())=>out.set(u,y,-s)};
 const roller=new CoconutRoller(stage,track,10,{every:.1,speed:0,lanes:[0],until:0,...options});stage.entities.push(roller);return{player,session,game,stage,roller};
}
test('barrels keep spawning beyond the ordinary coconut lifetime cap without paying or consuming its counters',()=>{
 const {roller,session,stage,game,player}=fixture({mesh:'barrel',reward:false});
 for(let i=0;i<5;i++)roller.update(.6);
 expect(roller.balls).toHaveLength(5);expect(session.coconutSpawned).toBe(rawTicketsForWhole(COCONUT_CAP_PER_CLEAR));expect(session.coconutSeq).toBe(7);
 expect(measureTicketBudget(stage,{list:[]})).toMatchObject({coconut:false,packs:0,field:0});
 player.pos.set(0,0,-10);player.ride={};roller.update(0);expect(player.hurt).toHaveBeenCalledWith('splash',0,-10);expect(game.tickets.spawnFlying).not.toHaveBeenCalled();expect(player.bounce).not.toHaveBeenCalled();
 player.hurt.mockClear();player.ride=null;player.vel.y=-5;roller.update(0);expect(player.hurt).toHaveBeenCalledWith('flat',0,-10);expect(player.bounce).not.toHaveBeenCalled();
});
test('ordinary coconuts retain their cap, counters, bite reward and budget allowance',()=>{
 const {roller,session,stage,game,player}=fixture();roller.update(1);expect(roller.balls).toHaveLength(0);
 session.coconutSpawned=0;roller.timer=0;roller.update(0);expect(roller.balls).toHaveLength(1);expect(session.coconutSeq).toBe(8);expect(session.coconutSpawned).toBe(1);
 player.pos.set(0,0,-10);roller.update(0);expect(game.tickets.spawnFlying).toHaveBeenCalledWith(0,.45,-10,1,'coconut');expect(session.collectedCoconuts.has(8)).toBe(true);expect(player.hurt).not.toHaveBeenCalled();expect(measureTicketBudget(stage,{list:[]})).toMatchObject({coconut:true});
});
test('barrel-owned resources dispose exactly once, including after all balls leave the scene',()=>{
 const {roller,stage}=fixture({mesh:'barrel',reward:false});roller.update(1);roller.reset();
 const spies=[roller.geo,roller.mat,roller.bandGeo,roller.bandMat].map(r=>vi.spyOn(r,'dispose'));stage.dispose();stage.dispose();roller.dispose();for(const s of spies)expect(s).toHaveBeenCalledTimes(1);
});
