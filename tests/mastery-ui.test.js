import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { Assets } from '../src/art/assets.js';
import { save } from '../src/core/save.js';
import { trialMastery } from '../src/game/mastery.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{resetWorld();vi.spyOn(Assets,'url').mockImplementation(id=>'/'+id);});
afterEach(()=>vi.restoreAllMocks());
it('renders saved Perfect paws and beaten shipped boss medals, revealing Platinum targets only after gold',()=>{
 save.data.beaten[1]=true;save.data.perfect[1]=true;save.data.bossMedals.bird={clear:true,noHit:true,speed:true,bestMs:69000};save.data.bossMedals.queen={clear:true,noHit:true,speed:true,bestMs:1};
 const screen=document.createElement('div'),game={mapSel:1,exchangeOpen:false,player:{abilities:{}},ui:{screen,setScreen(html){screen.innerHTML=html;},boneBoard:()=>'<div data-board></div>'},_worldLine:()=>''};
 Game.prototype._drawMap.call(game);expect(screen.querySelector('.perfect-paw')).not.toBeNull();expect(screen.querySelector('[data-boss-medals="bird"]').textContent).toContain('Speed 1:09.00 / 1:10.00 ✓');expect(screen.textContent).not.toContain('PUMP QUEEN');expect(screen.textContent).not.toContain('💎');
 save.data.trials[1]=trialMastery(1,{ms:52000,best:52,layout:1,godUsed:false});Game.prototype._drawMap.call(game);expect(screen.textContent).toContain('💎 0:50.00');
 save.data.trials[1]=trialMastery(1,{ms:45000,best:45,layout:1,godUsed:true,bestEligibleMs:49000});Game.prototype._drawMap.call(game);expect(screen.textContent).toContain('Eligible best 0:49.00');
 game.mapSel='kennel';save.data.open.kennel=true;Game.prototype._drawMap.call(game);expect(screen.querySelector('[data-boss-medals]')).toBeNull();expect(screen.querySelector('[data-board]')).toBeNull();expect(screen.querySelector('.map-panel').textContent).not.toContain('💎');
});
