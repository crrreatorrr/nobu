// Shared timing math for authored props. Runtime callers reuse `out`.
export function drumPos(i, t, { x = 0, y = 0, d = 0, r = 3.2, n = 4, period = 6, axis = 'x', dir = 1, phase = 0 } = {}, out = {}) {
  const a = phase + dir * Math.PI * 2 * (t / period + i / n);
  out.x = x + (axis === 'z' ? r * Math.cos(a) : 0);
  out.y = y + r * Math.sin(a);
  out.d = d + (axis === 'x' ? r * Math.cos(a) : 0);
  return out;
}
export const drumSpeed = (r = 3.2, period = 6) => 2 * Math.PI * r / period;

export function toasterCycle(t, period = 2.4, phase = 0, out = {}) {
  const elapsed = t + phase;
  out.cycle = Math.floor(elapsed / period);
  out.time = ((elapsed % period) + period) % period;
  out.glow = Math.max(0, (out.time - period + 0.6) / 0.6);
  // The two audible tells belong to the cycle about to pop.
  out.tick = out.time >= period - 0.3 ? 2 : out.time >= period - 0.6 ? 1 : 0;
  return out;
}
