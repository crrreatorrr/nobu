import { fmtTime } from '../config/trials.js';
import { masteryTargets, platinumHintVisible, bossMedalRows } from './mastery.js';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function trialTargetLine(variant, record, table) {
  const t = masteryTargets(variant, table); if (!t) return '';
  return `🥇 ${fmtTime(t[0])} · 🥈 ${fmtTime(t[1])} · 🥉 ${fmtTime(t[2])}${t[3] == null || !platinumHintVisible(record) ? '' : ` · 💎 ${fmtTime(t[3])}`}`;
}
export function eligibleTrialLine(record, copy) {
  return record?.godUsed && record.bestEligibleMs != null ? copy.eligibleBest(fmtTime(record.bestEligibleMs / 1000)) : '';
}
export function bossMedalPanel(data, registry, selectedLevel, copy) {
  const row = bossMedalRows(data, registry).find((r) => String(r.level) === String(selectedLevel));
  if (!row) return '';
  const check = (on) => on ? '✓' : '✗';
  return `<div class="hint boss-medals" data-boss-medals="${esc(row.key)}">${esc(copy.bossNames[row.key])} ${check(row.clear)} · ${esc(copy.noHit)} ${check(row.noHit)} · ${esc(copy.speed)} ${row.bestMs == null ? '—' : fmtTime(row.bestMs / 1000)} / ${fmtTime(row.targetMs / 1000)} ${check(row.speed)}</div>`;
}
export const perfectPaw = (earned, copy) => earned ? `<span class="perfect-paw" role="img" aria-label="${esc(copy.perfect)}" title="${esc(copy.perfect)}">🐾</span>` : '';
