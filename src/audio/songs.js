// Music patterns for the step sequencer. One token = one 16th note.
// "." rest, "-" hold previous note, "C4+E4+G4" chord. Drums: "x" hit, "X" accent.

const bars = (...b) => b.join(' ');

export const SONGS = {
  // Queen: four bars of proclamation, then four of collapse, in E-flat minor.
  boss5: {
    bpm: 132,
    tracks: [
      { wave: 'triangle', vol: .21, gate: .98, attack: .08, notes: bars(
        'Eb3+Gb3+Bb3 - - - - - - - Eb3+Gb3+Bb3 - - - - - - -',
        'B2+Eb3+Gb3 - - - - - - - B2+Eb3+Gb3 - - - - - - -',
        'Ab2+B2+Eb3 - - - - - - - Gb2+Bb2+Db3 - - - - - - -',
        'Bb2+D3+F3 - - - - - - - Bb2+D3+Ab3 - - - - - - -',
        'Eb3+Gb3+Bb3 - - - - - - - Db3+F3+Ab3 - - - - - - -',
        'B2+Eb3+Gb3 - - - - - - - Ab2+B2+Eb3 - - - - - - -',
        'Bb2+D3+F3 - - - - - - - Bb2+D3+Ab3 - - - - - - -',
        'Eb3+Gb3+Bb3 - - - - - - - Eb3+Gb3+Bb3 - - - - - - -') },
      { wave: 'square', vol: .075, gate: .62, notes: bars(
        'Eb5 - Bb5 - Gb5 - Eb5 - Bb5 - - - Gb5 - - -',
        'B5 - Bb5 - Gb5 - Eb5 - Gb5 - - - Bb5 - - -',
        'Ab5 - Eb5 - B4 - Ab4 - Gb5 - Db5 - Bb4 - Gb4 -',
        'Bb4 - D5 - F5 - Ab5 - Bb5 - - - D6 - - -',
        'Eb6 - Bb5 - Gb5 - Eb5 - Db6 - Ab5 - F5 - Db5 -',
        'B5 - Gb5 - Eb5 - B4 - Ab5 - Eb5 - B4 - Ab4 -',
        'Bb4 - D5 - F5 - Ab5 - Bb5 - D6 - F6 - D6 -',
        'Eb6 - - - Bb5 - Gb5 - Eb5 - - - - - . .') },
    ],
    drums: { kick: 'X...x...X...x...', snare: '....x.......x.xx', hat: 'x.x.x.x.x.x.xxx.' },
  },
  // Eight bars of D-minor surf/shanty motion; the last bar has a tom fill.
  level6: {
    bpm: 136,
    tracks: [
      { wave: 'square', vol: .085, gate: .65, slide: 1.025, notes: bars(
        'D5 . F5 . A5 - F5 . D5 . F5 . A5 . C6 .',
        'Bb5 - A5 . F5 . D5 . C5 . D5 . F5 - - .',
        'G5 . Bb5 . D6 - Bb5 . G5 . F5 . E5 . D5 .',
        'A4 . C#5 . E5 . G5 . A5 - - . E5 . C#5 .',
        'D5 . F5 . A5 . D6 . C6 - A5 . F5 . D5 .',
        'Bb5 . D6 . F6 - D6 . C6 . Bb5 . A5 . F5 .',
        'G5 . Bb5 . D6 . C6 . A5 . G5 . F5 . E5 .',
        'A5 . C#6 . E6 - C#6 . D6 - A5 . D5 - - .') },
      { wave: 'triangle', vol: .23, gate: .6, notes: bars(
        '. D2 . A2 . D3 . F3 . D2 . A2 . C3 . A2',
        '. Bb1 . F2 . Bb2 . D3 . C2 . G2 . C3 . E3',
        '. G1 . D2 . G2 . Bb2 . G1 . D2 . F2 . D2',
        '. A1 . E2 . A2 . C#3 . A1 . G2 . E2 . C#2',
        '. D2 . A2 . D3 . F3 . D2 . A2 . C3 . A2',
        '. Bb1 . F2 . Bb2 . D3 . C2 . G2 . C3 . E3',
        '. G1 . D2 . G2 . Bb2 . A1 . E2 . G2 . C#3',
        '. A1 . E2 . A2 . C#3 . D2 . A2 . F2 . D2') },
    ],
    drums: { kick: 'X.......X.......'.repeat(8), snare: '....x.......x...'.repeat(8), hat: 'x.x.x.x.x.x.x.x.'.repeat(8), tom: '.'.repeat(112) + '........x.x.x.xx' },
  },
  // Titan: eight bars in D minor; motor-like square ostinato and sliding whirr.
  boss4: {
    bpm: 140,
    tracks: [
      { wave: 'square', vol: .11, gate: .48, filter: 'lowpass', cutoff: 850, notes: bars(
        'D2 D3 A2 D3 D2 D3 F2 A2 D2 D3 A2 D3 C3 A2 F2 E2',
        'D2 D3 A2 D3 D2 D3 F2 A2 C3 C3 G2 C3 A2 A2 E2 A2',
        'Bb1 Bb2 F2 Bb2 Bb1 Bb2 D2 F2 C2 C3 G2 C3 C2 C3 E2 G2',
        'A1 A2 E2 A2 A1 A2 C#2 E2 A1 A2 E2 A2 C#3 A2 E2 C#2',
        'G1 G2 D2 G2 G1 G2 Bb1 D2 G1 G2 D2 G2 F2 D2 Bb1 A1',
        'D2 D3 A2 D3 D2 D3 F2 A2 D2 D3 A2 D3 F3 E3 D3 A2',
        'Bb1 Bb2 F2 Bb2 Bb1 Bb2 D2 F2 C2 C3 G2 C3 C2 C3 E2 G2',
        'A1 A2 E2 A2 A1 A2 C#2 E2 A2 A2 E3 C#3 D3 A2 F2 D2') },
      { wave: 'sawtooth', vol: .055, gate: .94, slide: 1.06, vibrato: 9, vibDepth: 9, filter: 'lowpass', cutoff: 1600, notes: bars(
        'D4 - - - A4 - - - F4 - E4 - D4 - - -',
        'F4 - - - A4 - C5 - Bb4 - A4 - G4 - E4 -',
        'Bb4 - - - F4 - D4 - C5 - - - G4 - E4 -',
        'A4 - - - E4 - C#4 - D4 - - - - - . .',
        'G4 - Bb4 - D5 - - - C5 - Bb4 - A4 - G4 -',
        'F4 - A4 - D5 - - - E5 - D5 - C5 - A4 -',
        'Bb4 - F4 - D4 - - - C5 - G4 - E4 - - -',
        'A4 - C#5 - E5 - - - D5 - A4 - F4 - D4 -') },
    ],
    drums: { kick: 'X..xX..xX..xX.x.', snare: '....x.......x.xx', hat: 'x.xxx.xxx.xxx.xx', clank: '..x.......x.....' },
  },
  level4: {
    bpm: 112,
    tracks: [
      { wave: 'square', vol: 0.08, gate: 0.45, notes: bars(
        'Bb5 . D6 . F6 . D6 . C6 . Bb5 . A5 . F5 .',
        '. . F5 . G5 . A5 . Bb5 - . . F5 . . .',
        'G5 . Bb5 . D6 . F6 . Eb6 . D6 . C6 . Bb5 .',
        '. . A5 . C6 . Eb6 . D6 . C6 . Bb5 - . .',
        '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .',
        '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .') },
      { wave: 'triangle', vol: 0.2, gate: 0.7, notes: bars(
        'Bb1 . F2 . Bb2 . A2 . G2 . F2 . D2 . A1 .',
        'Bb1 . D2 . F2 . G2 . Bb2 . G2 . F2 . D2 .',
        'Eb2 . Bb1 . Eb2 . G2 . C2 . G2 . Bb2 . B1 .',
        'C2 . G2 . Bb2 . A2 . F2 . C2 . Eb2 . E2 .',
        'Bb1 . . . F2 . . . Bb1 . . . A1 . . .',
        'Eb2 . . . Bb1 . . . Gb2 . . . F2 . . .',
        'C2 . . . G2 . . . Bb1 . . . B1 . . .',
        'F2 . . . Eb2 . . . D2 . C2 . Bb1 . . .') },
      { wave: 'triangle', vol: 0.055, pluck: 0.1, notes: bars(
        '. . . . . . Bb3+D4+F4+G4 . . . . . . . Bb3+D4+F4+G4 .',
        '. . . . . . Eb3+G3+Bb3+D4 . . . . . . . Eb3+G3+Bb3+D4 .',
        '. . . . . . C3+Eb3+G3+Bb3 . . . . . . . C3+Eb3+G3+Bb3 .',
        '. . . . . . F3+A3+C4+Eb4 . . . . . . . F3+A3+C4+Eb4 .',
        '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .',
        '. . . . . . . . . . . . . . . .', '. . . . . . Eb3+Gb3+Bb3 . . . . . . . . .') },
    ],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      shaker: bars(...Array(4).fill('................'), ...Array(4).fill('xxxxxxxxxxxxxxxx')).replaceAll(' ', '') },
  },
  // Bouncy, island-y title theme (F major)
  title: {
    bpm: 118,
    tracks: [
      { wave: 'square', vol: 0.09, gate: 0.6, notes: bars(
        'F5 . A5 . C6 . A5 . Bb5 . A5 . G5 . F5 .',
        'G5 . Bb5 . D6 . Bb5 . C6 - - . A5 . . .',
        'F5 . A5 . C6 . F6 . E6 . C6 . D6 . Bb5 .',
        'C6 . A5 . G5 . E5 . F5 - - - . . . .') },
      { wave: 'triangle', vol: 0.22, gate: 0.7, notes: bars(
        'F2 . . F3 . . C3 . F2 . . F3 . . C3 .',
        'G2 . . G3 . . D3 . C3 . . C3 . . E3 .',
        'F2 . . F3 . . C3 . Bb2 . . Bb2 . . D3 .',
        'C3 . . C3 . . E3 . F2 . . C3 . . F2 .') },
      { wave: 'triangle', vol: 0.07, pluck: 0.12, notes: bars(
        '. . A4+C5 . . . A4+C5 . . . A4+C5 . . . A4+C5 .',
        '. . Bb4+D5 . . . Bb4+D5 . . . G4+C5 . . . G4+C5 .',
        '. . A4+C5 . . . A4+C5 . . . Bb4+D5 . . . Bb4+D5 .',
        '. . G4+C5 . . . G4+C5 . . . A4+C5 . . . A4+C5 .') },
    ],
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...x.', shaker: 'x.x.x.x.x.x.x.x.' },
  },

  map: {
    bpm: 100,
    tracks: [
      { wave: 'triangle', vol: 0.14, gate: 0.8, notes: bars(
        'G5 . . B5 . . D6 . . B5 . . A5 - - .',
        'E5 . . G5 . . B5 . . A5 . . G5 - - .',
        'C5 . . E5 . . G5 . . F#5 . . E5 . D5 .',
        'D5 . . F#5 . . A5 . . C6 . . B5 - - .') },
      { wave: 'sine', vol: 0.25, notes: bars(
        'G2 - - - . . D3 . G2 - - - . . B2 .',
        'E2 - - - . . B2 . E2 - - - . . G2 .',
        'C3 - - - . . G2 . C3 - - - . . E3 .',
        'D3 - - - . . A2 . D3 - - - . . F#2 .') },
    ],
    drums: { kick: 'x.......x.......', shaker: '..x...x...x...x.' },
  },

  // Level 1: Bark Jungle — marimba-ish calypso in C
  level1: {
    bpm: 132,
    tracks: [
      { wave: 'square', vol: 0.085, gate: 0.55, notes: bars(
        'E5 . G5 . C6 . G5 . A5 - G5 . E5 . D5 .',
        'C5 . E5 . A5 . E5 . G5 - E5 . C5 . D5 .',
        'F5 . A5 . C6 . A5 . D6 - C6 . A5 . G5 .',
        'G5 . B5 . D6 . B5 . C6 - - - . . G5 .',
        'E5 . G5 . C6 . E6 . D6 - C6 . A5 . G5 .',
        'A5 . C6 . E6 . C6 . B5 - A5 . G5 . E5 .',
        'F5 . A5 . C6 . F6 . E6 . D6 . C6 . A5 .',
        'B5 . D6 . G5 . B5 . C6 - - - . . . .') },
      { wave: 'triangle', vol: 0.24, gate: 0.6, notes: bars(
        'C3 . . C3 . . G2 . C3 . . C3 . . G2 .',
        'A2 . . A2 . . E2 . A2 . . A2 . . E2 .',
        'F2 . . F2 . . C3 . F2 . . F2 . . C3 .',
        'G2 . . G2 . . D3 . G2 . . B2 . . D3 .',
        'C3 . . C3 . . G2 . C3 . . C3 . . G2 .',
        'A2 . . A2 . . E2 . A2 . . A2 . . E2 .',
        'F2 . . F2 . . C3 . F2 . . F2 . . C3 .',
        'G2 . . G2 . . D3 . C3 . . G2 . . C3 .') },
      { wave: 'triangle', vol: 0.07, pluck: 0.09, notes: bars(
        '. C5+E5 . . . C5+E5 . . . C5+E5 . . . C5+E5 . .',
        '. C5+E5 . . . C5+E5 . . . A4+C5 . . . A4+C5 . .',
        '. A4+C5 . . . A4+C5 . . . A4+C5 . . . A4+C5 . .',
        '. B4+D5 . . . B4+D5 . . . B4+D5 . . . B4+D5 . .',
        '. C5+E5 . . . C5+E5 . . . C5+E5 . . . C5+E5 . .',
        '. C5+E5 . . . C5+E5 . . . A4+C5 . . . A4+C5 . .',
        '. A4+C5 . . . A4+C5 . . . A4+C5 . . . A4+C5 . .',
        '. B4+D5 . . . B4+D5 . . . E5+G5 . . . E5+G5 . .') },
    ],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x..x', hat: '..x...x...x...x.', shaker: 'x.xxx.xxx.xxx.xx' },
  },

  // Level 2: The Big Cat chase — driving A minor
  level2: {
    bpm: 154,
    tracks: [
      { wave: 'square', vol: 0.085, gate: 0.6, notes: bars(
        'A5 . . E5 . . A5 . C6 . B5 . A5 . E5 .',
        'F5 . . C5 . . F5 . A5 . G5 . F5 . C5 .',
        'G5 . . D5 . . G5 . B5 . A5 . G5 . D5 .',
        'E5 . G#5 . B5 . E6 . D6 . B5 . G#5 . E5 .') },
      { wave: 'sawtooth', vol: 0.11, gate: 0.5, filter: 'lowpass', cutoff: 900, notes: bars(
        'A2 . A2 . A3 . A2 . A2 . A3 . A2 . G2 .',
        'F2 . F2 . F3 . F2 . F2 . F3 . F2 . E2 .',
        'G2 . G2 . G3 . G2 . G2 . G3 . G2 . F#2 .',
        'E2 . E2 . E3 . E2 . G#2 . G#2 . B2 . E2 .') },
      { wave: 'square', vol: 0.04, pluck: 0.05, notes: bars(
        'A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5',
        'F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4',
        'G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4',
        'E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4') },
    ],
    drums: { kick: 'X...x.x.X...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' },
  },

  // Level 3: Cone Factory — industrial E minor
  level3: {
    bpm: 126,
    tracks: [
      { wave: 'square', vol: 0.08, gate: 0.7, notes: bars(
        'E5 . . . B4 . . . E5 . G5 . F#5 . E5 .',
        'C5 . . . G4 . . . C5 . E5 . D5 . C5 .',
        'D5 . . . A4 . . . D5 . F#5 . E5 . D5 .',
        'B4 . D#5 . F#5 . B5 . A5 . F#5 . D#5 . B4 .') },
      { wave: 'sawtooth', vol: 0.12, gate: 0.4, filter: 'lowpass', cutoff: 700, notes: bars(
        'E2 . E2 E3 . E2 . E2 E2 . E3 . D3 . B2 .',
        'C2 . C2 C3 . C2 . C2 C2 . C3 . B2 . G2 .',
        'D2 . D2 D3 . D2 . D2 D2 . D3 . C3 . A2 .',
        'B1 . B1 B2 . B1 . B1 B1 . B2 . A2 . F#2 .') },
    ],
    drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', clank: '......x.......x.' },
  },

  boss: {
    bpm: 146,
    tracks: [
      { wave: 'square', vol: 0.09, gate: 0.85, notes: bars(
        'D5 - F5 - A5 - G5 F5 E5 - C5 - D5 - - -',
        'D5 - F5 - A5 - C6 Bb5 A5 - G5 - A5 - - -',
        'Bb5 - A5 - G5 - F5 E5 F5 - G5 - A5 - - -',
        'C#6 - A5 - E5 - G5 F5 E5 - C#5 - D5 - - -') },
      { wave: 'sawtooth', vol: 0.11, gate: 0.5, filter: 'lowpass', cutoff: 800, notes: bars(
        'D2 D2 . D3 D2 . D2 D3 C3 C3 . C3 A2 . C3 .',
        'D2 D2 . D3 D2 . D2 D3 F2 F2 . F3 C3 . F2 .',
        'Bb1 Bb1 . Bb2 Bb1 . Bb1 Bb2 C2 C2 . C3 C2 . C3 .',
        'A1 A1 . A2 A1 . A1 A2 A1 A1 . A2 C#3 . A2 .') },
    ],
    drums: { kick: 'X..xX..xX..xX.x.', snare: '....x.......x.xx', hat: 'x.xxx.xxx.xxx.xx' },
  },

  finalBoss: {
    bpm: 158,
    tracks: [
      { wave: 'square', vol: 0.09, gate: 0.8, notes: bars(
        'C5 . Eb5 . G5 . F#5 . G5 . Eb5 . C5 . B4 .',
        'C5 . Eb5 . G5 . Ab5 . G5 . F5 . Eb5 . D5 .',
        'Ab4 . C5 . Eb5 . D5 . Eb5 . C5 . Ab4 . G4 .',
        'B4 . D5 . F5 . Ab5 . G5 - - - F5 - D5 -') },
      { wave: 'sawtooth', vol: 0.12, gate: 0.45, filter: 'lowpass', cutoff: 900, notes: bars(
        'C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 B1 B1 B2 B1',
        'C2 C2 C3 C2 C2 C2 C3 C2 Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1',
        'Ab1 Ab1 Ab2 Ab1 Ab1 Ab1 Ab2 Ab1 Ab1 Ab1 Ab2 Ab1 G1 G1 G2 G1',
        'G1 G1 G2 G1 G1 G1 G2 G1 G1 G1 G2 G1 B1 B1 B2 B1') },
      { wave: 'triangle', vol: 0.06, attack: 0.08, notes: bars(
        'C4+Eb4+G4 - - - - - - - - - - - - - - -',
        'C4+Eb4+Ab4 - - - - - - - Bb3+D4+F4 - - - - - - -',
        'Ab3+C4+Eb4 - - - - - - - - - - - - - - -',
        'G3+B3+D4 - - - - - - - - - - - - - - -') },
    ],
    drums: { kick: 'X.x.X.x.X.x.X.xx', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', clank: '..x.......x.....' },
  },

  victory: {
    bpm: 124,
    tracks: [
      { wave: 'square', vol: 0.1, gate: 0.8, notes: bars(
        'C5 . E5 . G5 . C6 - - - B5 . C6 - - -',
        'A5 . C6 . F6 - - - E6 . D6 . C6 - - -',
        'D6 . B5 . G5 . D6 - - - C6 . B5 . A5 .',
        'G5 . C6 . E6 . G6 - - - - - . . . .') },
      { wave: 'triangle', vol: 0.24, notes: bars(
        'C3 . G2 . C3 . G2 . C3 . G2 . C3 . E3 .',
        'F2 . C3 . F2 . C3 . F2 . C3 . A2 . F2 .',
        'G2 . D3 . G2 . D3 . G2 . D3 . B2 . G2 .',
        'C3 . G2 . E3 . C3 . G2 . E2 . C3 . . .') },
      { wave: 'triangle', vol: 0.07, pluck: 0.1, notes: bars(
        '. . C5+E5+G5 . . . C5+E5+G5 . . . C5+E5+G5 . . . C5+E5+G5 .',
        '. . C5+F5+A5 . . . C5+F5+A5 . . . C5+F5+A5 . . . C5+F5+A5 .',
        '. . B4+D5+G5 . . . B4+D5+G5 . . . B4+D5+G5 . . . B4+D5+G5 .',
        '. . C5+E5+G5 . . . C5+E5+G5 . . . C5+E5+G5 . . . C5+E5+G5 .') },
    ],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', shaker: '.x.x.x.x.x.x.x.x' },
  },

  complete: {
    bpm: 140, loop: false,
    tracks: [
      { wave: 'square', vol: 0.12, notes: 'C5 . E5 . G5 . C6 . E6 . G6 - - - - - C6+E6+G6 - - - - - - - . . . .' },
      { wave: 'triangle', vol: 0.25, notes: 'C3 . . . G2 . . . C3 . . . G2 - - - - - C3 - - - - - - - . . . .' },
    ],
  },

  gameOver: {
    bpm: 90, loop: false,
    tracks: [
      { wave: 'square', vol: 0.1, notes: 'G4 . . F#4 . . F4 . . E4 - - - - - - . . . .' },
      { wave: 'triangle', vol: 0.22, notes: 'C3 . . B2 . . Bb2 . . A2 - - - - - - . . . .' },
    ],
  },

  cutscene: {
    bpm: 96,
    tracks: [
      { wave: 'triangle', vol: 0.12, gate: 0.9, notes: bars(
        'D5 - - - F5 - - - A5 - - - G5 - F5 -',
        'E5 - - - C5 - - - D5 - - - - - - -') },
      { wave: 'sine', vol: 0.22, notes: bars(
        'D3 - - - - - - - Bb2 - - - - - - -',
        'C3 - - - - - - - A2 - - - - - - -') },
    ],
    drums: { kick: 'x.......x.......' },
  },
};
