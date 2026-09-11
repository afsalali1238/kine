/**
 * The pipeline, in the order that catches the cheapest failure first.
 * `npm run verify` is one line in package.json so the sequence is readable here
 * rather than inside a 200-character shell string.
 *
 * Order matters: the shape gates (format, lint, types) are seconds and free the reviewer
 * from reading code that will not build; the content gate must run before tests that read
 * `src/data`; `build` must precede `e2e` because the HTTP fallback serves `.next`.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const STEPS = [
  ['format', 'Prettier, 100 columns, and the 120-column / 300-line gate'],
  ['lint', 'ESLint'],
  ['typecheck', 'tsc --noEmit'],
  ['content:validate', 'clinical contract: enums, cues, ROM, translation status'],
  ['assets:check', 'shipped GLBs match the generator'],
  ['test', 'vitest'],
  ['build', 'next build'],
  ['e2e', 'journey against the production server'],
];

const started = Date.now();
const results = [];

for (const [script, note] of STEPS) {
  const t0 = Date.now();
  process.stdout.write(`\n\u2500\u2500 ${script} \u2014 ${note}\n`);
  const run = spawnSync('npm', ['run', '--silent', script], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (run.status !== 0) {
    results.push([script, `failed after ${secs}s`]);
    report();
    process.exit(run.status ?? 1);
  }
  results.push([script, `${secs}s`]);
}

report();
console.log('\nverify: every gate green.');

function report() {
  process.stdout.write('\n\n  step               time\n');
  for (const [name, time] of results) {
    process.stdout.write(`  ${name.padEnd(17)}${time}\n`);
  }
  process.stdout.write(`  total            ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
}
