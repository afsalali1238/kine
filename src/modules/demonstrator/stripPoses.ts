/**
 * The poses behind the 3-frame strip, exported for the handout generator and the tests, so
 * the printed frames and the animated figure are provably the same numbers.
 */

import { framesFor, type Pose, type Side } from '@/modules/animation';
import type { ExerciseAnimation } from '@/lib/types';
export type { Pose };

export function stripPoses(animation: ExerciseAnimation, side: Side = 'both'): Pose[] {
  return framesFor(animation, side);
}
