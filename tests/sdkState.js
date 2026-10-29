// Shared ledger for the hub SDK mock. Idempotent per key, same as Nakama:
// a repeated key returns the stored result and does not credit again.
export function hubError(code, message = code) {
  const err = new Error(message);
  err.name = 'HubSdkError';
  err.code = code;
  return err;
}

function fresh() {
  return {
    calls: { earn: [], event: [], exchange: [], score: [], init: 0 },
    earnLedger: new Map(),
    exchangeLedger: new Map(),
    exchangeInflight: new Map(),
    eventLedger: new Map(),
    relics: new Set(),
    relicGrants: 0,
    earnError: null,
    earnErrorOnce: false,
    earnImpl: null,
    loseEarnOnce: false,
    eventError: null,
    eventErrorOnce: false,
    exchangeError: null,
    exchangeErrorOnce: false,
    loseExchangeOnce: false,
    scoreError: null,
    scoreErrorOnce: false,
    initError: null,
    exchangeResponder: null,
  };
}

export const sdk = fresh();

export function resetSdk() {
  const next = fresh();
  for (const key of Object.keys(sdk)) delete sdk[key];
  Object.assign(sdk, next);
}

export function creditedEarnTotal() {
  let total = 0;
  for (const rec of sdk.earnLedger.values()) total += rec.amount;
  return total;
}

export function sendsByKey(calls) {
  const map = new Map();
  for (const call of calls) {
    const list = map.get(call.key) ?? [];
    list.push(call);
    map.set(call.key, list);
  }
  return map;
}
