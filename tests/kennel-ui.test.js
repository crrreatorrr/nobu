import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/game/kennelScene.js', () => ({ KennelYard: class { constructor() { this.hidden = 0; } update() {} dispose() {} } }));
import { Kennel } from '../src/game/kennel.js';
import { LEVELS } from '../src/levels/registry.js';
import { save } from '../src/core/save.js';
import { audio } from '../src/audio/audio.js';
import { resetWorld } from './helpers.js';
import { SONGS } from '../src/audio/songs.js';

const copy = { title: 'Kennel', names: { jukebox: 'Jukebox', buddy: 'Buddy', golden: 'Golden' },
  count: (n, total) => `${n}/${total}`, needed: (n) => `${n} needed`, more: (n) => `+${n}`, badges: 'Badges',
  goldenTitle: 'Golden Kennel', goldenSpeaker: 'SPROTO MASK', golden: 'Every. Single. Dog.', continue: 'Continue',
  controls: 'Controls', choose: 'Choose', play: 'Play', labels: { none: 'NONE' } };
const fixture = (n) => {
  const dogs = Object.values(LEVELS).flatMap((d) => Object.keys(d.dogs).map((id) => `${d.id}:${id}`));
  save.data.dogsFreed = Object.fromEntries(dogs.slice(0, n).map((id) => [id, true]));
  const screen = document.createElement('div'), game = { ui: { screen, setScreen(html) { screen.innerHTML = html; } }, toMap: vi.fn() };
  return { game, kennel: new Kennel(game, copy), screen };
};
const press = (key) => ({ pressed: (k) => k === key, confirmPressed: () => key === 'confirm' });
beforeEach(() => { resetWorld(); vi.restoreAllMocks(); vi.spyOn(audio, 'play').mockImplementation(() => {}); vi.spyOn(audio, 'playMusic').mockImplementation(() => {}); vi.spyOn(audio, 'stopMusic').mockImplementation(() => {}); });

it('offers only unlocked controls and mouse selection plays every existing song', () => {
  const { kennel, screen } = fixture(8);
  expect(screen.querySelectorAll('[data-kennel]')).toHaveLength(1);
  screen.querySelector('[data-kennel="jukebox"]').click();
  expect(kennel.mode).toBe('jukebox'); expect(kennel.choices()).toEqual(Object.keys(SONGS));
  kennel.update(.01, press('confirm')); expect(audio.playMusic).toHaveBeenCalledWith(Object.keys(SONGS)[0]);
  kennel.update(.01, press('pause')); expect(kennel.mode).toBe('main'); expect(audio.stopMusic).toHaveBeenCalled();
});
it('saves an unlocked freed Buddy breed, returns to map without creating a Session', () => {
  const { kennel, screen, game } = fixture(16);
  screen.querySelector('[data-kennel="buddy"]').click(); kennel.update(.01, press('right')); kennel.update(.01, press('confirm'));
  expect(save.data.kennel.buddy).toBe(kennel.status.breeds[0]);
  kennel.update(.01, press('pause')); kennel.update(.01, press('pause')); expect(game.toMap).toHaveBeenCalledWith('kennel'); expect(game.session).toBeUndefined();
});
it('shows Golden speech once and persists its acknowledgement independently from trueending', () => {
  const { kennel, screen } = fixture(17); expect(kennel.mode).toBe('golden'); expect(screen.textContent).toContain('SPROTO MASK');
  kennel.status.unlocks.push('sniffer'); kennel.update(.01, press('bark')); expect(kennel.mode).toBe('golden');
  kennel.update(.01, press('confirm')); expect(save.data.kennel.goldenSeen).toBe(true); expect(save.data.secretSeen).toBe(false);
  save.load(); const again = fixture(17); expect(again.kennel.mode).toBe('main');
});
