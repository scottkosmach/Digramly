/**
 * Freehand line smoothing algorithms.
 * RDP simplification + Chaikin corner-cutting.
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Ramer-Douglas-Peucker point reduction.
 * Removes points that deviate less than `epsilon` from the simplified line.
 */
export function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  // Find the point with the maximum distance from the line start→end
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function perpendicularDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const ex = point.x - lineStart.x;
    const ey = point.y - lineStart.y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  const num = Math.abs(
    dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );
  return num / Math.sqrt(lenSq);
}

/**
 * Chaikin corner-cutting curve smoothing.
 * Each iteration replaces each segment with two points at 25% and 75%.
 */
export function chaikinSmooth(points: Point[], iterations: number): Point[] {
  if (points.length < 3 || iterations <= 0) return [...points];

  let current = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [current[0]]; // preserve start

    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      next.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      next.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }

    next.push(current[current.length - 1]); // preserve end
    current = next;
  }

  return current;
}

/**
 * Combined smoothing pipeline for freehand points.
 * @param rawPoints - Original drawn points
 * @param smoothing - 0.0 (raw) to 1.0 (max smooth)
 * @returns Simplified + smoothed waypoints
 */
export function smoothFreehandPoints(
  rawPoints: Point[],
  smoothing: number
): Point[] {
  if (rawPoints.length <= 2) return [...rawPoints];

  const s = Math.max(0, Math.min(1, smoothing));

  // epsilon: higher smoothing → more aggressive simplification
  const epsilon = 0.5 + s * 14.5; // lerp(0.5, 15, s)
  const simplified = rdpSimplify(rawPoints, epsilon);

  // iterations: higher smoothing → more corner cutting
  const iterations = Math.round(s * 4);
  if (iterations <= 0) return simplified;

  return chaikinSmooth(simplified, iterations);
}
