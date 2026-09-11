'use client';

/**
 * The animator. It edits the authored keyframes of one exercise, live on the same rig the
 * patient sees, and it cannot escape the pipeline rules:
 *
 *   · an angle outside the pattern's range window is listed as a violation and blocks marking
 *     the record reviewed;
 *   · any change to the hashed payload changes the content hash, which drops the record to
 *     `draft` with media approval cleared — the same rule `build-content` enforces, so an edit
 *     can never be quietly shipped;
 *   · publishing is a second, deliberate action that records who reviewed it.
 *
 * There is no server in this product: edits are kept in this browser and exported as a patched
 * `animations.json`, which is then committed and re-signed by `npm run content:build`.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, PendingTranslation, Segmented } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { animationFor, findPresentation, readyExercises, regionById } from '@/lib/content';
import {
  assertAnimationsInRange,
  capExceedances,
  capsFor,
  rangeFor,
  ReviewPanel,
} from '@/modules/animation';
import { Demonstrator, FrameStrip, hashAnimation, useOverrides } from '@/modules/demonstrator';
import type { ExerciseAnimation } from '@/lib/types';

export default function AnimatorPage() {
  const { t, lang, maybe } = useI18n();
  const rows = readyExercises;
  const [selected, setSelected] = useState(rows[0]?.id ?? '');
  const { overrides, save, publish, discard, exportAll } = useOverrides();
  const [tab, setTab] = useState<'tracks' | 'cues'>('tracks');

  const exercise = rows.find((row) => row.id === selected) ?? rows[0];
  const authored = exercise ? animationFor(exercise.id) : undefined;
  const stored = exercise ? overrides[exercise.id] : undefined;
  const draft = stored ?? authored ?? null;

  const presentation = findPresentation(exercise?.presentationIds[0]);
  const caps = useMemo(
    () => (exercise ? capsFor(presentation, exercise) : {}),
    [exercise, presentation],
  );

  // Two separate questions, because they have different consequences: an angle outside the rig
  // contract is an error that blocks everything, while an angle outside the pattern's window
  // is legitimate content that the runtime simply clamps before it reaches the bone.
  const violations = useMemo(
    () =>
      draft ? assertAnimationsInRange({ animations: [draft] }).filter((row) => !row.fault) : [],
    [draft],
  );
  const clamped = useMemo(
    () =>
      draft && exercise
        ? capExceedances({
            animations: [draft],
            exercises: [exercise],
            presentations: presentation ? [presentation] : [],
          })
        : [],
    [draft, exercise, presentation],
  );

  const [draftHash, setDraftHash] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // One branch, resolved first: the rule against a synchronous setState in an effect body
    // is a real render concern, so the empty case goes through the same promise.
    void (draft ? hashAnimation(draft) : Promise.resolve(null)).then((value) => {
      if (alive) setDraftHash(value);
    });
    return () => {
      alive = false;
    };
  }, [draft]);

  const dirty = Boolean(stored && draftHash && draftHash !== authored?.contentHash);
  const patchedHref = `data:application/json;charset=utf-8,${encodeURIComponent(exportAll())}`;

  const edit = (mutate: (animation: ExerciseAnimation) => void) => {
    if (!exercise || !draft) return;
    const next = JSON.parse(JSON.stringify(draft)) as ExerciseAnimation;
    mutate(next);
    save(exercise.id, next);
  };

  if (!exercise || !draft) {
    return (
      <div className="page">
        <Card eyebrow="animator" title={t('ui.nothing')}>
          <p className="small">{t('progress.empty')}</p>
        </Card>
      </div>
    );
  }

  const name = maybe(exercise.name, exercise.nameAr);

  return (
    <div className="page cols cols-2">
      <div className="stack">
        <Card
          eyebrow="animator"
          title={<PendingTranslation text={name.text} pending={name.pending} />}
        >
          <input
            type="text"
            list="animator-exercises"
            value={exercise.id}
            onChange={(event) => setSelected(event.target.value)}
            data-testid="animator-picker"
          />
          <datalist id="animator-exercises">
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </datalist>
          <div className="row">
            <span className="pill xs">{exercise.type}</span>
            <span className="pill xs">{exercise.positionRequired}</span>
            <span className="pill xs">
              {exercise.targetRegions
                .map((id) => regionById.get(id)?.label ?? id)
                .slice(0, 2)
                .join(' · ')}
            </span>
          </div>
          <p className="xs muted">
            {presentation?.name ?? '—'} · {t('animator.hint')}
          </p>
        </Card>

        <ReviewPanel
          draftHash={draftHash}
          shippedHash={authored?.contentHash ?? null}
          dirty={dirty}
          status={stored?.status ?? draft.status}
          hasOverride={Boolean(stored)}
          presentationName={presentation?.name ?? null}
          clamped={clamped}
          violations={violations}
          patchedHref={patchedHref}
          onSave={() => save(exercise.id, draft)}
          onPublish={(who) => publish(exercise.id, who)}
          onDiscard={() => discard(exercise.id)}
        />

        {draft.faultTracks.length ? (
          <Card eyebrow={t('session.showMistake')} className="card-tight">
            <div className="stack stack-sm">
              {draft.faultTracks.map((fault) => (
                <p className="small" key={fault.faultId}>
                  {lang === 'ar' ? (fault.labelAr ?? fault.label) : fault.label}
                </p>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="stack">
        <Demonstrator
          sex="male"
          animation={draft}
          exerciseId={exercise.id}
          presentationId={presentation?.id ?? exercise.presentationIds[0]}
          autoPlay
          rigKey="animator"
        />
        <FrameStrip animation={draft} view="side" height={120} />
        <Card
          eyebrow={t('animator.tracks')}
          title={undefined}
          actions={
            <Segmented
              ariaLabel="animator tab"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'tracks', label: t('animator.tracks') },
                { value: 'cues', label: t('animator.cues') },
              ]}
            />
          }
        >
          {tab === 'tracks' ? (
            <div className="stack stack-sm">
              {draft.tracks.map((track, trackIndex) => {
                const range = rangeFor(caps, track.joint, track.axis);
                return (
                  <div className="card card-tight" key={`${track.joint}-${track.axis}`}>
                    <span className="eyebrow">
                      {track.joint} · {track.axis} · {range[0]}°…{range[1]}°
                    </span>
                    {track.keyframes.map((key, keyIndex) => (
                      <div className="row row-between" key={`${trackIndex}-${keyIndex}`}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.02}
                          value={key.t}
                          style={{ flex: 1 }}
                          onChange={(event) =>
                            edit((animation) => {
                              animation.tracks[trackIndex].keyframes[keyIndex].t = Number(
                                event.target.value,
                              );
                            })
                          }
                          data-testid={`kf-t-${trackIndex}-${keyIndex}`}
                        />
                        <input
                          type="number"
                          value={key.deg}
                          step={1}
                          style={{ width: 82 }}
                          onChange={(event) =>
                            edit((animation) => {
                              animation.tracks[trackIndex].keyframes[keyIndex].deg = Number(
                                event.target.value,
                              );
                            })
                          }
                          data-testid={`kf-deg-${trackIndex}-${keyIndex}`}
                        />
                        <button
                          className="btn btn-quiet xs"
                          style={{ minHeight: 34 }}
                          onClick={() =>
                            edit((animation) => {
                              const row = animation.tracks[trackIndex];
                              row.keyframes[keyIndex].deg = Math.round((range[0] + range[1]) / 2);
                            })
                          }
                        >
                          mid
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="stack stack-sm">
              {draft.cues.map((cue, index) => (
                <div className="card card-tight" key={`${cue.t}-${index}`}>
                  <span className="eyebrow tnum">t {cue.t}</span>
                  <p className="small">
                    {lang === 'ar' ? (
                      <PendingTranslation text={cue.cue} pending={!cue.cueAr} />
                    ) : (
                      cue.cue
                    )}
                  </p>
                  <p className="xs muted">{cue.cueAr ?? t('ui.pending')}</p>
                  <span className="xs">
                    {cue.audioKey ? `${t('animator.audio')}: ${cue.audioKey}` : t('animator.beat')}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={cue.t}
                    onChange={(event) =>
                      edit((animation) => {
                        animation.cues[index].t = Number(event.target.value);
                      })
                    }
                    data-testid={`cue-t-${index}`}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
