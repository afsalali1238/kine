import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { recoveryStates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { MAX_RECOVERY_BODY_BYTES, RECOVERY_ID_PATTERN, recoveryPayloadSchema } from '@/lib/recovery-schema';
import { checkRecoveryRateLimit } from '@/lib/rate-limit';

/**
 * Health data, anonymous identifier: the id is an unguessable UUID, the state
 * is bounded-validated before anything touches the DB, payloads are capped,
 * and requests are rate-limited per (IP, id). A database outage degrades to
 * device-local sync (503) rather than data loss — the client keeps
 * localStorage as its source of truth either way.
 */
const IPV4_OCTET = '25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d';
const IPV4 = new RegExp(`^(${IPV4_OCTET})\\.(${IPV4_OCTET})\\.(${IPV4_OCTET})\\.(${IPV4_OCTET})$`);
const IPV6 = /^[0-9a-f:]+$/i;

/**
 * Best available caller address for rate-limit bucketing.
 *
 * Proxies APPEND to `x-forwarded-for`, so the leftmost entry is whatever the
 * client chose to send and is trivially spoofable — taking it lets an attacker
 * mint a fresh bucket per request and walk straight through the limiter. The
 * rightmost syntactically valid hop is the one our own upstream proxy added,
 * so that is the one we trust. Platform-set headers beat it when present.
 *
 * Residual caveat: with no trusted proxy in front of the app at all, a
 * client-supplied single-entry header is indistinguishable from a real one.
 */
function clientIp(req: NextRequest): string {
  const platform = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (platform) return platform.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
    for (let i = hops.length - 1; i >= 0; i--) {
      const hop = hops[i].replace(/^\[|\]$/g, '');
      if (IPV4.test(hop) || IPV6.test(hop)) return hop;
    }
  }
  return 'unknown';
}

function clientKey(req: NextRequest, id: string): string {
  return `${clientIp(req)}:${id}`;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!RECOVERY_ID_PATTERN.test(id)) return NextResponse.json({ error: 'Invalid recovery identifier' }, { status: 400 });
  if (!checkRecoveryRateLimit(clientKey(req, id), 'read')) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  try {
    const [row] = await db.select().from(recoveryStates).where(eq(recoveryStates.id, id));
    return NextResponse.json({ state: row?.state ?? null });
  } catch {
    return NextResponse.json({ error: 'Saved locally; sync temporarily unavailable' }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_RECOVERY_BODY_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid recovery data' }, { status: 400 });
  }
  const parsed = recoveryPayloadSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid recovery data' }, { status: 400 });
  if (!checkRecoveryRateLimit(clientKey(req, parsed.data.id), 'write')) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  try {
    await db
      .insert(recoveryStates)
      .values({ id: parsed.data.id, state: parsed.data.state })
      .onConflictDoUpdate({ target: recoveryStates.id, set: { state: parsed.data.state, updatedAt: new Date() } });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: 'Saved locally; sync temporarily unavailable' }, { status: 503 });
  }
}
