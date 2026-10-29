import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { installLocks } from './locks.js';

installLocks();

if (typeof indexedDB.databases !== 'function') {
  indexedDB.databases = async () => [];
}

vi.spyOn(console, 'warn').mockImplementation(() => {});
