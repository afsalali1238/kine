/**
 * End-to-end entry point that works in two modes, because CI here has no browser binaries.
 *
 *   playwright  — when a Chromium build exists, run `e2e/` against `next start`.
 *   http        — otherwise, drive the same journeys over HTTP: every route must answer, the
 *                 body model must be served, and the shipped HTML must contain the hooks the
 *                 flows depend on. Weaker than a real browser, honest about being weaker.
 *
 * The mode is printed, so nobody reads a fallback as a pass of the real suite.
 */

import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';

const requested = Number(process.env.PORT ?? 3111);

/** A stale dev server on the same port would quietly replace the run being tested. */
function freePort(start) {
  for (let port = start; port < start + 20; port++) {
    const server = net.createServer();
    let taken = false;
    server.on('error', () => (taken = true));
    server.listen(port, '127.0.0.1');
    server.close();
    if (!taken) return port;
  }
  return start;
}

const port = freePort(requested);
const base = `http://127.0.0.1:${port}`;

function browserPath() {
  try {
    const require = createRequire(import.meta.url);
    const { chromium } = require('playwright-core');
    const file = chromium.executablePath();
    return file && existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

function startServer() {
  // `npx next start` forks a next-server that outlives the wrapper unless it gets its own
  // process group, and a stale server on the port would silently answer for the real one.
  const child = spawn('npx', ['next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  });
  let buffer = '';
  child.stdout.on('data', (chunk) => (buffer += chunk.toString()));
  child.stderr.on('data', (chunk) => (buffer += chunk.toString()));
  return { child, log: () => buffer };
}

async function waitForServer(child, log) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    if (child.exitCode !== null) throw new Error(`server exited early:\n${log()}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`server did not become ready:\n${log()}`);
}

// Each route is checked for the shell plus a marker that must survive a cold, empty store:
// a canvas-backed stage, an explicit "answer the questions first" card, or content that comes
// from the JSON rather than from the journey. Anything else means the screen is not wired.
const ROUTES = [
  ['/', 'today-cta|today-action|start'],
  ['/body', 'viewer-explore|viewer-pinpoint|viewer-confirm|viewer-mini|fallback-2d'],
  ['/intake', 'needs-journey|intake-title'],
  ['/triage', 'needs-journey|triage-message'],
  ['/explain', 'needs-journey|explain-blocked|animator-picker'],
  ['/plan', 'needs-journey|plan-minutes'],
  ['/session', 'needs-journey|demonstrator|demo-strip'],
  ['/checkin', 'daily-pain|checkin-done'],
  ['/progress', 'load-sample|sparkline|map-scrub'],
  ['/learn', 'article-hurt-harm'],
  ['/handout', 'handout-doc|handout-title|print'],
  ['/admin/animator', 'animator-picker|hash-draft'],
];

function ensureBuild() {
  if (existsSync(new URL('../.next/BUILD_ID', import.meta.url))) return;
  console.log('no production build found — running next build first');
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
}

async function httpJourney() {
  ensureBuild();
  const { child, log } = startServer();
  let failures = 0;
  try {
    await waitForServer(child, log);
    for (const [route, pattern] of ROUTES) {
      const response = await fetch(base + route);
      const html = await response.text();
      const ok =
        response.ok && html.includes('data-testid="nav"') && new RegExp(pattern).test(html);
      if (!ok) failures++;
      console.log(
        `${ok ? '✓' : '✗'} ${route.padEnd(17)} ${response.status} ${response.ok ? '' : '(bad status)'}`,
      );
    }
    const glb = await fetch(`${base}/models/body-male.glb`, { method: 'HEAD' });
    const bytes = Number(glb.headers.get('content-length') ?? 0);
    const modelOk = glb.ok && bytes > 500_000;
    if (!modelOk) failures++;
    console.log(
      `${modelOk ? '✓' : '✗'} body model      ${glb.status} ${(bytes / 1e6).toFixed(2)} MB`,
    );
    const textures = await Promise.all(
      ['skin-albedo.png', 'skin-normal.png', 'skin-orm.png'].map((name) =>
        fetch(`${base}/models/${name}`, { method: 'HEAD' }),
      ),
    );
    for (const [index, texture] of textures.entries()) {
      const ok = texture.ok;
      if (!ok) failures++;
      console.log(`${ok ? '✓' : '✗'} skin texture ${index + 1} ${texture.status}`);
    }
  } finally {
    try {
      process.kill(-child.pid ?? 0, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
  if (failures) {
    console.error(`http journey: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log(`http journey passed (${ROUTES.length + 4} checks, no browser available)`);
}

async function main() {
  const browser = browserPath();
  if (!browser) {
    console.log('e2e mode: http (no Chromium for Playwright in this environment)');
    await httpJourney();
    return;
  }
  console.log(`e2e mode: playwright (${browser})`);
  ensureBuild();
  const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' },
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

void main();
