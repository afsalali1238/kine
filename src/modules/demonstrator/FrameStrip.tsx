'use client';

/**
 * Three frames, computed from the same keyframe tracks the 3D figure plays. This is the
 * reduced-motion and no-WebGL tier, and the printed handout: entry position, working
 * position, return. Nothing is captured from a GPU, so it prints identically everywhere.
 */

import { useMemo } from 'react';
import { basePoseFor, drawPose, framesFor, svgPath, type View2D } from '@/modules/animation';
import type { ExerciseAnimation } from '@/lib/types';

type Props = {
  animation: ExerciseAnimation;
  view?: View2D;
  side?: 'left' | 'right' | 'both';
  labels?: string[];
  height?: number;
  caption?: (index: number) => string | null;
};

export function FrameStrip({
  animation,
  view = 'side',
  side = 'both',
  labels,
  height = 150,
  caption,
}: Props) {
  const frames = useMemo(() => {
    const root = basePoseFor(animation.basePose).root;
    const poses = framesFor(animation, side);
    return poses.map((pose) =>
      svgPath(
        drawPose(
          { ...pose, joints: { ...basePoseFor(animation.basePose).pose.joints, ...pose.joints } },
          view,
          root,
        ),
        height,
      ),
    );
  }, [animation, side, view, height]);

  return (
    <div className="strip" data-testid="frame-strip">
      {frames.map((frame, index) => (
        <figure key={index}>
          <svg viewBox={frame.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden>
            <path
              d={frame.d}
              stroke="#4d5c40"
              strokeWidth={Math.max(5, height * 0.045)}
              strokeLinecap="round"
              fill="none"
              opacity={index === 1 ? 1 : 0.72}
            />
          </svg>
          <figcaption>
            {labels?.[index] ?? ['start', 'position', 'finish'][index]}
            {caption?.(index) ? ` · ${caption(index)}` : ''}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
