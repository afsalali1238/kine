/**
 * Ephemeral UI state: language, stage within the assessment, sheet visibility, motion
 * preference. Deliberately not persisted except the language, which is a device setting.
 */

import { create } from 'zustand';
import type { Lang } from '@/lib/i18n';

const LANG_KEY = 'kine.lang';

export type Stage =
  | 'explore'
  | 'select'
  | 'pinpoint'
  | 'confirm'
  | 'intake'
  | 'triage'
  | 'explain'
  | 'plan'
  | 'session'
  | 'checkin'
  | 'review';

type UiStore = {
  lang: Lang;
  stage: Stage;
  step: number;
  sheet: 'search' | 'help' | 'intensity' | null;
  reducedMotion: boolean;
  ready: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setStage: (stage: Stage) => void;
  setStep: (step: number) => void;
  setSheet: (sheet: UiStore['sheet']) => void;
  setReducedMotion: (value: boolean) => void;
  restore: () => void;
};

/**
 * The store is created during rendering on the server as well as on the client, so the initial
 * language is always English and the stored preference is applied after mount. Reading
 * localStorage while creating the store would make the first client paint disagree with the
 * server HTML and break hydration of every translated string.
 */

export const useUi = create<UiStore>((set, get) => ({
  lang: 'en',
  stage: 'explore',
  step: 0,
  sheet: null,
  reducedMotion: false,
  ready: false,
  setLang(lang) {
    set({ lang });
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  },
  toggleLang() {
    get().setLang(get().lang === 'ar' ? 'en' : 'ar');
  },
  setStage: (stage) => set({ stage }),
  setStep: (step) => set({ step }),
  setSheet: (sheet) => set({ sheet }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  restore() {
    let stored: Lang = 'en';
    try {
      const value = window.localStorage.getItem(LANG_KEY);
      if (value === 'ar' || value === 'en') stored = value;
      else if (navigator.language?.toLowerCase().startsWith('ar')) stored = 'ar';
    } catch {
      stored = 'en';
    }
    get().setLang(stored);
  },
}));
