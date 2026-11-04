import { Assets } from '../art/assets.js';
import { audio } from '../audio/audio.js';
import { SONGS } from '../audio/songs.js';
import { save } from '../core/save.js';
import { LEVELS } from '../levels/registry.js';
import { kennelStatus, allowedTints, chainBadges, GALLERY, missingSecrets } from './kennelData.js';
import { KennelYard } from './kennelScene.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export class Kennel {
  constructor(game, copy) {
    this.game = game; this.copy = copy; this.mode = 'main'; this.cursor = 0; this.choice = 0;
    this.yard = new KennelYard(game, save.data, LEVELS);
    this.status = kennelStatus(save.data, LEVELS);
    if (this.status.unlocks.includes('golden') && !save.data.kennel.goldenSeen) { this.mode = 'golden'; if (this.yard.mask) this.yard.mask.visible = true; audio.play('kennel'); }
    this.draw();
  }
  get options() { return this.status.unlocks.filter((id) => id !== 'golden'); }
  choices() {
    if (this.mode === 'jukebox') return Object.keys(SONGS);
    if (this.mode === 'buddy') return ['none', ...this.status.breeds];
    if (this.mode === 'fur') return allowedTints(save.data, LEVELS);
    if (this.mode === 'gallery') return GALLERY;
    return [];
  }
  closeMode() {
    if (this.mode === 'jukebox') audio.stopMusic();
    if (this.mode === 'golden') { save.data.kennel.goldenSeen = true; save.write(); }
    if (this.yard.mask) this.yard.mask.visible = false;
    this.mode = 'main'; this.choice = 0; this.draw();
  }
  activate() {
    if (this.mode === 'main') { const mode = this.options[this.cursor]; if (mode) { this.mode = mode; this.choice = 0; if (mode === 'sniffer') audio.play('sniff'); this.draw(); } return; }
    const choice = this.choices()[this.choice];
    if (this.mode === 'jukebox') audio.playMusic(choice);
    else if (this.mode === 'buddy' || this.mode === 'fur') {
      save.data.kennel[this.mode === 'fur' ? 'tint' : 'buddy'] = choice === 'none' ? null : choice;
      save.write(); audio.play('menu'); this.draw();
    } else if (this.mode === 'golden') this.closeMode();
  }
  update(dt, input) {
    this.yard.update(dt);
    if (input.pressed('pause') || input.pressed('back')) {
      if (this.mode !== 'main') this.closeMode(); else { this.dispose(); this.game.toMap('kennel'); }
      return;
    }
    if (this.mode !== 'golden' && input.pressed('bark') && this.status.unlocks.includes('sniffer')) { this.mode = 'sniffer'; audio.play('sniff'); this.draw(); return; }
    const delta = (input.pressed('right') || input.pressed('down') ? 1 : 0) - (input.pressed('left') || input.pressed('up') ? 1 : 0);
    if (delta) {
      const n = this.mode === 'main' ? this.options.length : this.choices().length;
      if (n) { const key = this.mode === 'main' ? 'cursor' : 'choice'; this[key] = (this[key] + delta + n) % n; audio.play('menu'); this.draw(); }
    }
    if (input.confirmPressed() || input.pressed('jump')) this.activate();
  }
  draw() {
    const c = this.copy;
    let content = '';
    if (this.mode === 'golden') content = `<div class="sub-title">${esc(c.goldenTitle)}</div><p><b>${esc(c.goldenSpeaker)}</b>: ${esc(c.golden)}</p><div class="hint">${esc(c.continue)}</div>`;
    else if (this.mode === 'main') {
      const milestones = this.status.milestones.map((m) => `<div class="hint">${m.remaining ? esc(c.needed(m.remaining)) : '✓'} ${esc(c.names[m.id])}</div>`).join('');
      const buttons = this.options.map((id, i) => `<button data-kennel="${esc(id)}" class="menu-item ${i === this.cursor ? 'sel' : ''}">${esc(c.names[id])}</button>`).join('');
      const badges = chainBadges(save.data, LEVELS).map((id) => `<span title="${esc(LEVELS[id].name)}">🐾</span>`).join('');
      content = `${milestones}<div class="menu">${buttons}</div><div class="hint">${esc(c.badges)} ${badges}</div>`;
    } else if (this.mode === 'sniffer') {
      const rows = missingSecrets(save.data, LEVELS).map((def) => `<p><b>${esc(def.name)}</b>: ${esc(c.secretLine(def))}</p>`).join('');
      content = `<div class="sub-title">${esc(c.names.sniffer)}</div>${rows || esc(c.allFound)}`;
    } else if (this.mode === 'gallery') content = `<img class="kennel-gallery" style="max-width:90vw;max-height:65vh" src="${Assets.url(this.choices()[this.choice])}" alt="${esc(c.names.gallery)}">`;
    else {
      const choices = this.choices(), selected = choices[this.choice];
      const active = this.mode === 'buddy' ? save.data.kennel.buddy || 'none' : save.data.kennel.tint || 'none';
      content = `<div class="sub-title">${esc(c.names[this.mode])}</div><div class="menu-item sel">◀ ${esc(c.labels?.[selected] || selected)} ▶${this.mode !== 'jukebox' && active === selected ? ' ✓' : ''}</div><div class="hint">${esc(this.mode === 'jukebox' ? c.play : c.choose)}</div>`;
    }
    this.game.ui.setScreen(`<div class="kennel-panel" style="position:absolute;left:3%;top:3%;max-width:45%;max-height:90vh;overflow:auto;background:#12051fcc;padding:18px;border-radius:12px"><div class="big-title">${esc(c.title)}</div><div class="hint">${esc(c.count(this.status.freed, this.status.total))}${this.yard.hidden ? ` · ${esc(c.more(this.yard.hidden))}` : ''}</div>${content}<div class="hint">${esc(c.controls)}</div></div>`);
    for (const button of this.game.ui.screen.querySelectorAll('[data-kennel]')) button.addEventListener('click', () => { this.mode = button.dataset.kennel; this.choice = 0; if (this.mode === 'sniffer') audio.play('sniff'); this.draw(); });
  }
  dispose() { if (this.disposed) return; this.disposed = true; audio.stopMusic(); this.yard.dispose(); }
}
