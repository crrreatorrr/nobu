import { expect, test } from 'vitest';
import { PAD, PAD_LAYOUT, PAD_TUNING, PadReader, actionsFor, buttonsDown, menuDirection, pickPad, radialDeadzone } from '../src/core/gamepad.js';

// Fake standard-mapping Gamepad: 17 buttons, 4 axes.
function pad({ held = [], axes = [0, 0, 0, 0], index = 0, id = 'Test pad (STANDARD GAMEPAD)', mapping = 'standard', values = {} } = {}) {
  const buttons = Array.from({ length: 17 }, (_, i) => {
    const value = values[i] ?? (held.includes(i) ? 1 : 0);
    return { pressed: value > 0.1 || held.includes(i), value };
  });
  return { connected: true, index, id, mapping, axes: [...axes], buttons };
}

test('radial deadzone is 0 inside, rescaled from 0 at its edge, and capped at 1', () => {
  expect(radialDeadzone(0.15, 0.1, 0.2)).toEqual([0, 0]);
  const [x] = radialDeadzone(0.21, 0, 0.2);
  expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(0.02);
  const [dx, dy] = radialDeadzone(0.8, 0.8, 0.2);
  expect(Math.hypot(dx, dy)).toBeCloseTo(1, 5);
  expect(radialDeadzone(0, 0, 0.2)).toEqual([0, 0]);
});

test('tuning follows the shared convention', () => {
  expect(PAD_TUNING.leftDeadzone).toBe(0.2);
  expect(PAD_TUNING.rightDeadzone).toBe(0.15);
  expect(PAD_TUNING.menuThreshold).toBe(0.5);
  expect(PAD_TUNING.repeatDelayMs).toBe(350);
  expect(PAD_TUNING.repeatRateMs).toBe(120);
});

test('layout: A jumps and confirms, B backs out, Start pauses, Home is never bound', () => {
  expect(PAD_LAYOUT.jump).toEqual([PAD.A]);
  expect(PAD_LAYOUT.confirm).toContain(PAD.A);
  expect(PAD_LAYOUT.back).toEqual([PAD.B]);
  expect(PAD_LAYOUT.pause).toEqual([PAD.START]);
  for (const buttons of Object.values(PAD_LAYOUT)) expect(buttons).not.toContain(16);
  // Slide is on a shoulder/trigger as well as B, so Moon Jump (hold Slide + A) and Dust Dash
  // (Slide then X) never need two face buttons at once.
  expect(PAD_LAYOUT.slide.some((b) => [PAD.LB, PAD.LT, PAD.RT].includes(b))).toBe(true);
  // Map shortcuts that share a button with a move are only read on the map.
  expect(PAD_LAYOUT.trial).toEqual([PAD.Y]);
  expect(PAD_LAYOUT.sniffer).toEqual([PAD.VIEW]);
});

test('pickPad skips empty slots and disconnected pads and prefers the standard mapping', () => {
  const odd = pad({ mapping: '', index: 0, id: 'odd' });
  const std = pad({ index: 1 });
  expect(pickPad([null, { ...std, connected: false }])).toBe(null);
  expect(pickPad([odd, std])).toBe(std);
  expect(pickPad([null, odd])).toBe(odd);
  expect(pickPad(undefined)).toBe(null);
});

test('triggers count as pressed only past the analog threshold; Home is ignored', () => {
  expect(buttonsDown(pad({ values: { [PAD.LT]: 0.4 } })).has(PAD.LT)).toBe(false);
  expect(buttonsDown(pad({ values: { [PAD.RT]: 0.7 } })).has(PAD.RT)).toBe(true);
  expect(buttonsDown(pad({ held: [16] })).size).toBe(0);
});

test('actionsFor maps held buttons to every action they serve', () => {
  const held = actionsFor(new Set([PAD.RB]));
  expect(held.has('bite')).toBe(true); expect(held.has('gauntlet')).toBe(true);
  expect(actionsFor(new Set([PAD.LT])).has('dash')).toBe(true);
});

test('menuDirection prefers the D-pad, then the stick past 0.5 on its dominant axis', () => {
  expect(menuDirection(new Set([PAD.UP]), 0.9, 0)).toBe('up');
  expect(menuDirection(new Set(), 0.4, 0)).toBe(null);
  expect(menuDirection(new Set(), 0.6, 0.3)).toBe('right');
  expect(menuDirection(new Set(), 0.3, -0.7)).toBe('up');
});

test('latch on connect: a button held when the pad appears is ignored until released', () => {
  const r = new PadReader();
  const gp = pad({ held: [PAD.A] }); // the hub's portal confirm is still down
  let f = r.read([gp], 0);
  expect(f.connected).toBe(true);
  expect(f.pressed.size).toBe(0); expect(f.held.size).toBe(0); expect(f.any).toBe(false);
  f = r.read([gp], 16);
  expect(f.held.has('jump')).toBe(false);
  gp.buttons[PAD.A] = { pressed: false, value: 0 };
  f = r.read([gp], 32);
  expect(f.pressed.size).toBe(0);
  gp.buttons[PAD.A] = { pressed: true, value: 1 };
  f = r.read([gp], 48);
  expect(f.pressed.has('jump')).toBe(true); expect(f.pressed.has('confirm')).toBe(true); expect(f.any).toBe(true);
  f = r.read([gp], 64);
  expect(f.pressed.size).toBe(0); expect(f.held.has('jump')).toBe(true);
});

test('latch also swallows a stick held at connect until it returns to centre', () => {
  const r = new PadReader();
  const gp = pad({ axes: [0, 0.9, 0, 0] });
  expect(r.read([gp], 0).pressed.has('down')).toBe(false);
  expect(r.read([gp], 1000).pressed.has('down')).toBe(false);
  gp.axes[1] = 0; r.read([gp], 1016);
  gp.axes[1] = 0.9;
  expect(r.read([gp], 1032).pressed.has('down')).toBe(true);
});

test('hot-plug: unplugging reports lost once, and a reconnect latches again', () => {
  const r = new PadReader();
  const gp = pad();
  r.read([gp], 0);
  let f = r.read([], 16);
  expect(f.connected).toBe(false); expect(f.lost).toBe(true);
  expect(r.read([], 32).lost).toBe(false);
  expect(r.read([null], 48).lost).toBe(false);
  const again = pad({ held: [PAD.START] });
  f = r.read([again], 64);
  expect(f.connected).toBe(true); expect(f.pressed.has('pause')).toBe(false);
  // A different pad replacing the first one is a new connection too.
  const other = pad({ index: 1, id: 'Other', held: [PAD.B] });
  expect(r.read([null, other], 80).pressed.has('back')).toBe(false);
});

test('menu directions fire once, then auto-repeat after 350 ms every 120 ms', () => {
  const r = new PadReader();
  const gp = pad();
  r.read([gp], 0);
  gp.buttons[PAD.DOWN] = { pressed: true, value: 1 };
  const fires = [];
  for (let t = 16; t <= 16 + 700; t += 4) if (r.read([gp], t).pressed.has('down')) fires.push(t - 16);
  expect(fires[0]).toBe(0);
  expect(fires[1]).toBeGreaterThanOrEqual(350); expect(fires[1]).toBeLessThan(360);
  expect(fires[2] - fires[1]).toBeGreaterThanOrEqual(120); expect(fires[2] - fires[1]).toBeLessThan(130);
  // The D-pad is held for movement, but only menu presses come from the repeat logic.
  expect(r.read([gp], 800).held.has('down')).toBe(true);
});

test('left stick moves with the 0.2 deadzone; right stick looks with 0.15; sticks are not "any button"', () => {
  const r = new PadReader();
  const gp = pad();
  r.read([gp], 0);
  gp.axes = [0.1, 0.1, 0.1, 0.05];
  let f = r.read([gp], 16);
  expect(f.move).toEqual([0, 0]); expect(f.look).toEqual([0, 0]); expect(f.active).toBe(false);
  gp.axes = [0.8, 0, 0.18, 0];
  f = r.read([gp], 32);
  expect(f.move[0]).toBeGreaterThan(0.7); expect(f.look[0]).toBeGreaterThan(0);
  expect(f.any).toBe(false); expect(f.active).toBe(true);
  expect(f.pressed.has('right')).toBe(true); // stick also steers menus
});

test('rumble plays a dual-rumble effect on the pad being read, and is a no-op without one', () => {
  const r = new PadReader();
  expect(r.rumble(100, 1, 1)).toBe(false); // nothing read yet
  const calls = [];
  const gp = { ...pad(), vibrationActuator: { playEffect: (type, params) => { calls.push([type, params]); return Promise.resolve('complete'); } } };
  r.read([gp], 0);
  expect(r.rumble(150, 0.8, 0.4)).toBe(true);
  expect(calls).toEqual([['dual-rumble', { startDelay: 0, duration: 150, strongMagnitude: 0.8, weakMagnitude: 0.4 }]]);
  expect(r.rumble(90, 7, -2)).toBe(true); // magnitudes are clamped to 0..1
  expect(calls[1][1]).toMatchObject({ strongMagnitude: 1, weakMagnitude: 0 });
  expect(r.rumble(0, 1, 1)).toBe(false);
  r.read([pad()], 16); // a pad with no actuator
  expect(r.rumble(100, 1, 1)).toBe(false);
  r.read([{ ...pad(), vibrationActuator: { playEffect: () => { throw new Error('unsupported'); } } }], 32);
  expect(r.rumble(100, 1, 1)).toBe(false);
  r.read([], 48); // unplugged
  expect(r.rumble(100, 1, 1)).toBe(false);
});
