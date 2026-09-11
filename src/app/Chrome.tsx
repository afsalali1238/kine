'use client';

/**
 * The app frame: hydration gate, language direction, and the navigation that is a bottom bar
 * on a phone and a top bar on anything wider.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, CalendarClock, Dumbbell, PersonStanding } from 'lucide-react';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { useDerived } from '@/state/selectors';
import { lookup } from '@/lib/i18n';

const TABS = [
  { href: '/', key: 'nav.today', icon: CalendarClock },
  { href: '/body', key: 'nav.body', icon: PersonStanding },
  { href: '/plan', key: 'nav.plan', icon: Dumbbell },
  { href: '/progress', key: 'nav.progress', icon: BarChart3 },
  { href: '/learn', key: 'nav.learn', icon: BookOpen },
];

export function Chrome({ children }: { children: React.ReactNode }) {
  const journey = useJourney((state) => state.journey);
  const restore = useUi((state) => state.restore);
  const hydrate = useJourney((state) => state.hydrate);
  const lang = useUi((state) => state.lang);
  const setLang = useUi((state) => state.setLang);
  const setReducedMotion = useUi((state) => state.setReducedMotion);
  const derived = useDerived(journey);
  const pathname = usePathname();
  useEffect(() => {
    void hydrate();
    restore();
  }, [hydrate, restore]);

  // Direction and language are device state, so they are applied after mount: the server and
  // the first client paint must agree, or hydration of every translated string breaks.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const listen = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', listen);
    return () => query.removeEventListener('change', listen);
  }, [setReducedMotion]);

  return (
    <div className="shell">
      <nav className="nav" aria-label="main · التنقل الرئيسي" data-testid="nav">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} data-active={pathname === tab.href}>
            <tab.icon size={19} strokeWidth={1.7} />
            <span>{lookup(tab.key, lang)}</span>
          </Link>
        ))}
        <span className="spacer nav-desktop-order" style={{ flex: 1 }} />
        <button
          className="btn btn-quiet nav-desktop-order"
          style={{ fontSize: 12 }}
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          data-testid="lang-toggle"
        >
          {lookup('ui.language', lang)}
        </button>
      </nav>
      <header className="stage-bar" data-testid="stage-bar">
        <span className="brand">
          kin<span className="brand-dot">ē</span>
        </span>
        <span className="pill xs">{lookup('app.tagline', lang)}</span>
        <span className="spacer" />
        {derived.started ? (
          <span
            className={`pill ${derived.flag ? 'pill-danger' : 'pill-sage'}`}
            data-testid="chrome-state"
          >
            {derived.flag ? lookup('triage.urgent.title', lang) : lookup('ui.today', lang)}
          </span>
        ) : (
          <span className="pill xs">{lookup('ui.internal', lang)}</span>
        )}
      </header>
      <main style={{ display: 'contents' }}>{children}</main>
    </div>
  );
}
