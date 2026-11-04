// M0 moves existing numbers without enabling the later boss powers or tuning.
// H21-H23 switch this on together with those powers after their playtests.
export const M2_ON = false;

export const LEVEL_TIER = { 1: 1, ride: 1.5, 2: 2, cave: 2.5, 3: 3, 4: 4, 6: 4.5, 5: 5 };
// Authored level hazards do not read these multipliers yet: applying them to the
// existing levels would change their tuning during a behavior-preserving refactor.
export const TIER = {
  enemySpeed: [1, 1.08, 1.16, 1.24, 1.32],
  hazardPeriod: [1, 0.95, 0.90, 0.85, 0.80],
  crumbleDelay: [0.60, 0.55, 0.50, 0.45, 0.40],
  snacksGap: [70, 80, 90, 95, 100],
};

export const BOSS = {
  bird: { hp: 6, perStage: 2, stages: 3, speed: [1, 1.2, 1.4], window: [2.7, 2.4, 2.2],
    tele: M2_ON ? [1, 0.88, 0.78] : [1, 1, 1], chain: M2_ON ? [1, 1, 2] : [1, 1, 1] },
  cat: { hp: 6, perStage: 2, stages: 3, speed: [1, 1.2, 1.45], window: M2_ON ? [2.7, 2.4, 2] : [2.8, 2.4, 2],
    tele: M2_ON ? [0.95, 0.84, 0.74] : [1, 1, 1], chain: M2_ON ? [1, 2, 2] : [1, 1, 1] },
  cone: { hp: 9, perStage: 3, stages: 3, speed: [1, 1.25, 1.5], window: [1.8, 1.4, 1.1],
    tele: M2_ON ? [0.9, 0.8, 0.7] : [1, 1, 1], chain: M2_ON ? [1, 2, 3] : [1, 1, 1] },
  titan: { hp: 9, perStage: 3, stages: 3, speed: [1.15, 1.35, 1.55], window: [1.7, 1.35, 1.05],
    tele: [0.85, 0.76, 0.68], chain: [2, 2, 3] },
  queen: { hp: 12, perStage: 3, stages: 4, speed: [1.2, 1.4, 1.6, 1.7], window: [1.6, 1.3, 1.05, 0.95],
    tele: [0.82, 0.74, 0.66, 0.62], chain: [2, 3, 3, 4] },
};

export const FLOOR = { teleSec: 0.40, windowSec: 0.90 };
export const ULT_CHARGE = [0, 26, 20, 15]; // Old common.js chargeTimes, still 1-based.
