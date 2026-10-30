import { beforeEach, describe, expect, it } from 'vitest';
import { save, START_LIVES } from '../src/core/save.js';
import { TicketSystem } from '../src/entities/tickets.js';
import { hub } from '../src/hub/hubBridge.js';
import { Session } from '../src/game/session.js';
import { rawTicketsForWhole } from '../src/config/tickets.js';
import { levelEndCalls, readyHub, resetWorld } from './helpers.js';
import { creditedEarnTotal, sdk } from './sdkState.js';

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

function playSession() {
  const session = Object.create(Session.prototype);
  const ui = { setHud() {}, banner() {}, fade: () => Promise.resolve() };
  session.game = {
    ui,
    player: { spawnAt() {}, ride: null, frozen: false },
    camera: { snap() {} },
    mask: { snapTo() {} },
    fx: { clear() {} },
  };
  session.game.session = session;
  session.level = 1;
  session.levelTickets = 0;
  session.fieldRaw = 0;
  session.coconutRaw = 0;
  session.coconutSpawned = 0;
  session.collectedCoconuts = new Set();
  session.stage = { entities: [] };
  session.tickets = {
    flying: [],
    game: session.game,
    restoreAfter() {},
    clearFlying() {},
  };
  session.projectiles = { clear() {} };
  session.deathsAtCp = 0;
  session.phase = 'level';
  session.trial = false;
  session.busy = false;
  session.cp = {
    pos: { clone() { return {}; } },
    facing: 0,
    seq: 0,
    tickets: 0,
    levelTickets: 0,
  };
  session._pushHud = () => {};
  session.setMask = () => {};
  session.oneUps = 0;
  const grant = session.addLife.bind(session);
  session.addLife = (n) => {
    session.oneUps += n;
    return grant(n);
  };
  return session;
}

function checkpoint(session, tickets, levelTickets = tickets, fieldRaw = session.fieldRaw) {
  save.data.tickets = tickets;
  session.levelTickets = levelTickets;
  session.fieldRaw = fieldRaw;
  session.cp.tickets = tickets;
  session.cp.levelTickets = levelTickets;
  session.cp.fieldRaw = fieldRaw;
  session.cp.coconutRaw = session.coconutRaw;
}

describe('case 5: 1UPs and the rolled-back balance', () => {
  it('spending below a multiple and crossing it again grants one 1UP', () => {
    const session = playSession();
    checkpoint(session, 0, 0, 0);
    session.addTickets(rawTicketsForWhole(100));
    expect(session.oneUps).toBe(1);
    expect(save.data.lives).toBe(START_LIVES + 1);

    save.data.tickets = 40;
    session.addTickets(rawTicketsForWhole(60));

    expect(session.oneUps).toBe(2);
    expect(save.data.lives).toBe(START_LIVES + 2);
  });

  it('dying, rolling back, and crossing the same multiple does not grant another 1UP', () => {
    const session = playSession();
    checkpoint(session, 0, 0, 0);
    session.addTickets(rawTicketsForWhole(200));
    expect(session.oneUps).toBe(2);
    expect(save.data.lives).toBe(START_LIVES + 2);

    save.data.lives -= 1;
    session.respawn();
    expect(save.data.tickets).toBe(0);
    expect(session.levelTickets).toBe(0);
    const upsAfterDeath = session.oneUps;
    const livesAfterDeath = save.data.lives;

    session.addTickets(rawTicketsForWhole(100));

    // The 200-ticket haul already crossed 100 and 200. Death put the balance
    // back. Crossing 100 again is the same multiple, not a spend.
    expect(session.oneUps, 'crossing 100 again after the death rollback granted another 1UP').toBe(upsAfterDeath);
    expect(save.data.lives, 'lives inflated past the post-death count').toBe(livesAfterDeath);
  });

  it('in-flight tickets cleared on respawn do not grant a 1UP for a balance that is then discarded', () => {
    const session = playSession();
    checkpoint(session, 99, 0, 0);
    session.tickets.flying = [
      { m: { visible: true } },
      { m: { visible: true } },
      { m: { visible: true } },
    ];
    session.tickets.clearFlying = TicketSystem.prototype.clearFlying;

    const upsBefore = session.oneUps;
    save.data.lives -= 1;
    session.respawn();

    expect(save.data.tickets).toBe(99);
    expect(session.levelTickets).toBe(0);
    expect(session.fieldRaw).toBe(0);
    expect(session.oneUps, 'clearFlying granted a 1UP for tickets the rollback then discarded').toBe(upsBefore);
    expect(save.data.lives, 'the discarded 1UP replaced the life death had just taken').toBe(START_LIVES - 1);
  });

  it('a bonus-round rollback does not grant another 1UP when the same multiple is crossed again', async () => {
    const session = playSession();
    checkpoint(session, 98, 0, 0);
    session.bonusRound = {
      tray: {},
      R: { back: {}, facing: 0, floorY: 0 },
      seq: 0,
      tickets: 98,
      levelTickets: 0,
      fieldRaw: 0,
      coconutRaw: 0,
    };
    session.addTickets(rawTicketsForWhole(2));
    expect(save.data.tickets).toBe(100);
    expect(session.oneUps).toBe(1);

    await session._leaveBonusRound(false);
    expect(save.data.tickets).toBe(98);
    expect(session.levelTickets).toBe(0);
    expect(session.fieldRaw).toBe(0);
    const upsAfterRollback = session.oneUps;
    const livesAfterRollback = save.data.lives;

    session.addTickets(rawTicketsForWhole(2));
    expect(session.oneUps, 'crossing 100 again after the bonus rollback granted another 1UP').toBe(upsAfterRollback);
    expect(save.data.lives, 'lives inflated without spending').toBe(livesAfterRollback);
  });

  it('banks the rolled-back haul, not the peak', async () => {
    const attempt = await hub.beginAttempt(1);
    const session = playSession();
    session.attemptId = attempt.id;
    session.attemptDurable = true;
    checkpoint(session, 10, 10, rawTicketsForWhole(10));
    session.addTickets(rawTicketsForWhole(190));
    expect(session.levelTickets).toBe(200);

    save.data.lives -= 1;
    session.respawn();
    expect(session.levelTickets).toBe(10);

    session.addTickets(rawTicketsForWhole(30));
    expect(session.levelTickets).toBe(40);

    await hub.bank(session.attemptId, session.levelTickets, session.attemptDurable);
    expect(sdk.calls.earn).toEqual(levelEndCalls(attempt.id, 40));
    expect(creditedEarnTotal()).toBe(40);
  });
});
