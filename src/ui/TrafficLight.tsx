import type { Lang } from '@/lib/i18n';
import { lookup } from '@/lib/i18n';

export type Tone = 'green' | 'amber' | 'red';

const LABEL: Record<Tone, string> = {
  green: 'light.green',
  amber: 'light.amber',
  red: 'light.red',
};

/** The load-monitoring rule, stated once and reused by session, check-in and handout. */
export function TrafficLight({ tone, lang }: { tone: Tone; lang: Lang }) {
  return (
    <span className="light" data-tone={tone}>
      <span />
      {lookup(LABEL[tone], lang)}
    </span>
  );
}

export function TrafficRule({ lang }: { lang: Lang }) {
  const line = (key: string) => lookup(key, lang);
  return (
    <div className="stack stack-sm">
      <p className="small">
        <strong>4/10</strong> · {line('light.during')}
      </p>
      <p className="small">
        <strong>24h</strong> · {line('light.settle')}
      </p>
      <p className="small">
        <strong>↗</strong> {line('light.morning')}
      </p>
      <p className="xs muted">{line('light.note')}</p>
      <p className="xs muted">{line('light.neuro')}</p>
    </div>
  );
}
