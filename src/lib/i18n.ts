/**
 * The closed vocabulary: chrome, intake, traffic light, plan and handout copy in
 * English and Arabic, merged from one file per screen group.
 *
 * This is the vocabulary the v2 brief requires to be translated properly.
 * Clinical content (exercise names, cues, presentation prose) is deliberately *not*
 * here: those fields are `null` in the data until a clinician supplies them, and the
 * UI renders a visible `translation pending` marker instead of inventing Arabic.
 */

export type Lang = 'en' | 'ar';
/** key → [en, ar]. The tables live in `i18n/`, split by screen group. */
export type StringTable = Record<string, [string, string]>;

import { CHROME } from './i18n/chrome';
import { INTAKE } from './i18n/intake';
import { CLINICAL } from './i18n/clinical';
import { SESSION } from './i18n/session';
import { JOURNEY } from './i18n/journey';

export const STRINGS: StringTable = {
  ...CHROME,
  ...INTAKE,
  ...CLINICAL,
  ...SESSION,
  ...JOURNEY,
};

export function langDir(lang: Lang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function lookup(key: string, lang: Lang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  const raw = entry[lang === 'ar' ? 1 : 0];
  return raw;
}

/** Tiny interpolation: `{n}` style slots from a record. */
export function fmt(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}

export const ARABIC_PLACEHOLDER_PENDING = 'translation pending';
