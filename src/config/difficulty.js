// H21–H23 have activated all three existing bosses with their authored powers.
export const M2_ON = true;

// The owner chose stage-1 retries for Bird/Cat in H20.
// Session also honors an explicit per-instance phaseCheckpoints override.
export const BOSS_PHASE_CHECKPOINTS = { bird: false, cat: false, cone: true, titan: true, queen: true };

export const LEVEL_TIER = { 1: 1, ride: 1.5, 2: 2, cave: 2.5, 3: 3, 4: 4, 6: 4.5, 5: 5 };
// Authored level hazards do not read these multipliers yet: applying them to the
// existing levels would change their tuning during a behavior-preserving refactor.
export const TIER = {
  enemySpeed: [1, 1.08, 1.16, 1.24, 1.32],
  hazardPeriod: [1, 0.95, 0.90, 0.85, 0.80],
  crumbleDelay: [0.60, 0.55, 0.50, 0.45, 0.40],
  snacksGap: [70, 80, 90, 95, 100],
};

export function tierValue(key, tier) {
  const row = TIER[key];
  if (!row || !Number.isFinite(tier)) throw new RangeError('Invalid difficulty tier');
  const i = Math.max(0, Math.min(row.length - 1, tier - 1)), a = Math.floor(i);
  return row[a] + (row[Math.min(row.length - 1, a + 1)] - row[a]) * (i - a);
}
export const remixEnemySpeed = (tier) => tierValue('enemySpeed', Math.min(5, tier + 1));

export const BOSS = {
  // Stage 1 is faster, with shorter tells and two-attack combos (owner request: phase one was too easy).
  // Each value still sits at or below the stage-2 value, so the ladder stays monotonic.
  bird: { hp: 6, perStage: 2, stages: 3, speed: [1.15, 1.2, 1.4], window: [2.5, 2.4, 2.2],
    tele: [0.9, 0.88, 0.78], chain: [2, 2, 2] },
  cat: { hp: 6, perStage: 2, stages: 3, speed: [1.15, 1.2, 1.45], window: [2.5, 2.4, 2],
    tele: [0.86, 0.84, 0.74], chain: [2, 2, 2] },
  cone: { hp: 9, perStage: 3, stages: 3, speed: [1.18, 1.25, 1.5], window: [1.6, 1.4, 1.1],
    tele: [0.82, 0.8, 0.7], chain: [2, 2, 3] },
  titan: { hp: 9, perStage: 3, stages: 3, speed: [1.28, 1.35, 1.55], window: [1.5, 1.35, 1.05],
    tele: [0.78, 0.76, 0.68], chain: [2, 2, 3] },
  queen: { hp: 12, perStage: 3, stages: 4, speed: [1.32, 1.4, 1.6, 1.7], window: [1.4, 1.3, 1.05, 0.95],
    tele: [0.76, 0.74, 0.66, 0.62], chain: [2, 3, 3, 4] },
};

export const FLOOR = { teleSec: 0.40, windowSec: 0.90 };
export const ULT_CHARGE = [0, 26, 20, 15, 12]; // 1-based; the Queen has a fourth stage.
