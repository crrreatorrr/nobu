import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

// Baseline lint for a plain-JS Three.js game. CI runs `npm run lint`; errors fail the build,
// warnings are a backlog to burn down (see the TODOs below).
export default defineConfig(
  { ignores: ['dist', 'build', 'coverage', 'node_modules', 'vendor', 'public'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'warn' },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      // TODO(lint): unused names are a large existing backlog; burn down, then make this an error.
      'no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.vitest } },
  },
);
