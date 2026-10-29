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

export function createHubSdk() {
  return {
    async init(gameId) {
      sdk.calls.init += 1;
      if (sdk.initError) throw sdk.initError;
      return {
        playerId: 'player-1',
        ranked: true,
        relics: [...sdk.relics],
        effects: {},
        ticketsCapLeft: 1000,
        gameId,
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

    async submitScore(boardId, value, meta) {
      sdk.calls.score.push({ boardId, value, meta });
      if (sdk.scoreError) throw take('scoreError', 'scoreErrorOnce');
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

    exit() {},
  };
}

export { hubError };
