import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function vendoredSha256() {
  const root = path.resolve('vendor/hub-sdk');
  const hash = createHash('sha256');
  for (const file of walk(root)) {
    hash.update(path.relative(root, file).split(path.sep).join('/'));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

describe('vendored hub SDK 0.2.0', () => {
  it('is version 0.2.0 and exposes getTicketBalance', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('vendor/hub-sdk/package.json'), 'utf8'));
    expect(pkg.version).toBe('0.2.0');
    const types = fs.readFileSync(path.resolve('vendor/hub-sdk/dist/types.d.ts'), 'utf8');
    expect(types).toContain('getTicketBalance()');
    expect(types).toContain('sessionCapLeft');
    expect(types).toContain('dailyCapLeft');
  });

  it('content sha256 starts with 634de052', () => {
    const hash = vendoredSha256();
    expect(hash, `vendored @metaverse/hub-sdk@0.2.0 content sha256 is ${hash}`).toMatch(/^634de052/);
  });
});
