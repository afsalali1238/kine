/**
 * The reproducibility half of the asset contract, used by `assets:check`.
 *
 * It deliberately writes nothing. A verification step that regenerates the thing it then
 * compares can only ever pass — that is how v1's gate stayed green while the meshes it was
 * supposed to guard were 1,400-vertex placeholders. So this reads the manifest the app
 * actually loads from, hashes the file on disk under that name, and demands that the digest
 * agree with both the manifest and what the current anatomy table produces.
 */

import fs from 'node:fs';
import path from 'node:path';

export function checkShippedAssets({ MODELS, DATA, report, hash }) {
  const manifestPath = path.join(DATA, 'models.json');
  if (!fs.existsSync(manifestPath))
    throw new Error('src/data/models.json is missing: run `npm run assets:build`');
  const shipped = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const reportPath = path.join(MODELS, 'ASSET-REPORT.json');
  const recordedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const problems = [];
  if (recordedReport.generator !== report.generator)
    problems.push('ASSET-REPORT.json was not written by this generator');
  for (const key of ['male', 'female']) {
    const entry = shipped[key];
    if (!entry) {
      problems.push(`${key}: absent from src/data/models.json`);
      continue;
    }
    const file = path.join(MODELS, entry.file);
    if (!fs.existsSync(file)) {
      problems.push(`${key}: ${entry.file} is referenced but not on disk`);
      continue;
    }
    const bytes = fs.readFileSync(file);
    if (bytes.length !== entry.bytes)
      problems.push(`${key}: ${entry.file} is ${bytes.length} B, manifest says ${entry.bytes} B`);
    if (hash(bytes) !== entry.hash)
      problems.push(`${key}: ${entry.file} does not match the hash the app loads it under`);
    if (hash(bytes) !== report.bodies[key].hash)
      problems.push(
        `${key}: the shipped mesh is not what this generator produces — re-run assets:build`,
      );
    if (fs.existsSync(path.join(MODELS, `body-${key}.glb`)))
      problems.push(`${key}: an unhashed body-${key}.glb is still in public/models`);
  }
  if (problems.length) throw new Error(`asset check failed:\n  ${problems.join('\n  ')}`);
  console.log('asset check passed: shipped meshes match the generator, byte for byte');

  console.log('asset check passed: shipped meshes match the generator, byte for byte');
}
