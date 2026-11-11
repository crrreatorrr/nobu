import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: { has: () => false, url: () => '' } }));
import { UI, TUTORIAL_MIN_SEC, TUTORIAL_QUEUED_SEC, TUTORIAL_BUSY_SEC, TUTORIAL_SEC, TUTORIAL_QUEUE_CAP } from '../src/ui/ui.js';
import { TUTORIALS } from '../src/story/script.js';
import { save } from '../src/core/save.js';
import { audio } from '../src/audio/audio.js';

const STEP = 0.05;
let ui;
const title = () => ui.popup.querySelector('.p-title').textContent;
const shown = () => ui.popup.classList.contains('show');
/** Steps the UI and returns [title, seconds visible] for each card that was shown, in order. */
function run(seconds, log = []) {
  for (let t = 0; t < seconds; t += STEP) {
    if (shown()) {
      const last = log[log.length - 1];
      if (last?.[0] === title() && !last.done) last[1] += STEP; else log.push([title(), STEP]);
    } else if (log.length) log[log.length - 1].done = true;
    ui.update(STEP);
  }
  return log;
}

beforeEach(() => {
  save.reset(); save.data.tutorials = {};
  vi.spyOn(save, 'write').mockImplementation(() => {});
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  ui = new UI(document.createElement('div'));
});
afterEach(() => vi.restoreAllMocks());

describe('tutorial pop-up queue', () => {
  it('shows three tutorials fired within a second in order, each for at least 2.5 s', () => {
    ui.tutorial('snacks'); run(0.4);
    ui.tutorial('treat'); run(0.4);
    ui.tutorial('cat');
    expect(title()).toBe(TUTORIALS.snacks.title);
    expect(save.data.tutorials).toEqual({ snacks: true }); // marked when shown, not when queued
    const log = run(20, [[TUTORIALS.snacks.title, 0.8]]);
    expect(log.map(([name]) => name)).toEqual(['snacks', 'treat', 'cat'].map((id) => TUTORIALS[id].title));
    for (const [, sec] of log) expect(sec).toBeGreaterThanOrEqual(TUTORIAL_MIN_SEC - 1e-6);
    expect(Math.abs(log[0][1] - TUTORIAL_BUSY_SEC)).toBeLessThan(0.11);   // two waiting
    expect(Math.abs(log[1][1] - TUTORIAL_QUEUED_SEC)).toBeLessThan(0.11); // one waiting
    expect(Math.abs(log[2][1] - TUTORIAL_SEC)).toBeLessThan(0.11);        // nothing waiting: the full time
    expect(save.data.tutorials).toEqual({ snacks: true, treat: true, cat: true });
    expect(shown()).toBe(false);
  });

  it('shows the Level 1 tutorials between d 76 and d 101 in turn at run speed, Lid Knight included', () => {
    const at = { knight: 76.5, slide: 80, snacks: 84.5, treat: 88.5, cat: 91.5, trampoline: 101 }, log = [];
    let prev = 76.5;
    for (const [id, d] of Object.entries(at)) { run((d - prev) / 8, log); prev = d; ui.tutorial(id); ui.tutorial(id); }
    run(40, log);
    expect(log.map(([name]) => name)).toEqual(Object.keys(at).map((id) => TUTORIALS[id].title));
    for (const [, sec] of log) expect(sec).toBeGreaterThanOrEqual(TUTORIAL_MIN_SEC - 1e-6);
  });

  it('replaces a card at once when it has been read for 2.5 s and nothing is waiting', () => {
    ui.tutorial('snacks'); run(TUTORIAL_MIN_SEC + 0.1);
    ui.tutorial('treat');
    expect(title()).toBe(TUTORIALS.treat.title);
    expect(ui.popupQueue).toEqual([]);
  });

  it('shows a queued entry again after a death cleared it, because it was never marked seen', () => {
    ui.tutorial('snacks'); ui.tutorial('treat');
    expect(ui.popupQueue).toEqual(['treat']);
    ui.clearTutorialQueue();
    run(10);
    expect(save.data.tutorials.treat).toBeUndefined();
    ui.tutorial('treat');
    expect(title()).toBe(TUTORIALS.treat.title);
    expect(save.data.tutorials.treat).toBe(true);
  });

  it('caps the queue, ignores repeats and seen tutorials, and keeps waiting cards through a pause', () => {
    ui.tutorial('snacks');
    for (const id of ['treat', 'treat', 'cat', 'trampoline', 'bite', 'slide', 'jump', 'dog', 'snacks']) ui.tutorial(id);
    expect(ui.popupQueue).toEqual(['treat', 'cat', 'trampoline', 'bite', 'slide', 'jump']);
    expect(ui.popupQueue.length).toBe(TUTORIAL_QUEUE_CAP);
    expect(save.data.tutorials.dog).toBeUndefined(); // dropped, not marked seen
    ui.setScreen('<div>PAUSED</div>', 'dim'); ui.clearScreen(); // pause and resume
    expect(ui.popupQueue.length).toBe(TUTORIAL_QUEUE_CAP);
    ui.clearTutorialQueue();
    expect(ui.popupQueue).toEqual([]);
  });

  it('moves the card out from under a banner and back', () => {
    ui.tutorial('snacks'); ui.banner('RUN!', '', 1);
    expect(ui.popup.classList.contains('dodge')).toBe(true);
    run(1.1);
    expect(ui.popup.classList.contains('dodge')).toBe(false);
  });
});

describe('tutorial cards behind a screen and on leaving a level', () => {
  it('a held card is hidden, its timer stops and the queue does not drain; it resumes afterwards', () => {
    ui.tutorial('snacks'); ui.tutorial('treat'); run(1);
    ui.popupHold = true; // Game.loop sets this whenever the state is not 'play' (pause menu, wardrobe, results)
    for (let i = 0; i < 400; i++) ui.update(STEP); // 20 s paused
    expect(ui.popup.classList.contains('held')).toBe(true);
    expect(title()).toBe(TUTORIALS.snacks.title);
    expect(ui.popupQueue).toEqual(['treat']);
    expect(save.data.tutorials.treat).toBeUndefined();
    ui.popupHold = false; ui.update(STEP);
    expect(ui.popup.classList.contains('held')).toBe(false);
    const log = run(12);
    expect(log.map(([name]) => name)).toEqual([TUTORIALS.snacks.title, TUTORIALS.treat.title]);
  });

  it('clearing returns the dropped ids, and leaving the level also takes the card on screen', () => {
    ui.tutorial('snacks'); ui.tutorial('treat'); ui.tutorial('cat');
    expect(ui.clearTutorialQueue()).toEqual(['treat', 'cat']);
    expect(shown()).toBe(true); // a death keeps the card that is up
    expect(ui.clearTutorialQueue({ current: true })).toEqual([]);
    expect(shown()).toBe(false); expect(ui.popupT).toBe(0);
  });
});

describe('boss bar', () => {
  it('goes see-through only while the boss is drawn behind it', () => {
    vi.stubGlobal('innerWidth', 960); vi.stubGlobal('innerHeight', 540);
    ui.boss.getBoundingClientRect = () => ({ left: 220, right: 740, top: 74, bottom: 138, width: 520, height: 64 });
    ui.bossGhost(true, 0.5, 0.2); // bar hidden: nothing to dodge
    expect(ui.boss.classList.contains('ghost')).toBe(false);
    ui.bossShow('MECHA BIRD', 'bird');
    ui.bossGhost(true, 0.5, 0.2); // (480, 108): behind the bar
    expect(ui.boss.classList.contains('ghost')).toBe(true);
    ui.bossGhost(true, 0.5, 0.6); // down in the arena
    expect(ui.boss.classList.contains('ghost')).toBe(false);
    ui.bossGhost(true, 0.5, 0.2); ui.bossGhost(false); // off screen or not active
    expect(ui.boss.classList.contains('ghost')).toBe(false);
    ui.bossGhost(true, 0.5, 0.2); ui.bossHide();
    expect(ui.boss.classList.contains('ghost')).toBe(false);
    vi.unstubAllGlobals();
  });
});
