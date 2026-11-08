import { hubError, sdk } from './sdkState.js';

export const HubEvent = {
  Ready: 'ready',
  NobuBossDefeated: 'nobu.boss_defeated',
};

export const BoardId = {
  NobuTrialTime: 'nobu_trial_time',
};

export const HUB_OUTBOX_DB = 'hub-outbox';
export const TICKETS_PER_VERSE = 10;
export const VERSE_DAILY_CAP = 50;

function take(slot, onceFlag) {
  const err = sdk[slot];
  if (sdk[onceFlag]) sdk[slot] = null;
  return err;
}

// serverNow is a hub clock. Null omits the field. 0 is the no-clock sentinel, not 1970-01-01.
function serverTimeField() {
  if (sdk.serverNow == null) return {};
  const serverTime = typeof sdk.serverNow === 'function' ? sdk.serverNow() : sdk.serverNow;
  if (serverTime === undefined) return {};
  return { serverTime };
}

export function createHubSdk() {
  const api = {
    async init(gameId) {
      sdk.calls.init += 1;
      if (sdk.initError) throw take('initError', 'initErrorOnce');
      return {
        playerId: 'player-1',
        ranked: true,
        relics: [...sdk.relics],
        effects: {},
        ticketsCapLeft: 1000,
        gameId,
        ...serverTimeField(),
      };
    },

    async reportEvent(eventId, data, key) {
      sdk.calls.event.push({ eventId, data, key });
      if (sdk.eventError) throw take('eventError', 'eventErrorOnce');
      const prev = sdk.eventLedger.get(key);
      if (prev) return prev;
      let granted;
      if (eventId === HubEvent.NobuBossDefeated && data && data.boss === 'cone' && !sdk.relics.has('cones_tip')) {
        sdk.relics.add('cones_tip');
        sdk.relicGrants += 1;
        granted = 'cones_tip';
      }
      const result = granted ? { granted } : {};
      sdk.eventLedger.set(key, result);
      return result;
    },

    // SDK 0.5 resolves a ScoreResult. `sdk.scoreLegacy` mimics an older SDK that resolves
    // nothing, and `sdk.scoreImpl` scripts any other answer.
    async submitScore(boardId, value, meta) {
      sdk.calls.score.push({ boardId, value, meta });
      if (sdk.scoreError) throw take('scoreError', 'scoreErrorOnce');
      if (sdk.scoreImpl) return sdk.scoreImpl(boardId, value, meta);
      if (sdk.scoreLegacy) return undefined;
      const key = `${boardId}:${meta?.level ?? ''}`;
      const prev = sdk.scoreBoard.get(key);
      const posted = prev == null || value < prev;
      if (posted) sdk.scoreBoard.set(key, value);
      return { accepted: true, posted, value: sdk.scoreBoard.get(key), order: 'asc' };
    },

    async earnTickets(amount, reason, key) {
      sdk.calls.earn.push({ amount, reason, key });
      if (sdk.earnImpl) return sdk.earnImpl(amount, reason, key);
      if (sdk.earnError) throw take('earnError', 'earnErrorOnce');
      const prev = sdk.earnLedger.get(key);
      if (prev) {
        if (prev.amount !== amount || prev.reason !== reason) {
          throw hubError('idempotency_mismatch', 'Idempotency key was reused with a different request');
        }
        return prev.result;
      }
      let running = 0;
      for (const rec of sdk.earnLedger.values()) running += rec.amount;
      const result = { balance: running + amount, capped: false };
      sdk.earnLedger.set(key, { amount, reason, result });
      if (sdk.loseEarnOnce) {
        sdk.loseEarnOnce = false;
        throw hubError('rpc_failed', 'response lost');
      }
      return result;
    },

    async exchange(tickets, key) {
      sdk.calls.exchange.push({ tickets, key });
      if (sdk.exchangeError) throw take('exchangeError', 'exchangeErrorOnce');
      const existing = sdk.exchangeLedger.get(key);
      if (existing) return existing.response;
      const inflight = sdk.exchangeInflight.get(key);
      if (inflight) return inflight;

      const run = (async () => {
        const response = sdk.exchangeResponder
          ? await sdk.exchangeResponder(tickets, key)
          : {
            receiptId: `rcpt-${sdk.exchangeLedger.size + 1}`,
            ticketsDebited: tickets,
            verseCredited: tickets / TICKETS_PER_VERSE,
          };
        sdk.exchangeLedger.set(key, { response, tickets });
        if (sdk.loseExchangeOnce) {
          sdk.loseExchangeOnce = false;
          throw hubError('rpc_failed', 'response lost');
        }
        return response;
      })();
      sdk.exchangeInflight.set(key, run);
      try {
        return await run;
      } finally {
        sdk.exchangeInflight.delete(key);
      }
    },

    async getTicketBalance() {
      const base = typeof sdk.ticketBalance === 'function'
        ? await sdk.ticketBalance()
        : (sdk.ticketBalance || {});
      return { ...base, ...serverTimeField() };
    },

    exit() {},
  };
  // getLeaderboard is optional in the SDK. `sdk.noBoardRead` leaves it out, like an older vendor tree.
  if (!sdk.noBoardRead) {
    api.getLeaderboard = async (boardId, opts = {}) => {
      sdk.calls.board.push({ boardId, opts });
      if (sdk.boardError) throw sdk.boardError;
      const value = sdk.scoreBoard.get(`${boardId}:${opts.variant ?? ''}`);
      const rows = value == null ? [] : [{ userId: 'player-1', name: 'nobu fan', value, rank: 1 }];
      return { boardId, variant: opts.variant ?? '', order: 'asc', rows, me: rows[0] || null };
    };
  }
  return api;
}

export { hubError };
