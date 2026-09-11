/**
 * ESLint, flat config. `eslint-config-next` 16 exports flat arrays directly, so the v1
 * FlatCompat shim is gone — it was also what made `npm run lint` crash.
 *
 * Generated data and shipped binaries are not linted: `src/data` and `public/models` are
 * build output, `.preview` is scratch, and `.next` is Next's own cache. The generator
 * scripts under `scripts/` are linted on purpose — they decide what the clinical data says.
 */

import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      '.preview/**',
      'coverage/**',
      'node_modules/**',
      'public/**',
      'src/data/**',
      'src/styles/**/*.css',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      // Generator scripts read their own JSON tables with fs; that is the point of them.
      'no-sync': 'off',
    },
  },
]);
