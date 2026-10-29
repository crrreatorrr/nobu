// Procedural art for the bonus stages and the newer mechanics (no Higgsfield credits):
// the Owner's House (wood floor, wallpaper, book-spine bridges, window backdrop), Glowworm Grotto
// (rock, strata, mine planks, cave backdrop) and the tutorial icons. Looked up by id through drawFallback.

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
// seeded noise so textures look the same every load
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const INK = '#1a0a24';

function woodFloor() {
  const [c, g] = canvas(256, 256), r = rng(7);
  const tones = ['#b9733c', '#a8642f', '#c68046', '#9c5a2a'];
  for (let i = 0; i < 4; i++) {
    const y = i * 64;
    g.fillStyle = tones[i]; g.fillRect(0, y, 256, 64);
    // grain
    g.strokeStyle = 'rgba(70,30,10,0.18)'; g.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      const yy = y + 6 + r() * 52;
      g.moveTo(0, yy);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, yy + Math.sin(x * 0.05 + k) * 3);
      g.stroke();
    }
    // plank seams and nails
    g.fillStyle = 'rgba(40,15,5,0.55)'; g.fillRect(0, y, 256, 3);
    const seam = (i % 2 ? 90 : 180) + r() * 30;
    g.fillRect(seam, y, 3, 64);
    g.fillStyle = 'rgba(40,20,10,0.6)';
    for (const x of [seam - 8, seam + 10]) { g.beginPath(); g.arc(x, y + 12, 2, 0, 7); g.arc(x, y + 52, 2, 0, 7); g.fill(); }
  }
  // varnish sheen
  const sh = g.createLinearGradient(0, 0, 256, 256);
  sh.addColorStop(0, 'rgba(255,240,210,0.12)'); sh.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = sh; g.fillRect(0, 0, 256, 256);
  return c;
}

function wallpaper() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#f4dfb8'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 64) { g.fillStyle = '#e8c890'; g.fillRect(x + 22, 0, 20, 256); g.fillStyle = '#f9ecd2'; g.fillRect(x + 28, 0, 8, 256); }
  // little paw prints between the stripes
  g.fillStyle = 'rgba(190,110,70,0.55)';
  const paw = (x, y, s) => {
    g.beginPath(); g.ellipse(x, y, 6 * s, 5 * s, 0, 0, 7); g.fill();
    for (const [dx, dy] of [[-7, -7], [-2, -10], [3, -10], [8, -7]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, 2.4 * s, 0, 7); g.fill(); }
  };
  for (let y = 0; y < 256; y += 64) { paw(11, y + 20, 1); paw(53, y + 52, 1); }
  return c;
}

function bookSpines() {
  const [c, g] = canvas(256, 256), r = rng(11);
  const cols = ['#d84a3a', '#3a7ad8', '#3ab060', '#e8b02a', '#8a4ac8', '#2a2a40', '#e06aa0', '#f2e6c8'];
  let x = 0;
  while (x < 256) {
    const w = 14 + Math.floor(r() * 18);
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, 0, w, 256);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 2, 0, 3, 256);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + w - 2, 0, 2, 256);
    g.fillStyle = 'rgba(255,225,120,0.8)';
    for (const y of [40, 216]) g.fillRect(x + 3, y + r() * 10, w - 6, 4);
    x += w;
  }
  return c;
}

function houseBackdrop() {
  const [c, g] = canvas(1024, 440);
  const wall = g.createLinearGradient(0, 0, 0, 440);
  wall.addColorStop(0, '#e9c79a'); wall.addColorStop(1, '#c99a68');
  g.fillStyle = wall; g.fillRect(0, 0, 1024, 440);
  for (let x = 0; x < 1024; x += 48) { g.fillStyle = 'rgba(255,240,215,0.35)'; g.fillRect(x, 0, 14, 300); }
  // windows with a sunset outside
  for (const wx of [120, 560]) {
    const sky = g.createLinearGradient(0, 60, 0, 250);
    sky.addColorStop(0, '#6ab8ff'); sky.addColorStop(0.7, '#ffc78a'); sky.addColorStop(1, '#ff9a6a');
    g.fillStyle = sky; g.fillRect(wx, 60, 300, 190);
    g.fillStyle = '#7ac85a'; g.beginPath(); g.ellipse(wx + 90, 250, 120, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(wx - 12, 48, 324, 14); g.fillRect(wx - 12, 248, 324, 18); g.fillRect(wx - 12, 48, 14, 218); g.fillRect(wx + 298, 48, 14, 218); g.fillRect(wx + 144, 48, 12, 218);
    g.fillStyle = '#c84a5a'; g.fillRect(wx - 40, 36, 34, 240); g.fillRect(wx + 306, 36, 34, 240);
  }
  // picture frame of a very good dog and a wall clock
  g.fillStyle = '#7a4a22'; g.fillRect(452, 90, 80, 100); g.fillStyle = '#fff6e3'; g.fillRect(462, 100, 60, 80);
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.ellipse(492, 150, 18, 20, 0, 0, 7); g.fill();
  g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(477, 138); g.lineTo(482, 120); g.lineTo(489, 136); g.fill(); g.beginPath(); g.moveTo(495, 136); g.lineTo(502, 120); g.lineTo(507, 138); g.fill();
  g.fillStyle = INK; g.beginPath(); g.arc(486, 148, 2.5, 0, 7); g.arc(498, 148, 2.5, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.strokeStyle = '#5a3a1a'; g.lineWidth = 8; g.beginPath(); g.arc(930, 120, 46, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(930, 120); g.lineTo(930, 88); g.moveTo(930, 120); g.lineTo(954, 128); g.stroke();
  // skirting board + floor
  g.fillStyle = '#fff6e3'; g.fillRect(0, 290, 1024, 22);
  const fl = g.createLinearGradient(0, 312, 0, 440);
  fl.addColorStop(0, '#a8642f'); fl.addColorStop(1, '#6a3a18');
  g.fillStyle = fl; g.fillRect(0, 312, 1024, 128);
  return c;
}

function caveRock(base, dark, speck, seed) {
  const [c, g] = canvas(256, 256), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() < 0.5 ? dark : base;
    g.globalAlpha = 0.55;
    const s = 4 + r() * 22;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, s, s * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  if (speck) for (let i = 0; i < 40; i++) { g.fillStyle = speck; g.globalAlpha = 0.5 + r() * 0.5; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 2, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  return c;
}

function caveStrata() {
  const [c, g] = canvas(256, 256), r = rng(23);
  const bands = ['#3a2a52', '#2c2040', '#46345e', '#241a36', '#3c2c4e'];
  let y = 0, i = 0;
  while (y < 256) { const h = 18 + r() * 30; g.fillStyle = bands[i++ % bands.length]; g.fillRect(0, y, 256, h); y += h; }
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
  for (let k = 0; k < 14; k++) { g.beginPath(); const x = r() * 256; g.moveTo(x, r() * 256); g.lineTo(x + (r() - 0.5) * 40, r() * 256); g.stroke(); }
  for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(140,255,170,0.55)'; g.beginPath(); g.arc(r() * 256, r() * 256, 1.5, 0, 7); g.fill(); }
  return c;
}

function minePlanks() {
  const [c, g] = canvas(256, 256), r = rng(31);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = ['#6a4a2a', '#5a3c22', '#74522e', '#503420'][i]; g.fillRect(0, i * 64, 256, 64);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, i * 64, 256, 4);
    g.fillStyle = '#9a9aa8'; for (const x of [20, 236]) { g.beginPath(); g.arc(x, i * 64 + 32, 4, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(30,15,5,0.3)';
    for (let k = 0; k < 5; k++) { g.beginPath(); const yy = i * 64 + 8 + r() * 48; g.moveTo(0, yy); g.lineTo(256, yy + (r() - 0.5) * 6); g.stroke(); }
  }
  return c;
}

function caveBackdrop() {
  const [c, g] = canvas(1024, 440), r = rng(41);
  const bg = g.createLinearGradient(0, 0, 0, 440);
  bg.addColorStop(0, '#05040a'); bg.addColorStop(0.6, '#0e0a1c'); bg.addColorStop(1, '#05040a');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 440);
  g.fillStyle = '#020205';
  for (let x = 0; x < 1024; x += 30 + r() * 40) { const w = 20 + r() * 40, h = 40 + r() * 140; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w / 2, h); g.lineTo(x + w, 0); g.fill(); }
  for (let x = 0; x < 1024; x += 40 + r() * 50) { const w = 30 + r() * 50, h = 30 + r() * 90; g.beginPath(); g.moveTo(x, 440); g.lineTo(x + w / 2, 440 - h); g.lineTo(x + w, 440); g.fill(); }
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,255,150,0.8)' : 'rgba(120,200,255,0.7)'; g.beginPath(); g.arc(r() * 1024, 60 + r() * 300, 1 + r() * 1.8, 0, 7); g.fill(); }
  return c;
}

// ---------- tutorial icons ----------
function icon(draw) {
  const [c, g] = canvas(256, 256);
  g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g);
  return c;
}
const steel = (g, x, y, w, h, band = '#6a7280') => {
  g.fillStyle = '#c4ccd8'; g.strokeStyle = INK; g.lineWidth = 9;
  g.beginPath(); g.roundRect(x, y, w, h, 18); g.fill(); g.stroke();
  g.fillStyle = band; g.fillRect(x + 6, y + h * 0.42, w - 12, h * 0.16);
  g.fillStyle = '#ffffff'; g.globalAlpha = 0.5; g.fillRect(x + 16, y + 12, w * 0.35, 10); g.globalAlpha = 1;
  g.fillStyle = INK; for (const [rx, ry] of [[x + 18, y + 18], [x + w - 18, y + 18], [x + 18, y + h - 18], [x + w - 18, y + h - 18]]) { g.beginPath(); g.arc(rx, ry, 5, 0, 7); g.fill(); }
};
// the green switch crate with its circled "!" (bottom part of the switch icons)
function switchCrateIcon(g, top) {
  g.fillStyle = '#3ec46d'; g.strokeStyle = INK; g.lineWidth = 10;
  g.beginPath(); g.roundRect(44, top, 168, 236 - top, 16); g.fill(); g.stroke();
  g.strokeStyle = '#1f6a36'; g.lineWidth = 8; g.strokeRect(54, top + 10, 148, 216 - top);
  const cy = (top + 236) / 2 + 4, r = Math.min(46, (236 - top) / 2 - 12);
  g.fillStyle = '#15692f'; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(128, cy, r, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = '#d8ffe0'; g.lineWidth = 4; g.beginPath(); g.arc(128, cy, r - 7, 0, 7); g.stroke();
  g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.roundRect(118, cy - r * 0.62, 20, r * 0.8, 8); g.fill(); g.stroke();
  g.beginPath(); g.arc(128, cy + r * 0.45, 9, 0, 7); g.fill(); g.stroke();
}

const ICONS = {
  icon_lunchbox: () => icon((g) => {
    steel(g, 38, 70, 180, 150);
    g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.arc(128, 70, 34, Math.PI, 0); g.stroke();
    g.fillStyle = '#ffd23f'; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.roundRect(110, 120, 36, 30, 6); g.fill(); g.stroke();
  }),
  icon_arrowbox: () => icon((g) => {
    steel(g, 38, 86, 180, 140, '#e8b02a');
    g.fillStyle = '#ffd23f'; g.strokeStyle = INK; g.lineWidth = 8;
    g.beginPath(); g.moveTo(128, 18); g.lineTo(186, 84); g.lineTo(150, 84); g.lineTo(150, 130); g.lineTo(106, 130); g.lineTo(106, 84); g.lineTo(70, 84); g.closePath(); g.fill(); g.stroke();
  }),
  icon_zipped: () => icon((g) => {
    g.fillStyle = '#1e2a4a'; g.strokeStyle = INK; g.lineWidth = 9;
    g.beginPath(); g.roundRect(46, 50, 164, 180, 46); g.fill(); g.stroke();
    g.strokeStyle = '#d0d0dc'; g.lineWidth = 8; g.setLineDash([8, 8]); g.beginPath(); g.arc(128, 150, 62, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.setLineDash([]);
    ['#e84a3a', '#ffd23f', '#3ec46d'].forEach((col, i) => { g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.roundRect(84 + i * 32, 150, 22, 44, 6); g.fill(); g.stroke(); });
    g.fillStyle = '#fff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('x3', 128, 120);
  }),
  icon_vacswitch: () => icon((g) => {
    switchCrateIcon(g, 116);
    g.fillStyle = '#2a2a34'; g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.ellipse(128, 112, 86, 16, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#7a3fd0'; g.lineWidth = 8; g.beginPath(); g.ellipse(128, 88, 62, 26, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#9a9aaa'; g.beginPath(); g.ellipse(128, 80, 38, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(106, 96, 6, 0, 7); g.arc(150, 96, 6, 0, 7); g.fill();
  }),
  icon_boneswitch: () => icon((g) => {
    g.fillStyle = '#2a8cff'; g.strokeStyle = INK; g.lineWidth = 10;
    g.beginPath(); g.roundRect(44, 100, 168, 136, 16); g.fill(); g.stroke();
    g.strokeStyle = '#174f9a'; g.lineWidth = 8; g.strokeRect(54, 110, 148, 116);
    g.fillStyle = '#123f86'; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(128, 168, 46, 0, 7); g.fill(); g.stroke();
    const bone = (cx, cy, s, fill) => {
      g.save(); g.translate(cx, cy); g.rotate(-0.6); g.fillStyle = fill; g.strokeStyle = INK; g.lineWidth = 5;
      g.beginPath(); g.roundRect(-26 * s, -8 * s, 52 * s, 16 * s, 6); g.fill(); g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * 28 * s, sy * 9 * s, 11 * s, 0, 7); g.fill(); g.stroke(); }
      g.restore();
    };
    bone(128, 168, 1, '#fff6e3');
    bone(128, 54, 1.25, '#ffc21a');
  }),
  icon_lint: () => icon((g) => {
    switchCrateIcon(g, 122);
    g.strokeStyle = INK; g.lineWidth = 9;
    g.fillStyle = '#2a6ad0'; g.beginPath(); g.roundRect(150, 24, 30, 84, 14); g.fill(); g.stroke();
    g.strokeStyle = '#9aa2b0'; g.lineWidth = 6; g.beginPath(); g.moveTo(165, 100); g.lineTo(150, 112); g.moveTo(165, 100); g.lineTo(196, 104); g.stroke();
    g.fillStyle = '#f6f8ff'; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.roundRect(52, 92, 152, 50, 24); g.fill(); g.stroke();
    g.strokeStyle = '#8aa0d8'; g.lineWidth = 3; for (let x = 66; x < 196; x += 16) { g.beginPath(); g.moveTo(x, 98); g.lineTo(x + 14, 136); g.stroke(); }
    for (const [x, y, c] of [[84, 112, '#c86a4a'], [128, 122, '#8a4ac8'], [168, 108, '#e84a7a']]) { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 6, x + 14, y + 3); g.stroke(); }
  }),
  icon_knight: () => icon((g) => {
    g.fillStyle = '#4fbf3a'; g.strokeStyle = INK; g.lineWidth = 9;
    g.beginPath(); g.arc(128, 96, 62, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#c4ccd8'; g.beginPath(); g.arc(128, 70, 56, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = INK; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(90 + i * 15, 52 + Math.abs(i - 2.5) * 4, 4, 0, 7); g.fill(); }
    g.fillStyle = '#b8c0cc'; g.beginPath(); g.ellipse(128, 176, 70, 64, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(104, 156, 22, 12, -0.5, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = INK; g.beginPath(); g.roundRect(112, 166, 32, 16, 6); g.fill();
  }),
  icon_shellback: () => icon((g) => {
    g.fillStyle = '#8acb5a'; g.strokeStyle = INK; g.lineWidth = 9;
    for (const x of [74, 182]) { g.beginPath(); g.roundRect(x - 18, 170, 36, 44, 12); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(210, 150, 30, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#3a8a4a'; g.beginPath(); g.ellipse(128, 160, 96, 70, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#a8e070'; g.lineWidth = 5;
    for (const [x, y] of [[96, 130], [128, 112], [160, 130], [128, 148]]) { g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(x + Math.cos(a * Math.PI / 3) * 16, y + Math.sin(a * Math.PI / 3) * 14); g.closePath(); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(218, 142, 8, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(220, 144, 4, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(206, 128); g.lineTo(228, 134); g.stroke();
  }),
  icon_ride: () => icon((g) => {
    g.fillStyle = '#7a3fd0'; g.strokeStyle = INK; g.lineWidth = 9;
    g.beginPath(); g.ellipse(128, 176, 100, 40, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#9a9aaa'; g.beginPath(); g.ellipse(128, 166, 70, 22, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(96, 186, 7, 0, 7); g.arc(160, 186, 7, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(128, 104, 34, 50, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(128, 56, 30, 0, 7); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(118, 52, 4, 0, 7); g.arc(138, 52, 4, 0, 7); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 6; for (const y of [130, 160, 190]) { g.beginPath(); g.moveTo(10, y); g.lineTo(34, y); g.stroke(); }
  }),
  icon_glowworm: () => icon((g) => {
    const glow = g.createRadialGradient(128, 128, 10, 128, 128, 120);
    glow.addColorStop(0, 'rgba(210,255,150,0.9)'); glow.addColorStop(1, 'rgba(210,255,150,0)');
    g.fillStyle = '#0a0814'; g.fillRect(0, 0, 256, 256); g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#d8ff8a'; g.strokeStyle = INK; g.lineWidth = 7;
    for (const [x, y, r] of [[70, 170, 26], [104, 150, 30], [140, 138, 32]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(178, 118, 36, 0, 7); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(170, 112, 5, 0, 7); g.arc(190, 112, 5, 0, 7); g.fill();
    g.beginPath(); g.arc(180, 126, 10, 0.2, Math.PI - 0.2); g.stroke();
  }),
};

export const PROCEDURAL = {
  tex_house_ground: woodFloor,
  tex_house_wall: wallpaper,
  tex_house_platform: bookSpines,
  bg_house: houseBackdrop,
  tex_cave_ground: () => caveRock('#2e2638', '#1e1828', 'rgba(150,255,170,0.7)', 3),
  tex_cave_wall: caveStrata,
  tex_cave_platform: minePlanks,
  bg_cave: caveBackdrop,
  ...ICONS,
};
