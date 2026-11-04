import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// File sha256 of metaverse-hub-sdk-0.2.0-4d917b6.tgz. This is the tarball
// bytes of the older hub 4d917b6 package, not the content manifest below.
const REFERENCE_TARBALL_SHA256 = '634de052798c2b3036bb5644df45ab3c29c43b6a4ef2a66328bd8d3371909681';

// Historical LC_ALL=C content manifests, after maps and sourceMappingURL lines
// were removed:
// 0.2.0 / 4d917b6: a4095e4419c85c63f36f7ee0d871b187d87387085311c1f8e76656a66cd30c9c
// 0.2.0 / 8a5b869 (7e77812): 105b90df36cab2e8e3ca25ab2d5bc53b635d7885efc48791a55216be80b0fd2f
// 0.3.0 / c676fde: f6ae2898ee1023426997fb0b0b520ad8468edfa2d9a16a98568ce21e8242e834
// 0.4.0 / 947ed4c (hub #25 branch, session.claim): 6eaa077ee41377b735b334571cbf3b92446649eba5b3f77d304e916ab8dec016
// 0.4.0-redeem.1 / hub main f88b442: 80c344c55edb429d6b395c320df3a902c7c97019ce162c6d7cb001964993c404
// 0.4.0-redeem.1 / hub 9ce6ade: f88b442 plus the dead-session outbox fix:
//   810a0d205afa87755d257639dad4880d002da8f9e0b3f3dbe960558a1c274bc0
// 0.4.0-redeem.1 / hub 9ce6ade plus the local tidebreaker_belt RELIC_IDS patch:
//   ef1dec9403b182cc74ef4bae387c01e3e887c3e70bef9321e886a70c15d2d20b
// 0.4.0-redeem.1 / hub main 6d7176f (Belt and sproto-fighter upstream, no local patch).
const CONTENT_MANIFEST_SHA256 = 'af71e57e79fd86f577d6cb47b53af4ccde4471bac2a79e1bbc52fcc3afb939a4';

function listFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function stripSourceMapping(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !line.includes('sourceMappingURL'))
    .join('\n');
}

// Copy, drop .map files, strip sourceMappingURL lines, then sha256 the
// sorted `sha256  ./path` lines. Never touches vendor/hub-sdk.
function contentManifestSha256(sourceRoot) {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-manifest-'));
  try {
    fs.cpSync(sourceRoot, copy, {
      recursive: true,
      filter: (candidate) => !candidate.split(path.sep).includes('node_modules'),
    });
    for (const file of listFiles(copy)) {
      if (file.endsWith('.map')) fs.rmSync(file);
    }
    const lines = listFiles(copy)
      .map((file) => `./${path.relative(copy, file).split(path.sep).join('/')}`)
      // Byte order, matching LC_ALL=C sort. These paths are ASCII.
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((rel) => {
        const hash = createHash('sha256').update(stripSourceMapping(path.join(copy, rel))).digest('hex');
        return `${hash}  ${rel}`;
      });
    return createHash('sha256').update(`${lines.join('\n')}\n`).digest('hex');
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
}

describe('vendored hub SDK', () => {
  it('package.json is SDK 0.4.0-redeem.1 from hub main', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('vendor/hub-sdk/package.json'), 'utf8'));
    expect(pkg.version).toBe('0.4.0-redeem.1');
    const types = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    const index = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/index.d.ts'), 'utf8');
    expect(types).toContain('getTicketBalance()');
    expect(types).toContain('sessionCapLeft');
    expect(types).toContain('dailyCapLeft');
    expect(types).toContain('serverTime: number;');
    expect(types.match(/serverTime: number;/g)).toHaveLength(2);
    expect(index).toContain('canonicalGameId');
    // Hub main redeems with custom auth plus the server key, then profile.get.
    // It registers no session.claim RPC, so a vendor that calls one never gets a session.
    const live = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/live.js'), 'utf8');
    const nakama = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/nakama.js'), 'utf8');
    expect(live).not.toContain('session.claim');
    expect(live).not.toContain('session.redeem');
    // A queued write on a closed session must not fail every later init.
    expect(live).toContain('async function rebind(row)');
    expect(live).toContain('deadSession(error)');
    expect(nakama).toContain('Authorization: `Basic ${btoa(`${serverKey}:`)}`');
  });

  // live.js asRelics() keeps only ids isRelicId() accepts. Without the Belt here,
  // profile.get would drop it and the Champion's Crown would never unlock. Hub main
  // ships it (b065668), so the vendor tree carries no local patch.
  it('accepts tidebreaker_belt as a relic id from upstream', async () => {
    const types = await import('../vendor/hub-sdk/dist/types.js');
    expect(types.RELIC_IDS).toEqual(['hpos10i_core', 'genesis_shard', 'cones_tip', 'tinubu_crown', 'tidebreaker_belt']);
    expect(types.isRelicId('tidebreaker_belt')).toBe(true);
    expect(types.isRelicId('not_a_relic')).toBe(false);
    expect(types.GAME_IDS).toEqual(['hpos10i', 'nobu', 'peoples-bitcoin', 'sproto', 'sproto-fighter']);
    const live = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/live.js'), 'utf8');
    expect(live).toContain("value.filter((item) => typeof item === 'string' && isRelicId(item))");
    const dts = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    expect(dts).toContain('"tinubu_crown", "tidebreaker_belt"]');
    const vendorNote = fs.readFileSync(path.resolve('vendor/hub-sdk/VENDOR.md'), 'utf8');
    expect(vendorNote).not.toContain('## Local patch');
  });

  it('content manifest matches SDK 0.4.0-redeem.1 after maps and sourceMappingURL are removed', () => {
    expect(REFERENCE_TARBALL_SHA256).toBe('634de052798c2b3036bb5644df45ab3c29c43b6a4ef2a66328bd8d3371909681');
    const hash = contentManifestSha256(path.resolve('vendor/hub-sdk'));
    expect(hash).toBe(CONTENT_MANIFEST_SHA256);
  });
});
