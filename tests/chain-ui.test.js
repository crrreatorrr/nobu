import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { UI } from '../src/ui/ui.js';
import { Game } from '../src/game/game.js';
import { Assets } from '../src/art/assets.js';
import { audio } from '../src/audio/audio.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { LEVEL_DOGS } from '../src/levels/metadata.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{resetWorld();vi.spyOn(Assets,'url').mockImplementation(id=>'/'+id);vi.spyOn(audio,'play').mockImplementation(()=>{});vi.spyOn(audio,'playMusic').mockImplementation(()=>{});});
afterEach(()=>vi.restoreAllMocks());
function ui(){const result=new UI(document.createElement('div'));result.fade=vi.fn();result.say=async()=>{};return result;}
it('keeps combo hidden below two and fades its final number in .6 seconds even while the normal HUD is pinned',()=>{
 const u=ui();u.showHud();expect(u.slots.chain.el.classList.contains('show')).toBe(false);
 u.chain(1);expect(u.slots.chain.el.classList.contains('show')).toBe(false);
 u.chain(5);u.update(10);expect(u.slots.chain.v.textContent).toBe('x5');expect(u.slots.chain.el.classList.contains('show')).toBe(true);
 u.pinHud(true);u.chain(5,{ended:true});u.update(.59);expect(u.slots.chain.el.classList.contains('show')).toBe(true);
 u.update(.02);expect(u.slots.chain.el.classList.contains('show')).toBe(false);
 u.showHud();expect(u.slots.chain.el.classList.contains('show')).toBe(false);
});
it('wires actual results to the H11 six/three-slot board and keeps main-level continuation',async()=>{
 const u=ui(),g={ui:u,player:{abilities:{}},toMap:vi.fn()};
 save.data.boneBoard[1]={golden:true,goodBoy:true,hidden:true,snack:3};
 const fresh=['golden'],stats={broken:10,breakables:10,dogs:5,dogsTotal:5,tickets:20,bestChain:15,chainRecord:true};
 Game.prototype._showComplete.call(g,1,stats,fresh);
 expect(u.screen.querySelectorAll('[data-bone]')).toHaveLength(6);expect(u.screen.querySelector('[data-bone="golden"]').style.opacity).toBe('0.18');
 const pressed=vi.spyOn(input,'anyPressed').mockReturnValue(false);
 await Game.prototype.updateComplete.call(g,g.tally.duration+.1);
 expect(u.screen.querySelector('[data-bone="golden"]').style.opacity).toBe('1');expect(u.screen.textContent).toContain('NEW BEST CHAIN');expect(fresh).toEqual(['golden']);
 pressed.mockReturnValue(true);await Game.prototype.updateComplete.call(g,.1);expect(g.toMap).toHaveBeenCalledWith(2);
 Game.prototype._showComplete.call(g,'ride',stats,[],true);expect(u.screen.querySelectorAll('[data-bone]')).toHaveLength(3);
});
it('uses real section goal copy on the map and pause screen without inventing saved performance',()=>{
 const u=ui();save.data.lastMiss[1]={'Lily Pond':2};
 for(const id of Object.keys(LEVEL_DOGS[1]))save.data.dogsFreed['1:'+id]=true;
 const g={ui:u,mapSel:1,player:{abilities:{}},_pauseItems:()=>[],session:{level:1,phase:'level',def:{bonus:false},stage:{},liveStats:()=>({broken:8,breakables:10,dogs:5,dogsTotal:5,deathsAtGate:5,snackRaw:0,snackPotential:100,sectionMiss:{'Lily Pond':2},missedDogs:{}})}};
 Game.prototype._drawMap.call(g);expect(u.screen.querySelector('.map-panel').textContent).toContain('2 backpacks missed near Lily Pond');
 expect(u.screen.querySelector('.map-panel').textContent).not.toContain('? deaths');
 Game.prototype._drawPause.call(g);expect(u.screen.textContent).toContain('2 backpacks missed near Lily Pond');
});
it.each([false,true])('keeps trialDone continuation separate from tally state (prior normal tally: %s)',async(prior)=>{
 const u=ui(),g={ui:u,player:{abilities:{}},toMap:vi.fn()};
 if(prior)Game.prototype._showComplete.call(g,1,{broken:1,breakables:2,dogs:0,dogsTotal:5,tickets:1,bestChain:5},[]);
 Game.prototype.trialDone.call(g,{level:1},60,'silver',true);
 expect(g.completeMode).toBe('trial');expect(g.tally).toBeNull();
 const pressed=vi.spyOn(input,'anyPressed').mockReturnValue(true);
 await Game.prototype.updateComplete.call(g,1);expect(g.toMap).not.toHaveBeenCalled();
 await Game.prototype.updateComplete.call(g,1.31);expect(g.toMap).toHaveBeenCalledWith(1);
 expect(save.data.tutorials.tallySeen).not.toBe(true);expect(save.data.chainBadges).toEqual({});
});
