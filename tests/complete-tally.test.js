import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { openCompleteTally, advanceCompleteTally } from '../src/game/completeTally.js';
import { Assets } from '../src/art/assets.js';
import { audio } from '../src/audio/audio.js';
import { save } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{ resetWorld(); vi.spyOn(Assets,'url').mockImplementation(id=>'/'+id); vi.spyOn(audio,'playMusic').mockImplementation(()=>{}); vi.spyOn(audio,'play').mockImplementation(()=>{}); });
afterEach(()=>vi.restoreAllMocks());
function game() {
 const screen=document.createElement('div');
 return { ui:{ screen,setScreen(html){screen.innerHTML=html;},fade(){} } };
}
function open(g) {openCompleteTally(g,1,{broken:10,breakables:12,dogs:2,dogsTotal:5,tickets:20,bestChain:15,chainRecord:true},['golden'],false,{board:'<img data-bone="golden">',hint:'Golden Bone: 2 backpacks missed near Lily Pond.'});}
it('ignores first-view presses until the full timeline completes, then preserves continuation metadata',()=>{
 const g=game();open(g);const duration=g.tally.duration;
 expect(advanceCompleteTally(g,0.1,true)).toBe(false);expect(g.completeT).toBeCloseTo(.1);expect(save.data.tutorials.tallySeen).not.toBe(true);
 expect(advanceCompleteTally(g,duration,false)).toBe(false);expect(save.data.tutorials.tallySeen).toBe(true);
 expect(advanceCompleteTally(g,.01,true)).toBe(true);expect(g.completeNext).toEqual({n:1,bonus:false});
 expect(g.ui.screen.querySelector('[data-tally="hint"]').textContent).toContain('Lily Pond');
});
it('silently skips repeat tallies to the final state and needs a second press to continue',()=>{
 save.data.tutorials.tallySeen=true;const g=game();open(g);const play=audio.play;
 const stamp=g.tally.steps.find(s=>s.key==='stamp');advanceCompleteTally(g,stamp.start+.01,false);
 expect(g.ui.screen.querySelector('[data-bone="golden"]').style.animation).toContain('bone-stamp');play.mockClear();
 expect(advanceCompleteTally(g,.1,true)).toBe(false);expect(g.completeT).toBe(g.tally.duration);expect(play).not.toHaveBeenCalled();
 expect(g.ui.screen.querySelector('[data-bone="golden"]').style.opacity).toBe('1');
 expect(g.ui.screen.querySelector('[data-bone="golden"]').style.animation).toBe('none');
 expect(g.ui.screen.querySelector('[data-tally="continue"]').style.visibility).toBe('visible');
 expect(advanceCompleteTally(g,.1,true)).toBe(true);expect(play).not.toHaveBeenCalled();
});
