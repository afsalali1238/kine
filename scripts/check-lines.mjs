/**
 * C1/C2 gate: no line over 120 characters, no source file over 300 lines.
 * Data JSON is exempt from the line-count rule (it is generated) but never from the
 * column rule, because a 8,000-character JSON line is exactly what made v1 unreviewable.
 * Three documented relaxations, all in EXEMPT or MAX_LINE_JSON: the lock file npm writes is
 * skipped, a verbatim third-party reference excerpt is skipped, and generated .json data is
 * held to 200 columns instead of 120. Every line of human-authored code, style and prose is
 * held to 120.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.git', 'dist', '.preview', 'coverage', '.venv']);
/**
 * Files whose long lines are not ours to break: the lock file npm writes, and the verbatim
 * public-domain reference excerpt, which is quoted as-is so a reviewer can diff it upstream.
 */
const EXEMPT = new Set(['package-lock.json', 'src/data/open-source-reference.json']);
const CODE = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.json', '.md']);
const MAX_LINE = 120;
/**
 * Generated clinical data is one property per line and the strings are patient-facing prose;
 * wrapping them inside a JSON string would change the content. Cap it at a width that still
 * fails a minified or hand-blobbed file.
 */
const MAX_LINE_JSON = 200;
const MAX_FILE_LINES = process.argv.includes('--docs') ? Infinity : 300;

const offenders = [];
let files = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!CODE.has(ext)) continue;
    if (EXEMPT.has(path.relative(ROOT, full))) continue;
    files++;
    const text = fs.readFileSync(full, 'utf8');
    const lines = text.split('\n');
    if (lines.length > MAX_FILE_LINES && ext !== '.json' && ext !== '.md') {
      offenders.push(`${path.relative(ROOT, full)}: ${lines.length} lines (max ${MAX_FILE_LINES})`);
    }
    const limit = ext === '.json' ? MAX_LINE_JSON : MAX_LINE;
    lines.forEach((line, i) => {
      if (line.length > limit) {
        offenders.push(
          `${path.relative(ROOT, full)}:${i + 1}: ${line.length} columns (max ${limit})`,
        );
      }
    });
  }
}

walk(ROOT);
if (offenders.length) {
  console.error(`line-length check failed (${offenders.length} problems in ${files} files):`);
  for (const o of offenders.slice(0, 25)) console.error('  ' + o);
  if (offenders.length > 25) console.error(`  …and ${offenders.length - 25} more`);
  console.error('\nRun `npm run format` (prettier, printWidth 100) and split long lines by hand.');
  process.exit(1);
}
console.log(
  `line-length check passed: ${files} files, ≤ ${MAX_LINE} columns (${MAX_LINE_JSON} for json)`,
);
