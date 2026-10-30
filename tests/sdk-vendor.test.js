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
const CONTENT_MANIFEST_SHA256 = 'f6ae2898ee1023426997fb0b0b520ad8468edfa2d9a16a98568ce21e8242e834';

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
  it('package.json is SDK 0.3.0', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('vendor/hub-sdk/package.json'), 'utf8'));
    expect(pkg.version).toBe('0.3.0');
    const types = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    const index = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/index.d.ts'), 'utf8');
    expect(types).toContain('getTicketBalance()');
    expect(types).toContain('sessionCapLeft');
    expect(types).toContain('dailyCapLeft');
    expect(types).toContain('serverTime: number;');
    expect(types.match(/serverTime: number;/g)).toHaveLength(2);
    expect(index).toContain('canonicalGameId');
  });

  it('content manifest matches SDK 0.3.0 after maps and sourceMappingURL are removed', () => {
    expect(REFERENCE_TARBALL_SHA256).toBe('634de052798c2b3036bb5644df45ab3c29c43b6a4ef2a66328bd8d3371909681');
    const hash = contentManifestSha256(path.resolve('vendor/hub-sdk'));
    expect(hash).toBe(CONTENT_MANIFEST_SHA256);
  });
});
