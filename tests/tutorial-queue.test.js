import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: { has: () => false, url: () => '' } }));
import { UI, TUTORIAL_MIN_SEC, TUTORIAL_QUEUED_SEC, TUTORIAL_SEC, TUTORIAL_QUEUE_CAP } from '../src/ui/ui.js';
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
    expect(Math.abs(log[0][1] - TUTORIAL_QUEUED_SEC)).toBeLessThan(0.11);
    expect(Math.abs(log[1][1] - TUTORIAL_QUEUED_SEC)).toBeLessThan(0.11);
    expect(Math.abs(log[2][1] - TUTORIAL_SEC)).toBeLessThan(0.11); // nothing waiting: the full time
    expect(save.data.tutorials).toEqual({ snacks: true, treat: true, cat: true });
    expect(shown()).toBe(false);
  });

  it('shows the five Level 1 tutorials between d 80 and d 101 in turn at run speed', () => {
    const at = { slide: 80, snacks: 84.5, treat: 88.5, cat: 91.5, trampoline: 101 }, log = [];
    let prev = 80;
    for (const [id, d] of Object.entries(at)) { run((d - prev) / 8, log); prev = d; ui.tutorial(id); ui.tutorial(id); }
    run(30, log);
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

  it('clears the queue with the screen, caps it, and ignores repeats and seen tutorials', () => {
    ui.tutorial('snacks');
    for (const id of ['treat', 'treat', 'cat', 'trampoline', 'bite', 'slide', 'snacks']) ui.tutorial(id);
    expect(ui.popupQueue).toEqual(['treat', 'cat', 'trampoline', 'bite']);
    expect(ui.popupQueue.length).toBe(TUTORIAL_QUEUE_CAP);
    expect(save.data.tutorials.slide).toBeUndefined(); // dropped, so its trigger can show it later
    ui.clearScreen();
    expect(ui.popupQueue).toEqual([]);
  });

  it('moves the card out from under a banner and back', () => {
    ui.tutorial('snacks'); ui.banner('RUN!', '', 1);
    expect(ui.popup.classList.contains('dodge')).toBe(true);
    run(1.1);
    expect(ui.popup.classList.contains('dodge')).toBe(false);
  });
});
