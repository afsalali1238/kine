'use client';

/**
 * You, next to the common mistake — from the same geometry and the same rig, and from the
 * *same* authored file: the fault is authored as extra tracks that deliberately exceed the
 * prescribed range, so the only difference on screen is the movement itself.
 *
 * On a phone the two panes stack, because a side-by-side pair at 390 px wide makes both
 * figures too small to read.
 */

import { Demonstrator, type DemonstratorProps } from './Demonstrator';

type Props = Omit<DemonstratorProps, 'faultId' | 'rigKey' | 'mini' | 'cameraId'> & {
  faultId: string | null;
  faultLabel: string;
  youLabel: string;
  lang?: string;
};

export function FaultSplit({ faultId, faultLabel, youLabel, ...rest }: Props) {
  if (!faultId) {
    return <Demonstrator {...rest} rigKey="main" />;
  }
  return (
    <div className="cols cols-2" style={{ gap: 8 }}>
      <div className="stack stack-sm">
        <span className="eyebrow">{youLabel}</span>
        <Demonstrator {...rest} rigKey="you" faultId={null} mini />
      </div>
      <div className="stack stack-sm">
        <span className="eyebrow" style={{ color: 'var(--color-danger)' }}>
          {faultLabel}
        </span>
        <Demonstrator {...rest} rigKey="fault" faultId={faultId} mini />
      </div>
    </div>
  );
}
