// DOM UI: HUD (slides in on change), boss bar, text boxes, tutorial pop-ups, banners, death cards, fades,
// and a generic "screen" layer used by menus and cutscenes.
import { Assets } from '../art/assets.js';
import { input } from '../core/input.js';
import { audio } from '../audio/audio.js';
import { save } from '../core/save.js';
import { BONE_TEXT, SPEAKERS, TUTORIALS, DEATH_CAPTIONS, DEATH_ART } from '../story/script.js';
import { savedBoard } from '../game/bones.js';
import { pick } from '../core/util.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export class UI {
  boneBoard(id, { bonus = false, run = null, fresh = [] } = {}) {
    const saved = savedBoard(save.data, id);
    const keys = ['golden', 'goodBoy', 'hidden', ...(bonus ? [] : ['snack1', 'snack2', 'snack3'])];
    const labels = [BONE_TEXT.golden, BONE_TEXT.goodBoy, BONE_TEXT.hidden, ...BONE_TEXT.snack];
    const has = (b, k) => k.startsWith('snack') ? b?.snack >= Number(k.slice(-1)) : !!b?.[k];
    return `<div class="bone-board" aria-label="${BONE_TEXT.board}" style="display:flex;justify-content:center;gap:8px;margin:12px 0">${keys.map((k, i) => {
      const owned = has(saved, k), live = has(run, k), stamp = fresh.indexOf(k);
      return `<img data-bone="${k}" title="${labels[i]}" alt="${labels[i]}" src="${Assets.url('golden_bone')}" style="width:38px;height:30px;object-fit:contain;opacity:${owned || live ? 1 : 0.18};filter:${owned ? 'none' : live ? 'grayscale(1) brightness(2)' : 'brightness(0)'};${stamp >= 0 ? `animation:bone-stamp .3s ${2 + stamp * 0.4}s both;` : ''}">`;
    }).join('')}</div>`;
  }

  constructor(root) {
    this.root = root;
    this.conedVignette = h('div', 'coned-vignette');
    this.conedVignette.setAttribute('aria-hidden', 'true');
    this.conedVignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;background:radial-gradient(ellipse,transparent 40%,rgba(130,80,180,.65));';
    root.appendChild(this.conedVignette);
    // HUD
    this.hud = h('div', 'hud');
    this.slots = {};
    const mk = (key, cls, img) => {
      const s = h('div', `hud-slot ${cls}`);
      if (img) { const i = h('img'); i.src = img; s.appendChild(i); }
      const v = h('span', 'v', '0');
      s.appendChild(v);
      this.hud.appendChild(s);
      this.slots[key] = { el: s, v, timer: 0, pinned: false };
    };
    mk('tickets', 'hud-tickets', Assets.url('ticket'));
    mk('chain', 'hud-chain');
    mk('lives', 'hud-lives', Assets.url('nobu_head'));
    mk('dogs', 'hud-dogs', Assets.url('dog_shiba_free'));
    // mask pips
    const m = h('div', 'hud-slot hud-mask');
    const pips = h('div', 'pips');
    this.pips = [];
    for (let i = 0; i < 3; i++) { const p = h('div', 'pip'); const im = h('img'); im.src = Assets.url('sproto_mask'); p.appendChild(im); pips.appendChild(p); this.pips.push(p); }
    m.appendChild(pips);
    this.hud.appendChild(m);
    this.slots.mask = { el: m, v: null, timer: 0 };
    root.appendChild(this.hud);
    this.god = h('div', 'god-badge', 'GOD MODE');
    root.appendChild(this.god);
    this.trialEl = h('div', 'trial-timer');
    root.appendChild(this.trialEl);

    // boss bar
    this.boss = h('div', '', '<img><div class="bb-body"><div class="bb-name"></div><div class="bb-track"><div class="bb-fill"></div></div><div class="bb-row"><div class="bb-phase"></div><div class="bb-sp"><span>SPECIAL</span><div class="bb-sptrack"><div class="bb-spfill"></div></div></div></div></div>');
    this.boss.id = 'bossbar';
    this.bbFill = this.boss.querySelector('.bb-fill');
    this.bbPhase = this.boss.querySelector('.bb-phase');
    this.bbSpFill = this.boss.querySelector('.bb-spfill');
    root.appendChild(this.boss);

    // text box
    this.tb = h('div', '', '<img class="tb-portrait"><div class="tb-body"><div class="tb-name"></div><div class="tb-text"></div></div><div class="tb-next">▼</div>');
    this.tb.id = 'textbox';
    if (!Assets.has('textbox')) this.tb.classList.add('fallback');
    root.appendChild(this.tb);
    this.dialog = null;

    // popup, banner, screen, fade
    this.popup = h('div', 'popup', '<img><div><div class="p-title"></div><div class="p-text"></div></div>');
    root.appendChild(this.popup);
    this.popupT = 0;
    this.bannerEl = h('div', 'banner');
    root.appendChild(this.bannerEl);
    this.bannerT = 0;
    this.screen = h('div', 'screen');
    root.appendChild(this.screen);
    this.fadeEl = h('div');
    this.fadeEl.id = 'fade';
    root.appendChild(this.fadeEl);

    // level loading screen: sits above the black fade while a stage is built
    this.loadEl = h('div', 'level-load', '<div class="ll-kicker"></div><div class="big-title ll-title"></div><div class="bar"><div class="fill"></div></div><div class="ll-step hint"></div>');
    this.loadEl.setAttribute('role', 'progressbar');
    this.loadEl.setAttribute('aria-valuemin', '0');
    this.loadEl.setAttribute('aria-valuemax', '100');
    root.appendChild(this.loadEl);
    this.loadShownAt = 0;
  }

  // ---------- level loading ----------
  showLoading(kicker, title) {
    this._loadEpoch = (this._loadEpoch || 0) + 1;
    this.loadEl.querySelector('.ll-kicker').textContent = kicker;
    this.loadEl.querySelector('.ll-title').textContent = title;
    this.loadEl.setAttribute('aria-label', `Loading ${title}`);
    this.loadingProgress(0, '');
    this.loadEl.classList.add('show');
    this.loadShownAt = performance.now();
    return this._loadEpoch;
  }
  loadingProgress(frac, step) {
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
    this.loadEl.querySelector('.fill').style.width = `${pct}%`;
    this.loadEl.setAttribute('aria-valuenow', String(pct));
    if (step != null) this.loadEl.querySelector('.ll-step').textContent = step;
  }
  // Fill the bar, keep the screen up for at least `minMs` so it never just flashes, then fade it out.
  async hideLoading(minMs = 700, token = this._loadEpoch) {
    if (token !== this._loadEpoch) return false;
    this.loadingProgress(1, 'Ready!');
    const left = minMs - (performance.now() - this.loadShownAt);
    await new Promise((r) => setTimeout(r, Math.max(250, left)));
    if (token !== this._loadEpoch) return false;
    this.loadEl.classList.remove('show');
    await new Promise((r) => setTimeout(r, 300));
    return token === this._loadEpoch;
  }
  cancelLoading(token) {
    if (token == null || token !== this._loadEpoch) return false;
    this._loadEpoch++;
    this.loadEl.classList.remove('show');
    return true;
  }

  // ---------- HUD ----------
  setHud(key, value, { show = true, bump = true } = {}) {
    const s = this.slots[key];
    if (!s) return;
    if (key === 'mask') {
      this.pips.forEach((p, i) => p.classList.toggle('on', i < value));
    } else {
      s.v.textContent = value;
    }
    if (show) {
      s.timer = 2.6;
      s.el.classList.add('show');
      if (bump && s.v) { s.v.classList.remove('hud-bump'); void s.v.offsetWidth; s.v.classList.add('hud-bump'); }
    }
  }
  godBadge(on) { this.god.classList.toggle('on', !!on); }
  setConed(on) { this.conedVignette.style.display = on ? 'block' : 'none'; }
  // time trial clock: text, or null to hide; `frozen` tints it icy while a Freeze Pack holds it
  // Called every frame during a trial, so the DOM is touched only when the shown text changes.
  trialTime(text, frozen = false) {
    const on = text != null;
    if (on !== this._trialOn) { this._trialOn = on; this.trialEl.classList.toggle('on', on); }
    if (!on) { this._trialText = null; return; }
    const shown = (frozen ? '❄ ' : '⏱ ') + text;
    if (shown !== this._trialText) { this._trialText = shown; this.trialEl.textContent = shown; }
    if (!!frozen !== this._trialFrozen) { this._trialFrozen = !!frozen; this.trialEl.classList.toggle('frozen', !!frozen); }
  }
  chain(n, { ended = false } = {}) {
    const slot = this.slots.chain;
    if (n < 2) { slot.timer = 0; slot.el.classList.remove('show'); return; }
    this.setHud('chain', `x${n}`, { bump: !ended });
    slot.timer = ended ? 0.6 : Infinity;
  }
  showHud(t = 3) { for (const [key, s] of Object.entries(this.slots)) if (key !== 'chain') { s.timer = t; s.el.classList.add('show'); } }
  pinHud(on) { this.hudPinned = on; if (on) this.showHud(999); else for (const [key, s] of Object.entries(this.slots)) if (key !== 'chain') s.timer = 1.5; }
  hideHud() { for (const s of Object.values(this.slots)) { s.timer = 0; s.el.classList.remove('show'); } }

  // ---------- boss bar ----------
  bossShow(name, portrait, stages = 3) {
    this.bossStages = stages;
    this.boss.querySelector('img').src = Assets.url(portrait);
    this.boss.querySelector('.bb-name').textContent = name;
    this.bossHp(1, 1);
    this.boss.classList.add('show');
  }
  bossHp(frac, phase, stages = this.bossStages ?? 3) {
    this.bbFill.style.width = `${Math.max(0, frac) * 100}%`;
    this.bbPhase.textContent = phase ? `PHASE ${phase}${stages === 4 ? ' ' + '●'.repeat(phase) + '○'.repeat(Math.max(0, stages - phase)) : ''}` : '';
  }
  // special-attack gauge: fills up, flashes when the ultimate is ready
  bossCharge(frac, ready = false) {
    this.bbSpFill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    this.boss.classList.toggle('sp-ready', ready);
  }
  bossHide() { this.boss.classList.remove('show'); }

  // ---------- dialogue ----------
  // lines: [[speakerKey, text], ...] -> Promise
  say(lines) {
    return new Promise((resolve) => {
      this.dialog = { lines, i: -1, resolve, shown: 0, full: '', t: 0, hold: 0 };
      this._nextLine();
      this.tb.classList.add('show');
    });
  }
  cancelSay(expectedDialog) {
    if (!expectedDialog || this.dialog !== expectedDialog) return false;
    this.dialog = null;
    this.tb.classList.remove('show');
    expectedDialog.resolve();
    return true;
  }
  get talking() { return !!this.dialog; }
  _nextLine() {
    const d = this.dialog;
    d.i++;
    if (d.i >= d.lines.length) {
      this.tb.classList.remove('show');
      const r = d.resolve;
      this.dialog = null;
      setTimeout(r, 120);
      return;
    }
    const [who, text] = d.lines[d.i];
    const sp = SPEAKERS[who] || SPEAKERS.narrator;
    d.full = input.prompt(text); d.shown = 0; d.t = 0; d.hold = 0.15; d.blip = sp.blip;
    const img = this.tb.querySelector('.tb-portrait');
    if (sp.portrait) { img.src = Assets.url(sp.portrait); img.style.display = ''; } else img.style.display = 'none';
    this.tb.querySelector('.tb-name').textContent = sp.name;
    this.tb.querySelector('.tb-text').textContent = '';
  }
  _updateDialog(dt) {
    const d = this.dialog;
    if (!d) return;
    d.hold -= dt;
    const img = this.tb.querySelector('.tb-portrait');
    if (d.shown < d.full.length) {
      d.t += dt * 55;
      const n = Math.min(d.full.length, Math.floor(d.t));
      if (n > d.shown) {
        if (Math.floor(n / 3) !== Math.floor(d.shown / 3)) audio.play(d.blip);
        d.shown = n;
        this.tb.querySelector('.tb-text').textContent = d.full.slice(0, n);
      }
      img.classList.add('talking');
    } else img.classList.remove('talking');
    this.tb.querySelector('.tb-next').style.visibility = d.shown >= d.full.length ? 'visible' : 'hidden';
    if (d.hold <= 0 && (input.confirmPressed() || input.pressed('bite'))) {
      if (d.shown < d.full.length) { d.shown = d.full.length; d.t = d.shown; this.tb.querySelector('.tb-text').textContent = d.full; }
      else { audio.play('menu'); this._nextLine(); }
    }
  }

  // ---------- tutorial pop-up (once per save) ----------
  tutorial(id) {
    const t = TUTORIALS[id];
    if (!t) return;
    save.data.tutorials ||= {};
    if (save.data.tutorials[id]) return;
    save.data.tutorials[id] = true;
    save.write();
    this.popup.querySelector('img').src = Assets.url(t.img);
    this.popup.querySelector('.p-title').textContent = t.title;
    this.popup.querySelector('.p-text').innerHTML = input.prompt(t.text);
    this.popup.classList.add('show');
    this.popupT = 6;
    audio.play('select');
  }

  banner(text, sub = '', dur = 1.8) {
    this.bannerEl.innerHTML = input.prompt(`${text}${sub ? `<small>${sub}</small>` : ''}`);
    this.bannerEl.classList.add('show');
    this.bannerT = dur;
  }

  deathCard(type) {
    const img = DEATH_ART[type] || 'death_angel';
    const cap = pick(DEATH_CAPTIONS[type] || DEATH_CAPTIONS.angel);
    this.setScreen(`<div class="death-card"><img src="${Assets.url(img)}"><div class="big-title">${cap}</div></div>`, 'dim');
    requestAnimationFrame(() => this.screen.querySelector('.death-card')?.classList.add('show'));
  }

  // ---------- screens ----------
  setScreen(html, cls = '') {
    this.screen.className = `screen ${cls}`;
    this.screen.innerHTML = input.prompt(html); // pad players see pad buttons in control prompts
  }
  clearScreen() { this.screen.className = 'screen'; this.screen.innerHTML = ''; }

  fade(to, dur = 0.45) {
    this.fadeEl.style.transition = `opacity ${dur}s`;
    this.fadeEl.style.opacity = to;
    return new Promise((r) => setTimeout(r, dur * 1000 + 30));
  }

  update(dt) {
    for (const [key, s] of Object.entries(this.slots)) {
      if (this.hudPinned && key !== 'chain') continue;
      if (s.timer > 0) { s.timer -= dt; if (s.timer <= 0) s.el.classList.remove('show'); }
    }
    if (this.popupT > 0) { this.popupT -= dt; if (this.popupT <= 0) this.popup.classList.remove('show'); }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.bannerEl.classList.remove('show'); }
    this._updateDialog(dt);
  }
}
