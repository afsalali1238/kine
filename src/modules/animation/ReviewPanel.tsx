'use client';

/**
 * The reviewer's controls for one animation: the two hashes side by side, save/publish/
 * discard, and the two notices that explain any difference between what was authored and
 * what the rig can legally play. Out-of-range angles block the buttons — an angle outside
 * the ROM table is a clinical error, not a render bug — while a pattern cap only clamps.
 *
 * Split out of `/admin/animator` so the route stays a layout and this rule lives with the
 * arithmetic it enforces (C2).
 */

import { useState } from 'react';
import { AlertTriangle, Check, Download, EyeOff, Save } from 'lucide-react';
import { Button, Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import type { Violation } from './clamp';

export function ReviewPanel({
  draftHash,
  shippedHash,
  dirty,
  status,
  hasOverride,
  presentationName,
  clamped,
  violations,
  patchedHref,
  onSave,
  onPublish,
  onDiscard,
}: {
  draftHash: string | null;
  shippedHash: string | null;
  dirty: boolean;
  status: string;
  hasOverride: boolean;
  presentationName: string | null;
  clamped: Violation[];
  violations: Violation[];
  patchedHref: string;
  onSave: () => void;
  onPublish: (reviewer: string) => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  const [reviewer, setReviewer] = useState('');
  const blocked = violations.length > 0;

  return (
    <Card eyebrow={t('handout.title')} className="card-tight">
      <div className="row">
        <span className="pill xs tnum" data-testid="hash-draft">
          {draftHash ?? 'crypto unavailable'}
        </span>
        <span className="pill xs tnum muted">{shippedHash ?? '—'}</span>
        <span className={`pill xs ${dirty ? 'pill-warn' : 'pill-sage'}`} data-testid="hash-state">
          {dirty ? 'hash changed · approval cleared' : 'hash matches shipped record'}
        </span>
        <span className={`pill xs ${hasOverride ? 'pill-warn' : ''}`} data-testid="publish-state">
          {status}
        </span>
      </div>
      <div className="row">
        <Button
          variant="primary"
          icon={<Save size={15} />}
          onClick={onSave}
          testid="animator-save"
          disabled={blocked}
        >
          {t('animator.save')}
        </Button>
        <Button
          icon={<Check size={15} />}
          disabled={blocked || !dirty}
          onClick={() => onPublish(reviewer || 'animator')}
          testid="animator-publish"
        >
          {t('animator.publish')}
        </Button>
        <input
          type="text"
          placeholder="reviewer"
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
          style={{ flex: 1, minWidth: 120 }}
          data-testid="animator-reviewer"
        />
        {hasOverride ? (
          <Button variant="quiet" icon={<EyeOff size={15} />} onClick={onDiscard}>
            {t('checkin.reset')}
          </Button>
        ) : null}
        <a
          className="btn btn-quiet"
          href={patchedHref}
          download="animations.json"
          data-testid="animator-export"
        >
          <Download size={15} /> animations.json
        </a>
      </div>
      {clamped.length ? (
        <div className="notice notice-warn" data-testid="animator-clamped">
          <div className="stack stack-sm">
            <span className="eyebrow">{presentationName ?? 'pattern'}</span>
            {clamped.slice(0, 4).map((row, index) => (
              <p className="xs tnum" key={`clamp-${row.joint}-${row.axis}-${index}`}>
                {row.joint}.{row.axis}: {row.requested}° → {row.allowed[0]}…{row.allowed[1]}°
              </p>
            ))}
            <p className="xs">{t('explain.fitNote')}</p>
          </div>
        </div>
      ) : null}
      {blocked ? (
        <div className="notice notice-danger" role="alert" data-testid="animator-violations">
          <div className="stack stack-sm">
            <span className="row">
              <AlertTriangle size={14} /> {violations.length} {t('plan.why')}
            </span>
            {violations.map((row, index) => (
              <p className="xs tnum" key={`${row.joint}-${row.axis}-${index}`}>
                {row.joint}.{row.axis}: {row.requested}° ∉ [{row.allowed[0]}, {row.allowed[1]}]
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
