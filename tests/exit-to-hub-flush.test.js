// Exit to Hub pushes the debounced cloud save before hub.exit closes the session and navigates.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Game, EXIT_FLUSH_MS, flushBeforeExit } from '../src/game/game.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';

let order;
beforeEach(() => {
  vi.useFakeTimers();
  order = [];
  vi.spyOn(hub, 'exit').mockImplementation(() => { order.push('exit'); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const game = () => Object.assign(Object.create(Game.prototype), { session: null });

it('waits for save.flush, then exits', async () => {
  let done;
  vi.spyOn(save, 'flush').mockImplementation(() => { order.push('flush'); return new Promise((r) => { done = () => { order.push('put'); r(); }; }); });
  const g = game();
  const p = g.exitToHub();
  await vi.advanceTimersByTimeAsync(100);
  expect(order).toEqual(['flush']);
  expect(g.hubExit).toBe(true);
  done();
  await p;
  expect(order).toEqual(['flush', 'put', 'exit']);
});

it('a hung flush holds the exit for EXIT_FLUSH_MS at most', async () => {
  vi.spyOn(save, 'flush').mockReturnValue(new Promise(() => {}));
  const p = game().exitToHub();
  await vi.advanceTimersByTimeAsync(EXIT_FLUSH_MS - 1);
  expect(hub.exit).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await p;
  expect(hub.exit).toHaveBeenCalledExactlyOnceWith('exit_to_hub');
});

it('a failed flush still exits', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(save, 'flush').mockRejectedValue(new Error('offline'));
  await game().exitToHub();
  expect(hub.exit).toHaveBeenCalledOnce();
});

it('a second press while flushing does not exit twice', async () => {
  const flush = vi.spyOn(save, 'flush').mockResolvedValue();
  const g = game();
  const a = g.exitToHub(), b = g.exitToHub();
  expect(b).toBe(a);
  await a;
  expect(flush).toHaveBeenCalledOnce();
  expect(hub.exit).toHaveBeenCalledOnce();
});

it('retires the session synchronously, before the flush', () => {
  vi.spyOn(save, 'flush').mockReturnValue(new Promise(() => {}));
  const session = { disposed: false, dispose() { this.disposed = true; }, def: {} };
  const g = Object.assign(game(), { session });
  g.exitToHub();
  expect(session.disposed || g.session === session).toBe(true);
});

it('flushBeforeExit resolves on a throwing flush', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(flushBeforeExit(() => { throw new Error('x'); }, 10)).resolves.toBeUndefined();
});

it('menu clicks do nothing while the exit flush runs', async () => {
  vi.spyOn(save, 'flush').mockReturnValue(new Promise(() => {}));
  const g = game();
  g.exitToHub();
  expect(g._hubExiting).toBeTruthy();
  const el = { closest: () => { throw new Error('click handled'); } };
  expect(() => g._onMenuClick({ target: el })).not.toThrow();
});
