/**
 * Access to the bilingual chrome vocabulary, bound to the language in the UI store.
 * `maybe` is the C3 rule as a function: real translation when the content has one,
 * otherwise the English text plus a visible `translation pending` marker for the UI to
 * render — never a made-up Arabic string.
 */

import { useCallback, useMemo } from 'react';
import { fmt, lookup, type Lang } from './i18n';
import { useUi } from '@/state/ui';

export type Translator = {
  lang: Lang;
  rtl: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  maybe: (value: string | null | undefined, pending: string | null | undefined) => PendingText;
};

export type PendingText = { text: string; pending: boolean };

export function useI18n(): Translator {
  const lang = useUi((s) => s.lang);
  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => fmt(lookup(key, lang), values ?? {}),
    [lang],
  );
  const maybe = useCallback(
    (value: string | null | undefined, pending: string | null | undefined): PendingText => {
      if (lang === 'ar') {
        if (pending && pending.trim().length > 0) return { text: pending, pending: false };
        return { text: value ?? '', pending: true };
      }
      return { text: value ?? '', pending: false };
    },
    [lang],
  );
  return useMemo(() => ({ lang, rtl: lang === 'ar', t, maybe }), [lang, t, maybe]);
}
