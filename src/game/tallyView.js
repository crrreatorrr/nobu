import { audio } from '../audio/audio.js';
import { tallyFrame, tallyEvents } from './tally.js';

// Rendering is driven by game time. Skipping renders the endpoint silently and leaves no callbacks.
export function drawTally(screen, plan, time, stats) {
  const frame = tallyFrame(plan,time);
  for (const s of frame) {
    const el = screen.querySelector(`[data-tally="${s.key}"]`);
    if (el && s.key !== 'stamp' && s.key !== 'kennel') {
      el.style.visibility = s.visible ? 'visible' : 'hidden';
      el.classList.toggle('show',s.visible);
      const value = el.querySelector('.val');
      if (value) {
        const total = s.key === 'backpacks' ? stats.breakables : s.key === 'dogs' ? stats.dogsTotal : null;
        value.textContent = s.key === 'bestChain' ? `x${s.n}` : `${s.value}${total != null && s.value === s.n ? `/${total}` : ''}`;
      }
      if(s.key === 'hint') el.textContent = s.text.slice(0,s.shown);
    }
    if(s.key === 'stamp') {
      const bone = screen.querySelector(`[data-bone="${s.bone}"]`);
      if(bone) { bone.style.opacity = s.visible ? '1' : '0.18'; bone.style.filter = s.visible ? 'none' : 'brightness(0)'; }
    }
  }
  const milestones = frame.filter((s) => s.key === 'kennel');
  screen.querySelectorAll('[data-kennel]').forEach((el,i) => { el.style.visibility = milestones[i]?.visible ? 'visible' : 'hidden'; });
  const prompt = screen.querySelector('[data-tally="continue"]');
  if(prompt) prompt.style.visibility = time >= plan.duration ? 'visible' : 'hidden';
}
export function soundTally(screen, plan, before, after) {
  for(const e of tallyEvents(plan,before,after)) {
    if(e.event === 'tick') {
      for(let n=e.from+1;n<=e.to;n++) audio.play(e.key === 'dogs' ? 'ticket' : 'blip',e.key === 'dogs' ? 1 : 1+n/Math.max(1,e.n));
    } else if(e.event === 'type') {
      for(let n=Math.floor(e.from/3)+1;n<=Math.floor(e.to/3);n++) audio.play('blip');
    }
    else if(e.event === 'show') {
      if(e.key === 'bestChain') audio.play('chainUp');
      if(e.key === 'kennel') audio.play('chime');
      if(e.key === 'perfect') audio.play('invincible');
      if(e.key === 'stamp') {
        audio.play('stamp');
        const stamps = plan.steps.filter((s) => s.key === 'stamp');
        if(e.bone === stamps.at(-1)?.bone) audio.play('oneUp');
        const bone = screen.querySelector(`[data-bone="${e.bone}"]`);
        if(bone) { bone.style.animation = 'none'; void bone.offsetWidth; bone.style.animation = 'bone-stamp .3s both'; }
        const board = screen.querySelector('[data-tally="board"]');
        if(board) { board.style.animation = 'none'; void board.offsetWidth; board.style.animation = 'tally-shake .12s .18s'; }
      }
    }
  }
}
