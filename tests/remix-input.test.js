import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { input } from '../src/core/input.js';
import { Game } from '../src/game/game.js';
import { save } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
let buttons;
beforeEach(()=>{resetWorld();input.clear();input.codes.clear();input.down.clear();input.pad.held.clear();buttons=Array.from({length:16},()=>({pressed:false}));vi.stubGlobal('navigator',{getGamepads:()=>[{connected:true,axes:[0,0],buttons}]});input.poll();});
afterEach(()=>{input.clear();input.codes.clear();input.down.clear();input.pad.held.clear();vi.unstubAllGlobals();});
function game(){return{mapSel:1,mapRemix:false,_drawMap:vi.fn(),toTitle:vi.fn(),openSystemMenu:vi.fn()};}
it('uses actual R keyboard edges to toggle only after Queen unlock',()=>{
 const g=game();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'}));input.poll();
 Game.prototype.updateMap.call(g);expect(g.mapRemix).toBe(false);
 window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyR'}));input.poll();save.data.beaten[5]=true;
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'}));input.poll();Game.prototype.updateMap.call(g);
 expect(g.mapRemix).toBe(true);expect(g.toTitle).not.toHaveBeenCalled();
});
it('uses RT for Remix while preserving its ordinary slide action',()=>{
 const g=game();buttons[7].pressed=true;input.poll();expect(input.held('slide')).toBe(true);expect(input.pressed('remix')).toBe(true);
 Game.prototype.updateMap.call(g);expect(g.mapRemix).toBe(false);
 buttons[7].pressed=false;input.poll();save.data.beaten[5]=true;buttons[7].pressed=true;input.poll();Game.prototype.updateMap.call(g);
 expect(g.mapRemix).toBe(true);expect(g.toTitle).not.toHaveBeenCalled();
});
it('keeps B as back (the map menu) and does not turn LB/LT into a Remix action',()=>{
 save.data.beaten[5]=true;const g=game();buttons[1].pressed=true;input.poll();Game.prototype.updateMap.call(g);
 expect(g.openSystemMenu).toHaveBeenCalledWith('map');expect(g.toTitle).not.toHaveBeenCalled();expect(g.mapRemix).toBe(false);expect(input.pressed('remix')).toBe(false);
 for(const n of [4,6]){buttons.forEach(b=>b.pressed=false);input.poll();buttons[n].pressed=true;input.poll();expect(input.pressed('remix')).toBe(false);}
});
