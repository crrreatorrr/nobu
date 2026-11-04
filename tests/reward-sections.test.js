import { it, expect } from 'vitest';
import { SECTION_RANGES, levelSections, HIDDEN_SECTION } from '../src/levels/sections.js';
import { LEVEL_DOGS } from '../src/levels/metadata.js';
import { SECTION_TEXT } from '../src/story/script.js';
import { sectionName } from '../src/game/hints.js';
it('preserves legacy authoring sections and released dog locations before extension splices', () => {
  const dogDistances = { 1:[17,109,175.5,225.2,257.5],2:[90.5,176,266],3:[68,96.5,154.2,169.5,212],ride:[112,250],cave:[58,164] };
  const hiddenDistances = { 1:109,2:90.5,3:68,ride:112,cave:58 };
  for (const [id,ranges] of Object.entries(SECTION_RANGES)) {
    const rows = levelSections(id,SECTION_TEXT);
    ranges.forEach((r,i) => { expect(r[1]).toBeGreaterThan(r[0]); if(i) expect(r[0]).toBe(ranges[i-1][1]); });
    Object.values(LEVEL_DOGS[id]).slice(0,dogDistances[id].length).forEach((label,i) => expect(sectionName(rows,dogDistances[id][i])).toBe(label));
    expect(sectionName(rows,hiddenDistances[id])).toBe(SECTION_TEXT[HIDDEN_SECTION[id]]);
    expect(rows.every((r) => /^[A-Z][\w'-]*(?: [A-Z][\w'-]*){0,2}$/.test(r.name))).toBe(true);
  }
});
it('installs the canonical rows through the existing helper without altering geometry', async () => {
  const { installSections } = await import('../src/levels/sections.js');
  const calls = []; const k = { section: (...args) => calls.push(args) };
  installSections(k,1,SECTION_TEXT);
  expect(calls).toEqual(levelSections(1,SECTION_TEXT).map(({d0,d1,name}) => [d0,d1,name]));
});
