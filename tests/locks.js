// A single-process stand-in for the browser Web Locks API. Callbacks for one
// name run one at a time, and each callback is deferred so two callers can
// both queue before either runs.
const chains = new Map();

export function resetLocks() {
  chains.clear();
}

export function installLocks() {
  navigator.locks = {
    request(name, callback) {
      const prev = chains.get(name) ?? Promise.resolve();
      const next = prev.then(() => callback());
      chains.set(name, next.then(() => {}, () => {}));
      return next;
    },
  };
}
