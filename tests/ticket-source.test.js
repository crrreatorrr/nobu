import * as THREE from 'three';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: { aspect: () => 1.7, tex: () => new THREE.Texture() } }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { TicketSystem } from '../src/entities/tickets.js';
import { Session } from '../src/game/session.js';
import { staticSnackPotential } from '../src/game/bones.js';
import { save } from '../src/core/save.js';
beforeEach(() => { localStorage.clear(); save.load(); });

it('collects tagged static extras without increasing Snack progress or omitting their economy payout', () => {
  const game = { player: { pos: new THREE.Vector3(), dead: false }, fx: { sparkle() {} }, ui: { setHud() {} } };
  const stage = { scene: new THREE.Scene(), entities: [] };
  const session = new Session(game, '1'); game.session = session;
  const tickets = new TicketSystem(game, stage);
  tickets.add(0, .7, 0);
  tickets.add(0, .7, 0, 'jackpot');
  tickets.add(0, .7, 0);
  tickets.finalize(); tickets.update(1 / 60);
  expect(tickets.list.every((ticket) => ticket.taken)).toBe(true);
  expect(tickets.list).toHaveLength(3); // All static raw still belongs in the Ticket budget.
  expect(session.fieldRaw).toBe(3);
  expect(session.levelTickets).toBe(1);
  expect(session.snack.raw).toBe(2);
  expect(staticSnackPotential(tickets.list)).toBe(2);
  tickets.update(1 / 60);
  expect(session.fieldRaw).toBe(3);
});

it('excludes every tagged gated/special source from the denominator while keeping ordinary rows', () => {
  expect(staticSnackPotential([{}, { source: 'field' }, ...['coconut', 'mystery', 'jackpot', 'bark'].map((source) => ({ source }))])).toBe(2);
});
