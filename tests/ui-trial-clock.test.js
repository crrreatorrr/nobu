import { describe, expect, it } from 'vitest';
import { UI } from '../src/ui/ui.js';

describe('trial clock', () => {
  it('writes the DOM only when the shown text or tint changes', () => {
    const ui = Object.create(UI.prototype);
    ui.trialEl = document.createElement('div');
    let writes = 0;
    const el = ui.trialEl;
    const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(el, 'textContent', {
      get() { return desc.get.call(this); },
      set(v) { writes += 1; desc.set.call(this, v); },
    });
    ui.trialTime('0:01.00', false);
    ui.trialTime('0:01.00', false);
    expect(writes).toBe(1);
    expect(el.classList.contains('on')).toBe(true);
    ui.trialTime('0:01.00', true);
    expect(writes).toBe(2);
    expect(el.textContent).toBe('❄ 0:01.00');
    expect(el.classList.contains('frozen')).toBe(true);
    ui.trialTime(null);
    expect(el.classList.contains('on')).toBe(false);
    ui.trialTime('0:00.00', false);
    expect(el.textContent).toBe('⏱ 0:00.00');
    expect(el.classList.contains('frozen')).toBe(false);
  });
});
