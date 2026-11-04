import { it, expect, vi, afterEach } from 'vitest';
import { audio } from '../src/audio/audio.js';
afterEach(() => { vi.restoreAllMocks(); audio.ctx = null; });
it('preserves default break/squash pitches and raises only explicit combo pitches', () => {
  audio.ctx = {}; audio.muted = false;
  const osc = vi.spyOn(audio, '_osc').mockImplementation(() => {});
  vi.spyOn(audio, '_noise').mockImplementation(() => {});
  audio.play('break'); expect(osc.mock.calls[0].slice(0, 3)).toEqual(['sine',110,50]);
  osc.mockClear(); audio.play('break', 2); expect(osc.mock.calls[0].slice(0,3)).toEqual(['sine',220,100]);
  osc.mockClear(); audio.play('squash'); expect(osc.mock.calls.map((c) => c.slice(0,3))).toEqual([['square',420,110],['sine',200,60]]);
  osc.mockClear(); audio.play('squash',2); expect(osc.mock.calls.map((c) => c.slice(0,3))).toEqual([['square',840,220],['sine',400,120]]);
  osc.mockClear(); audio.play('chainUp'); expect(osc.mock.calls.map((c) => c.slice(0,3))).toEqual([['square',660,1320],['triangle',1320,1980]]);
});
it('applies tally blip pitch while preserving random variation at default pitch', () => {
  audio.ctx = {}; audio.muted = false; vi.spyOn(Math,'random').mockReturnValue(0.5);
  const osc = vi.spyOn(audio,'_osc').mockImplementation(() => {});
  audio.play('blip'); expect(osc.mock.calls[0].slice(0,3)).toEqual(['square',580,520]);
  audio.play('blip',2); expect(osc.mock.calls[1].slice(0,3)).toEqual(['square',1160,1040]);
});
it('provides the future Sniffer double sniff and half-volume Kennel arpeggio from the same synth recipes', () => {
  audio.ctx={};audio.muted=false;
  const noise=vi.spyOn(audio,'_noise').mockImplementation(()=>{}),osc=vi.spyOn(audio,'_osc').mockImplementation(()=>{});
  audio.play('sniff');expect(noise.mock.calls).toEqual([[.12,.2,0,'bandpass',1800,3200,4],[.12,.2,.15,'bandpass',1800,3200,4]]);
  audio.play('kennel');expect(osc).toHaveBeenCalledTimes(5);expect(osc.mock.calls.every(c=>c[4]===.035)).toBe(true);
});
