// One deterministic timeline drives visuals, audio and input, without timer callbacks.
export function tallyPlan(stats, fresh = [], hint = '', milestones = []) {
  const steps = []; let t = 0.5;
  const count = (key, value, duration) => {
    const n = Math.max(0, Math.floor(value || 0));
    steps.push({ key, start: t, duration: duration(n), n });
    t += duration(n) + 0.3;
  };
  count('backpacks', stats.broken, (n) => Math.min(1.2, 0.03 * n));
  count('dogs', stats.dogs, (n) => 0.18 * n);
  count('tickets', stats.tickets, (n) => Math.min(1, 0.02 * n));
  if (stats.bestChain >= 5) steps.push({ key: 'bestChain', start: t, duration: 0, n: stats.bestChain });
  t += 0.5;
  steps.push({ key: 'board', start: t, duration: 0 });
  for (const key of fresh) { t += 0.4; steps.push({ key: 'stamp', bone: key, start: t, duration: 0.3 }); }
  t += 0.6;
  steps.push({ key: 'hint', start: t, duration: hint.length / 40, text: hint });
  t += hint.length / 40 + 0.4;
  for (const id of milestones) { steps.push({ key: 'kennel', id, start: t, duration: 0 }); t += 0.4; }
  return { steps, duration: t };
}
export function tallyFrame(plan, time) {
  return plan.steps.map((s) => ({ ...s, visible: time >= s.start,
    value: s.n == null ? undefined : Math.min(s.n, Math.floor(s.n * (s.duration ? Math.max(0, time - s.start) / s.duration : time >= s.start ? 1 : 0))),
    shown: s.text == null ? undefined : Math.min(s.text.length, Math.floor(Math.max(0, time - s.start) * 40)),
  }));
}
// Only newly crossed ticks fire, including large dt; callers may coalesce blips per frame.
export function tallyEvents(plan, before, after) {
  const a = tallyFrame(plan, before), b = tallyFrame(plan, after), events = [];
  b.forEach((s, i) => {
    if (s.visible && !a[i].visible) events.push({ ...s, event: 'show' });
    if (s.value > a[i].value) events.push({ ...s, event: 'tick', from: a[i].value, to: s.value });
    if (s.shown > a[i].shown) events.push({ ...s, event: 'type', from: a[i].shown, to: s.shown });
  });
  return events;
}
