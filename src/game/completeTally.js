import { Assets } from '../art/assets.js';
import { audio } from '../audio/audio.js';
import { save } from '../core/save.js';
import { REWARD_TEXT } from '../story/script.js';
import { tallyPlan } from './tally.js';
import { drawTally, soundTally } from './tallyView.js';
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Board HTML comes from the normal UI board renderer; fresh remains its ordered key array.
export function openCompleteTally(game, n, stats, fresh, bonus, { board, hint, milestones = [] }) {
  game.state = 'complete'; game.completeT = 0;
  game.completeNext = { n, bonus };
  game.tallyCanSkip = !!save.data.tutorials.tallySeen;
  game.tallyFinished = false;
  game.tallyStats = stats;
  game.tally = tallyPlan(stats,fresh,hint,milestones.map((m) => m.id));
  game.completeMinT = game.tally.duration;
  const row = (key,img) => `<div class="stat-row" data-tally="${key}"><img src="${Assets.url(img)}"><span>${REWARD_TEXT[key]}</span><span class="val">0</span></div>`;
  audio.playMusic('complete');
  game.ui.setScreen(`<div class="big-title" style="margin-bottom:2vh">${esc(bonus ? REWARD_TEXT.bonusComplete : REWARD_TEXT.complete(n))}</div>
    <div class="complete-wrap"><img class="complete-nobu" src="${Assets.url('nobu_complete')}"><div class="stats tally-stats">
      ${row('backpacks',Assets.has('backpack_icon') ? 'backpack_icon' : 'backpack')}${row('dogs','dog_corgi_free')}${row('tickets','ticket')}
      ${stats.bestChain >= 5 ? row('bestChain','golden_bone') + (stats.chainRecord ? `<div class="hint tally-record" data-tally="bestRecord">${REWARD_TEXT.chainBest}</div>` : '') : ''}
      <div data-tally="board">${board}</div><div class="hint tally-hint" data-tally="hint"></div>
      ${milestones.map((m) => `<div class="hint" data-kennel>${esc(m.text)}</div>`).join('')}
    </div></div><div class="hint" style="margin-top:3vh" data-tally="continue">${REWARD_TEXT.continue}</div>`,'dim');
  game.ui.screen.style.background = 'radial-gradient(circle at 50% 40%, #5a2399, #1a0530)';
  drawCompleteTally(game);
  game.ui.fade(0);
}
function drawCompleteTally(game) {
  drawTally(game.ui.screen,game.tally,game.completeT,game.tallyStats);
  const record = game.ui.screen.querySelector('[data-tally="bestRecord"]');
  if(record) record.style.visibility = game.completeT >= game.tally.steps.find((s) => s.key === 'bestChain').start ? 'visible' : 'hidden';
}
export function advanceCompleteTally(game,dt,pressed) {
  const before = game.completeT;
  const wasFinished = before >= game.tally.duration;
  if(pressed && !wasFinished && game.tallyCanSkip) {
    game.completeT = game.tally.duration;
    drawCompleteTally(game);
  } else {
    game.completeT += dt;
    soundTally(game.ui.screen,game.tally,before,game.completeT);
    drawCompleteTally(game);
  }
  if(game.completeT >= game.tally.duration && !game.tallyFinished) {
    game.tallyFinished = true;
    save.data.tutorials.tallySeen = true; save.write();
  }
  return wasFinished && pressed;
}
