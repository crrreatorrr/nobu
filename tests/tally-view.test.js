import { it, expect, vi, afterEach } from 'vitest';
import { drawTally, soundTally } from '../src/game/tallyView.js';
import { tallyPlan } from '../src/game/tally.js';
import { audio } from '../src/audio/audio.js';
afterEach(() => vi.restoreAllMocks());
function fixture() {
 const screen = document.createElement('div');
 screen.innerHTML = ['backpacks','dogs','tickets','bestChain'].map(k=>`<div data-tally="${k}"><span class="val"></span></div>`).join('') + '<div data-tally="board"><img data-bone="golden"><img data-bone="hidden"></div><div data-tally="hint"></div><div data-kennel></div><div data-tally="continue"></div>';
 const stats = { broken:2,breakables:3,dogs:1,dogsTotal:2,tickets:3,bestChain:8 };
 return { screen,stats,plan:tallyPlan(stats,['golden','hidden'],'hint',[8]) };
}
it('renders real DOM counts and board silhouettes before stamps, then final typed goal and prompt',()=>{
 const {screen,stats,plan}=fixture();
 drawTally(screen,plan,0,stats); expect(screen.querySelector('[data-tally="backpacks"]').style.visibility).toBe('hidden');
 drawTally(screen,plan,0.53,stats); expect(screen.querySelector('[data-tally="backpacks"] .val').textContent).toBe('1');
 const boardT=plan.steps.find(s=>s.key==='board').start;
 drawTally(screen,plan,boardT,stats); expect(screen.querySelector('[data-tally="board"]').style.visibility).toBe('visible');
 expect(screen.querySelector('[data-bone="golden"]').style.opacity).toBe('0.18');
 drawTally(screen,plan,plan.duration,stats);
 expect(screen.querySelector('[data-tally="backpacks"] .val').textContent).toBe('2/3');
 expect(screen.querySelector('[data-tally="bestChain"] .val').textContent).toBe('x8');
 expect(screen.querySelector('[data-tally="hint"]').textContent).toBe('hint');
 expect(screen.querySelector('[data-tally="continue"]').style.visibility).toBe('visible');
 expect(screen.querySelector('[data-bone="hidden"]').style.opacity).toBe('1');
});
it('plays each count tick and stamp once, final oneUp once, with no delayed callbacks after skip',()=>{
 const {screen,stats,plan}=fixture(), play=vi.spyOn(audio,'play').mockImplementation(()=>{});
 soundTally(screen,plan,0,plan.duration);
 expect(play.mock.calls.filter(c=>c[0]==='ticket')).toHaveLength(1);
 expect(play.mock.calls.filter(c=>c[0]==='stamp')).toHaveLength(2);
 expect(play.mock.calls.filter(c=>c[0]==='oneUp')).toHaveLength(1);
 expect(play.mock.calls.filter(c=>c[0]==='chainUp')).toHaveLength(1);
 const count=play.mock.calls.length; soundTally(screen,plan,plan.duration,plan.duration+1); expect(play).toHaveBeenCalledTimes(count);
 play.mockClear(); drawTally(screen,plan,plan.duration,stats); expect(play).not.toHaveBeenCalled();
});
