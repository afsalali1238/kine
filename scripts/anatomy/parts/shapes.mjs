/**
 * kinē — shared shape helpers for the part tables. `profile()` turns authored stops into a
 * smooth radial function; `b()` is one region band along a part.
 */

/** Piecewise profile over t: stops = [[t, lat, ant], …], smooth between. */
export function profile(stops) {
  return (t) => {
    if (t <= stops[0][0]) return [stops[0][1], stops[0][2]];
    const last = stops[stops.length - 1];
    if (t >= last[0]) return [last[1], last[2]];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t >= a[0] && t <= b[0]) {
        const raw = (t - a[0]) / (b[0] - a[0] || 1);
        const s = raw * raw * (3 - 2 * raw);
        return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
      }
    }
    return [last[1], last[2]];
  };
}

export const b = (zone, t0, t1, az0, az1, mag = 0) => ({ zone, t: [t0, t1], az: [az0, az1], mag });
