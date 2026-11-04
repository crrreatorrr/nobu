import { afterEach, expect, it, vi } from 'vitest';
import { audio } from '../src/audio/audio.js';
import { SONGS } from '../src/audio/songs.js';
import { MarketClock } from '../src/entities/market.js';
import * as THREE from 'three';

const original = { ctx: audio.ctx, song: audio.song, songName: audio.songName, rate: audio.rate, muted: audio.muted };
afterEach(() => { Object.assign(audio, original); vi.restoreAllMocks(); });

it('returns the music bar start and locks the market to even beats across pauses, rates and respawn', () => {
  const name = Object.keys(SONGS)[0], bpm = SONGS[name].bpm;
  audio.ctx = { currentTime: 10 }; audio.songName = null; audio.rate = 1;
  const start = audio.playMusic(name);
  expect(start).toBe(10.05); expect(audio.playMusic(name)).toBe(start);
  const stage = { theme: { music: name }, game: { player: { pos: new THREE.Vector3() } } };
  const clock = new MarketClock(stage);
  expect(clock.step).toBe(120 / bpm);
  clock.update(20); expect(clock.t).toBe(0); // warmup does not advance past the scheduled bar
  audio.ctx.currentTime = start + clock.step;
  clock.update(0.01); expect(clock.k).toBe(1);
  // No game updates during the pause; audio still advances.
  audio.ctx.currentTime += clock.step * 3;
  clock.update(0.01); expect(clock.k).toBe(4);
  const before = clock.t; clock.onRespawn(); clock.update(0);
  expect(clock.t).toBe(before);
  audio.setRate(0.5);
  audio.ctx.currentTime += clock.step * 2;
  clock.update(0.01); expect(clock.k).toBe(5);
  audio.setRate(1); audio.ctx.currentTime += clock.step;
  clock.update(0.01); expect(clock.k).toBe(6);
  expect(audio.musicTime('other-song')).toBeNull();
});

it('rejoins the music grid after a delayed scheduler instead of shifting the bar phase', () => {
  const name = Object.keys(SONGS)[0];
  audio.ctx = { currentTime: 20 }; audio.songName = null; audio.rate = 1;
  const start = audio.playMusic(name), sixteenth = 60 / SONGS[name].bpm / 4;
  audio.ctx.currentTime = start + sixteenth * 37.4;
  vi.spyOn(audio, '_playStep').mockImplementation(() => {});
  audio._schedule();
  const onGrid = (audio.song.nextTime - start) / sixteenth;
  expect(onGrid).toBeCloseTo(Math.round(onGrid));
  expect(audio.song.nextTime).toBeGreaterThanOrEqual(audio.ctx.currentTime + 0.12);
});

it('applies per-call prop sound volume without changing shared gain or later sounds', () => {
  audio.ctx = {}; audio.muted = false;
  const noise = vi.spyOn(audio, '_noise').mockImplementation(() => {});
  const osc = vi.spyOn(audio, '_osc').mockImplementation(() => {});
  audio.play('explosion', 1, { volume: 0.6 });
  expect(noise.mock.calls[0][1]).toBeCloseTo(0.48);
  expect(osc.mock.calls[0][4]).toBeCloseTo(0.36);
  audio.play('explosion'); expect(noise.mock.calls[1][1]).toBe(0.8);
  audio.play('whirr', 1, { volume: 0.4 }); expect(noise.mock.calls[2][1]).toBeCloseTo(0.08);
  audio.play('roll', 1, { volume: 0.3 }); expect(noise.mock.calls[3][1]).toBeCloseTo(0.09);
});

it('ends a nonloop sting after scheduler lag or a rate change beyond its last note', () => {
  const name = Object.keys(SONGS).find(key => SONGS[key].loop === false);
  audio.ctx = { currentTime: 30 }; audio.songName = null; audio.rate = 1;
  let start = audio.playMusic(name);
  const duration = audio.song.tracks[0].steps.length * 60 / SONGS[name].bpm / 4;
  const play = vi.spyOn(audio, '_playStep').mockImplementation(() => {});
  audio.ctx.currentTime = start + duration + 1; audio._schedule();
  expect(audio.song).toBeNull(); expect(play).not.toHaveBeenCalled();
  start = audio.playMusic(name); audio.ctx.currentTime = start + duration + 1;
  audio.setRate(0.5); expect(audio.song).toBeNull();
});

it('does not schedule a duplicate note in the queued lookahead when the rate changes', () => {
  const name = Object.keys(SONGS)[0];
  audio.ctx = { currentTime: 40 }; audio.songName = null; audio.rate = 1;
  const start = audio.playMusic(name);
  const play = vi.spyOn(audio, '_playStep').mockImplementation(() => {});
  audio.ctx.currentTime = start; audio._schedule();
  const lastQueued = play.mock.calls.at(-1)[2]; play.mockClear();
  audio.ctx.currentTime += 0.02; audio.setRate(0.5); audio._schedule();
  for (const [, , when] of play.mock.calls) expect(when).toBeGreaterThan(lastQueued);
  expect(audio.song.nextTime).toBeGreaterThan(lastQueued);
});
