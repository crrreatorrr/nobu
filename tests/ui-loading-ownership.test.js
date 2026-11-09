import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{url:id=>id,has:()=>false}}));
import { UI } from '../src/ui/ui.js';
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
it('an older hide cannot remove the next loading screen',async()=>{
  const ui=new UI(document.createElement('div'));
  const old=ui.showLoading('LEVEL6','SMOG RAPIDS');
  const hiding=ui.hideLoading(700,old);
  await vi.advanceTimersByTimeAsync(100);
  const current=ui.showLoading('LEVEL1','BARK JUNGLE');
  expect(ui.cancelLoading(old)).toBe(false);
  await vi.runAllTimersAsync();expect(await hiding).toBe(false);
  expect(ui.loadEl.classList.contains('show')).toBe(true);
  expect(ui.loadEl.querySelector('.ll-title').textContent).toBe('BARK JUNGLE');
  expect(ui.cancelLoading(current)).toBe(true);
  expect(ui.loadEl.classList.contains('show')).toBe(false);
});
it('cancels its own pending hide and retains normal successful loading',async()=>{
  const ui=new UI(document.createElement('div'));
  const old=ui.showLoading('LEVEL6','SMOG RAPIDS'),pending=ui.hideLoading(700,old);
  expect(ui.cancelLoading(old)).toBe(true);
  await vi.runAllTimersAsync();expect(await pending).toBe(false);
  expect(ui.loadEl.classList.contains('show')).toBe(false);
  const current=ui.showLoading('LEVEL6','SMOG RAPIDS'),normal=ui.hideLoading(700,current);
  await vi.runAllTimersAsync();expect(await normal).toBe(true);
  expect(ui.loadEl.classList.contains('show')).toBe(false);
});
