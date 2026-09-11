'use client';

/**
 * The controls that sit over the demonstrator: which camera you are looking through, the
 * mistake view, and the spoken cues. Deliberately coarse — a thumb on a phone while you are
 * holding a position — and the mistake toggle is a switch, not a slider, because seeing the
 * fault is a yes/no question you answer once per set.
 */

import { Repeat2, Volume2, VolumeX } from 'lucide-react';
import { Button, Segmented } from '@/ui';
import { useI18n } from '@/lib/use-i18n';

export function StageControls({
  view,
  onView,
  fault,
  onFault,
  voice,
  onVoice,
  canSpeak,
}: {
  view: 'primary' | 'secondary';
  onView: (view: 'primary' | 'secondary') => void;
  fault: boolean;
  onFault: () => void;
  voice: boolean;
  onVoice: () => void;
  canSpeak: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="viewer-overlay" style={{ position: 'static', padding: 0 }}>
      <div className="row row-between">
        <Segmented
          ariaLabel="camera"
          value={view}
          onChange={onView}
          options={[
            { value: 'primary', label: t('session.front') },
            { value: 'secondary', label: t('session.side') },
          ]}
        />
        <div className="row">
          <Button
            variant="quiet"
            onClick={onFault}
            icon={<Repeat2 size={16} />}
            testid="toggle-fault"
          >
            {fault ? t('session.hideMistake') : t('session.showMistake')}
          </Button>
          {canSpeak ? (
            <Button
              variant="quiet"
              onClick={onVoice}
              icon={voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
              testid="toggle-voice"
            >
              {voice ? t('session.voice') : t('session.muted')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
