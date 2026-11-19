import { describe, expect, it } from 'vitest';
import { nakamaServerKey } from '../src/hub/hubBridge.js';

describe('Nakama server key', () => {
  it('uses VITE_NAKAMA_SERVER_KEY whenever it is set', () => {
    expect(nakamaServerKey({ envKey: 'prodkey', dev: false, hostname: 'play.example.com' })).toBe('prodkey');
    expect(nakamaServerKey({ envKey: 'prodkey', dev: false, hostname: 'localhost' })).toBe('prodkey');
  });

  it('falls back to the stock key under vite dev', () => {
    expect(nakamaServerKey({ dev: true, hostname: 'play.example.com' })).toBe('defaultkey');
  });

  // The dev hub serves a NOBU build from apps/hub/public/play/nobu/. Without this the
  // ticket redeem gets 401 "Server key invalid" and the wardrobe shows no Relic gear.
  it('falls back to the stock key for a build served from this machine', () => {
    for (const host of ['localhost', '127.0.0.1', '127.1.2.3', '[::1]', 'hub.localhost']) {
      expect(nakamaServerKey({ dev: false, hostname: host })).toBe('defaultkey');
    }
  });

  it('sends no key from a build on any other host', () => {
    for (const host of ['play.example.com', '192.168.1.20', 'localhost.example.com', '', undefined]) {
      expect(nakamaServerKey({ dev: false, hostname: host })).toBe('');
    }
  });
});

describe('missing server key warning', () => {
  it('warns only for a portal visit (#t=) in a build without a key', async () => {
    const { missingServerKeyWarning } = await import('../src/hub/hubBridge.js');
    expect(missingServerKeyWarning({ serverKey: '', hash: '#t=abc' })).toMatch(/VITE_NAKAMA_SERVER_KEY/);
    expect(missingServerKeyWarning({ serverKey: '', hash: '#from=hub&t=abc' })).toMatch(/offline/);
    expect(missingServerKeyWarning({ serverKey: 'k', hash: '#t=abc' })).toBeNull();
    expect(missingServerKeyWarning({ serverKey: '', hash: '' })).toBeNull();
    expect(missingServerKeyWarning({ serverKey: '', hash: '#from=hub' })).toBeNull();
  });
});
