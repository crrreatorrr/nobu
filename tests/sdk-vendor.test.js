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
// 0.4.0-redeem.1 / hub main 6d7176f (Belt and sproto-fighter upstream, no local patch):
//   af71e57e79fd86f577d6cb47b53af4ccde4471bac2a79e1bbc52fcc3afb939a4
// 0.5.0 / hub 441b7c4 (realtime, ScoreResult, getLeaderboard):
//   7d994bb3744c3d2f59e3bfa6e235b728554b7644a4f4b521b9fb7fd1033b7b76
// 0.5.0 / hub 1c8b72e (early match data kept for the new match handle):
//   1098c5d324331d84e17e6301b601814fd6f3d34ac44580dd7d73419033a1d82b
// 0.6.0 / hub ee187cf (sproto-arcade, breakwater_coin, optional loadSave/writeSave).
// 0.6.0 / hub main 93e4894 (Classic/layout2 trial variants; generated vendor workflow).
//   18018817130d23586ba30db373fafb6244ff730d663588a2ce94f50426bfbf1a
// 0.6.1 / exact merged hub main b8636ee7b222cc39f2a4e18b1ce944276299e52d
// (expanded trial variants and terminal outbox refusals; supported helper output):
//   98b625bac349f83e5afe75491c14d0fe70e8ac63206b8beaafba51d210b6a372
// 0.6.3 / exact merged hub main 5cc4e4809180f5bc0b016301d9222c26a80e6d4c
// (hub #90; classic-script IIFE, global HubSDK):
//   3813f4566254eff06733e0f5f156052116fa3aad6d4fd36b259b86f00da65dd5
//   iife 4ceb36321fc09820c4ef6292b8bd31ebaa198f0a9b90d38bcbd458505222df76
// 0.6.4 / exact merged hub main 2a82e9ec5986fc6eac10d90d4b121dfcb408e9e9
// (hub #117; marina_anchor and dragon_scale):
//   d4da695e6fda1b575ac41ef308d5ef4a862b9d0cdc68b5064385590b6adf9818
//   iife e7626595184dc132e72ffd707c87149b266c7b3933d40670e55eb2fb0a64eda6
// 0.7.0 / hub branch claude/festive-ptolemy-4mg8oe at b9ac308, not merged to hub main yet
// (in-game feedback window: installFeedback, feedbackAccess, submitFeedback). Re-vendor from
// hub main once that branch merges. File sha256 of dist/hub-sdk.iife.js:
const CONTENT_MANIFEST_SHA256 = '05c5a9b2de11d00d921df6c3eb7a2948b1af06d862f0031eeea1baed34a1c476';
const IIFE_SHA256 = '092603b61a3511fbbcaa3b674b16f02b24d581752e1fa1dc69eeb577bc5ae5e8';

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
  it('package.json is SDK 0.7.0', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('vendor/hub-sdk/package.json'), 'utf8'));
    expect(pkg.version).toBe('0.7.0');
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

  it('pins generated provenance and has no source maps or mapping URLs', () => {
    const note = fs.readFileSync(path.resolve('vendor/hub-sdk/VENDOR.md'), 'utf8');
    expect(note).toContain('- branch: claude/festive-ptolemy-4mg8oe\n- sha: b9ac308\n- package: packages/hub-sdk @ 0.7.0');
    expect(note).toContain(`- iife sha256: ${IIFE_SHA256}`);
    const iifePath = path.resolve('vendor/hub-sdk/dist/hub-sdk.iife.js');
    const iife = fs.readFileSync(iifePath);
    expect(createHash('sha256').update(iife).digest('hex')).toBe(IIFE_SHA256);
    expect(iife.toString('utf8')).toContain('global HubSDK');
    const pin = JSON.parse(fs.readFileSync(path.resolve('vendor/hub-sdk/SOURCE.pin.json'), 'utf8'));
    expect(pin).toMatchObject({ version: '0.7.0', format: 'iife', global: 'HubSDK', iifeSha256: IIFE_SHA256 });
    const files = listFiles(path.resolve('vendor/hub-sdk'));
    expect(files.some(file => file.endsWith('.map'))).toBe(false);
    for (const file of files) expect(fs.readFileSync(file, 'utf8')).not.toContain('sourceMappingURL=');
    const types = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    expect(types).toContain('granted_items?: string[];');
  });

  // The trial board (CONTRACT C9/C13): unranked sessions post, and the answer comes back.
  it('submitScore posts from unranked sessions and returns the ScoreResult; getLeaderboard exists', () => {
    const live = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/live.js'), 'utf8');
    const types = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    expect(live).not.toContain('active.ranked');
    expect(live).toContain("return client.rpc('score.submit'");
    expect(live).toContain("'leaderboard.top'");
    expect(types).toContain('submitScore(boardId: string, value: number, meta?: object): Promise<ScoreResult | void>;');
    expect(types).toContain('getLeaderboard?(');
    expect(types).toContain('export interface ScoreResult');
  });

  // live.js asRelics() keeps only ids isRelicId() accepts. Without the Belt here,
  // profile.get would drop it and the Champion's Crown would never unlock; the same
  // goes for breakwater_coin (0.6.0) and Wizard Hat II. 0.6.4 adds marina_anchor and
  // dragon_scale the same way. They stay outside FOUR_LIGHTS_RELIC_IDS. Hub ships
  // all four, so the vendor tree carries no local patch.
  it('accepts tidebreaker_belt, breakwater_coin, marina_anchor and dragon_scale as relic ids from upstream', async () => {
    const types = await import('../vendor/hub-sdk/dist/types.js');
    expect(types.RELIC_IDS).toEqual([
      'hpos10i_core', 'genesis_shard', 'cones_tip', 'tinubu_crown', 'tidebreaker_belt', 'breakwater_coin',
      'marina_anchor', 'dragon_scale',
    ]);
    expect(types.FOUR_LIGHTS_RELIC_IDS).toEqual([
      'hpos10i_core', 'genesis_shard', 'cones_tip', 'tinubu_crown',
    ]);
    expect(types.isRelicId('tidebreaker_belt')).toBe(true);
    expect(types.isRelicId('breakwater_coin')).toBe(true);
    expect(types.isRelicId('marina_anchor')).toBe(true);
    expect(types.isRelicId('dragon_scale')).toBe(true);
    expect(types.isRelicId('not_a_relic')).toBe(false);
    expect(types.GAME_IDS).toEqual([
      'hpos10i', 'nobu', 'peoples-bitcoin', 'sproto', 'sproto-fighter', 'sproto-arcade',
      'sproto-shooter', 'sproto-coop-battle',
    ]);
    const live = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/live.js'), 'utf8');
    expect(live).toContain("value.filter((item) => typeof item === 'string' && isRelicId(item))");
    const dts = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    expect(dts).toContain('"tidebreaker_belt", "breakwater_coin", "marina_anchor", "dragon_scale"]');
    const vendorNote = fs.readFileSync(path.resolve('vendor/hub-sdk/VENDOR.md'), 'utf8');
    expect(vendorNote).not.toContain('## Local patch');
  });

  // 0.7.0: the feedback window and its two optional HubSdk calls (src/hub/feedback.js uses them).
  it('exports the feedback window and the optional feedback calls', async () => {
    const feedback = await import('../vendor/hub-sdk/dist/feedback.js');
    expect(typeof feedback.installFeedback).toBe('function');
    expect(typeof feedback.feedbackTransportFromSdk).toBe('function');
    const index = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/index.js'), 'utf8');
    expect(index).toContain('installFeedback');
    const types = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    expect(types).toContain('feedbackAccess?(');
    expect(types).toContain('submitFeedback?(');
  });

  it('content manifest matches SDK 0.7.0 after maps and sourceMappingURL are removed', () => {
    expect(REFERENCE_TARBALL_SHA256).toBe('634de052798c2b3036bb5644df45ab3c29c43b6a4ef2a66328bd8d3371909681');
    const hash = contentManifestSha256(path.resolve('vendor/hub-sdk'));
    expect(hash).toBe(CONTENT_MANIFEST_SHA256);
  });
});
