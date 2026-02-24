/** Generate SVG path data from waypoints and curve type */

export type CurveType = "straight" | "bezier" | "orthogonal" | "freehand";

export interface Point {
  x: number;
  y: number;
}

/** Build SVG path d string from an ordered list of points */
export function buildPath(
  points: Point[],
  curveType: CurveType
): string {
  if (points.length < 2) return "";

  switch (curveType) {
    case "straight":
      return buildStraightPath(points);
    case "bezier":
      return buildBezierPath(points);
    case "orthogonal":
      return buildOrthogonalPath(points);
    case "freehand":
      return buildFreehandPath(points);
    default:
      return buildStraightPath(points);
  }
}

function buildStraightPath(points: Point[]): string {
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function buildBezierPath(points: Point[]): string {
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;

  if (rest.length === 1) {
    d += ` L ${rest[0].x} ${rest[0].y}`;
    return d;
  }

  // Use cubic bezier through waypoints with computed control points
  for (let i = 0; i < rest.length; i++) {
    const prev = i === 0 ? first : rest[i - 1];
    const curr = rest[i];
    const next = i < rest.length - 1 ? rest[i + 1] : null;

    if (next) {
      // Smooth curve through waypoint
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y + (curr.y - prev.y) * 0.5;
      const cp2x = curr.x - (next.x - prev.x) * 0.15;
      const cp2y = curr.y - (next.y - prev.y) * 0.15;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    } else {
      // Last segment
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y + (curr.y - prev.y) * 0.5;
      d += ` Q ${cp1x} ${cp1y}, ${curr.x} ${curr.y}`;
    }
  }

  return d;
}

function buildOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return "";

  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;

  let prev = first;
  for (const curr of rest) {
    // Route through right angles: go horizontal first, then vertical
    const midX = curr.x;
    const midY = prev.y;
    d += ` L ${midX} ${midY}`;
    d += ` L ${curr.x} ${curr.y}`;
    prev = curr;
  }

  return d;
}

/**
 * Build a smooth freehand path using Catmull-Rom splines.
 * Converts to cubic bezier segments that pass through all points for organic curves.
 */
function buildFreehandPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to cubic bezier control points (alpha = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/** Build arrowhead path at the end of a line */
export function buildArrowhead(
  from: Point,
  to: Point,
  size: number = 10
): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = {
    x: to.x - size * Math.cos(angle - Math.PI / 6),
    y: to.y - size * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: to.x - size * Math.cos(angle + Math.PI / 6),
    y: to.y - size * Math.sin(angle + Math.PI / 6),
  };
  return `M ${left.x} ${left.y} L ${to.x} ${to.y} L ${right.x} ${right.y} Z`;
}

/**
 * Get the final segment direction for arrowhead orientation.
 * For orthogonal paths the raw last-two-points trick picks up the
 * horizontal leg instead of the final vertical approach. This helper
 * returns the correct {from, to} pair by looking at the actual last
 * straight segment in the path.
 */
export function getArrowDirection(
  points: Point[],
  curveType: CurveType
): { from: Point; to: Point } {
  const to = points[points.length - 1];

  if (curveType === "orthogonal" && points.length >= 2) {
    // Reconstruct orthogonal waypoints to find the real final segment
    const expanded: Point[] = [points[0]];
    let prev = points[0];
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const bend: Point = { x: curr.x, y: prev.y };
      // Only add the bend if it's not the same as prev or curr
      if (bend.x !== prev.x || bend.y !== prev.y) {
        expanded.push(bend);
      }
      expanded.push(curr);
      prev = curr;
    }
    // The final segment is the last two points of the expanded path
    const from = expanded[expanded.length - 2];
    return { from, to };
  }

  // For freehand, use the last 2 smoothed points for direction
  // For straight / bezier, the raw last two points are fine
  return { from: points[points.length - 2], to };
}

/**
 * Get the first segment direction for start-arrowhead orientation.
 */
export function getArrowStartDirection(
  points: Point[],
  curveType: CurveType
): { from: Point; to: Point } {
  const to = points[0];

  if (curveType === "orthogonal" && points.length >= 2) {
    const expanded: Point[] = [points[0]];
    let prev = points[0];
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const bend: Point = { x: curr.x, y: prev.y };
      if (bend.x !== prev.x || bend.y !== prev.y) {
        expanded.push(bend);
      }
      expanded.push(curr);
      prev = curr;
    }
    return { from: expanded[1], to };
  }

  return { from: points[1], to };
}
