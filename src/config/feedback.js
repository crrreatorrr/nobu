// Hit feedback: hitstop (a few frozen frames) and gamepad rumble. Camera shake stays at its call sites.
// Hitstop is off wherever a clock is ranked or recorded (time trials, ranked play, Boss Rush, Box
// Gauntlets), and a boss fight's medal clock keeps running through it.
export const HITSTOP_MS = Object.freeze({ kill: 40, bossHit: 80, maskLost: 60 });
// [milliseconds, strong motor, weak motor]
export const RUMBLE = Object.freeze({
  maskLost: [150, 0.8, 0.4],
  death: [250, 1.0, 0.6],
  flop: [90, 0.6, 0.2],
  bossHit: [120, 0.7, 0.5],
});
export const KILL_SHAKE = Object.freeze({ amp: 0.12, dur: 0.12 });
