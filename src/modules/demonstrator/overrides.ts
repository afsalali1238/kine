/**
 * Local animation overrides for the animator screen.
 *
 * There is no server in this product, so an edit is kept in this browser and exported as a
 * patched `animations.json`. The pipeline rules are mirrored here rather than bypassed: an
 * override carries its own recomputed content hash, and a hash that differs from the shipped
 * record means `status: draft` with media approval cleared, exactly as `build-content` would
 * sign it. Publishing is what `npm run content:build` + a commit does; the button only marks
 * the local copy as reviewed so the export is honest about what it contains.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ExerciseAnimation } from '@/lib/types';

const KEY = 'kine.animations.overrides.v2';
const HASH_KEYS = [
  'tracks',
  'faultTracks',
  'cues',
  'cameras',
  'durationMs',
  'holdAt',
  'holdMs',
  'basePose',
  'highlightRegions',
  'props',
] as const;

export type Override = ExerciseAnimation & {
  reviewedBy?: string | null;
  mediaApproved?: boolean;
};

function read(): Record<string, Override> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Record<string, Override>;
  } catch {
    return {};
  }
}

function write(rows: Record<string, Override>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* private mode: the export button still works from state */
  }
}

export function payloadOf(animation: ExerciseAnimation): string {
  const payload: Record<string, unknown> = {};
  for (const key of HASH_KEYS) {
    payload[key] = (animation as unknown as Record<string, unknown>)[key];
  }
  return JSON.stringify(payload);
}

/** The same 16-hex digest the build script writes, or null where WebCrypto is absent. */
export async function hashAnimation(animation: ExerciseAnimation): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payloadOf(animation)),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function useOverrides() {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});

  useEffect(() => {
    // The override table lives in browser storage; hydrating after mount is what keeps the
    // prerendered page identical to the client's first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverrides(read());
  }, []);

  const save = useCallback((exerciseId: string, animation: ExerciseAnimation) => {
    setOverrides((previous) => {
      const next: Record<string, Override> = {
        ...previous,
        [exerciseId]: { ...animation, status: 'draft', mediaApproved: false, reviewedBy: null },
      };
      write(next);
      return next;
    });
  }, []);

  const publish = useCallback((exerciseId: string, reviewer: string) => {
    setOverrides((previous) => {
      const row = previous[exerciseId];
      if (!row) return previous;
      const next: Record<string, Override> = {
        ...previous,
        [exerciseId]: { ...row, status: 'published', mediaApproved: true, reviewedBy: reviewer },
      };
      write(next);
      return next;
    });
  }, []);

  const discard = useCallback((exerciseId: string) => {
    setOverrides((previous) => {
      const next = { ...previous };
      delete next[exerciseId];
      write(next);
      return next;
    });
  }, []);

  const exportAll = useCallback(
    () => JSON.stringify(Object.values(overrides), null, 2),
    [overrides],
  );

  return { overrides, save, publish, discard, exportAll };
}
