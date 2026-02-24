/**
 * Compute the point on a shape's perimeter closest to a given target point.
 * Uses ray–shape intersection from the shape's center toward the target.
 */
import type { CanvasNodeState, NodeShapeType } from "@/shapes/shape-types";

interface Point {
  x: number;
  y: number;
}

/**
 * Compute the point on `node`'s perimeter in the direction of `target`.
 */
export function computePerimeterAnchor(
  node: CanvasNodeState,
  target: Point
): Point {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;

  // If target is exactly at center, default to bottom center
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) {
    return { x: cx, y: node.y + node.h };
  }

  switch (node.shapeType) {
    case "circle":
      return circlePerimeter(cx, cy, node.w, node.h, dx, dy);
    case "diamond":
      return diamondPerimeter(cx, cy, node.w, node.h, dx, dy);
    case "cylinder":
      return cylinderPerimeter(node, cx, cy, dx, dy);
    case "stadium":
      return stadiumPerimeter(node, cx, cy, dx, dy);
    case "rounded-rect":
    case "box":
    default:
      return rectPerimeter(node, cx, cy, dx, dy);
  }
}

/** Rect / rounded-rect: ray-rect intersection */
function rectPerimeter(
  node: CanvasNodeState,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): Point {
  const hw = node.w / 2;
  const hh = node.h / 2;

  // Find t such that ray (cx + t*dx, cy + t*dy) hits the rect boundary
  let t = Infinity;

  if (dx !== 0) {
    const tRight = hw / Math.abs(dx);
    t = Math.min(t, tRight);
  }
  if (dy !== 0) {
    const tBottom = hh / Math.abs(dy);
    t = Math.min(t, tBottom);
  }

  if (!isFinite(t)) t = 1;

  return { x: cx + dx * t, y: cy + dy * t };
}

/** Circle / ellipse: parametric ellipse intersection */
function circlePerimeter(
  cx: number,
  cy: number,
  w: number,
  h: number,
  dx: number,
  dy: number
): Point {
  const a = w / 2; // horizontal radius
  const b = h / 2; // vertical radius
  const angle = Math.atan2(dy, dx);
  return {
    x: cx + a * Math.cos(angle),
    y: cy + b * Math.sin(angle),
  };
}

/** Diamond: 4-edge polygon intersection */
function diamondPerimeter(
  cx: number,
  cy: number,
  w: number,
  h: number,
  dx: number,
  dy: number
): Point {
  const hw = w / 2;
  const hh = h / 2;

  // Diamond vertices: top, right, bottom, left
  // Each edge can be described by |x/hw| + |y/hh| = 1
  // Ray: P = t * (dx, dy), find t where |t*dx|/hw + |t*dy|/hh = 1
  const denom = Math.abs(dx) / hw + Math.abs(dy) / hh;
  const t = denom > 0 ? 1 / denom : 1;

  return { x: cx + dx * t, y: cy + dy * t };
}

/** Cylinder: treat as rect with ellipse caps at top/bottom */
function cylinderPerimeter(
  node: CanvasNodeState,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): Point {
  const hw = node.w / 2;
  const capHeight = Math.min(node.h * 0.15, 20);
  const bodyTop = node.y + capHeight;
  const bodyBottom = node.y + node.h - capHeight;
  const bodyHH = (bodyBottom - bodyTop) / 2;
  const bodyCy = (bodyTop + bodyBottom) / 2;

  // Try rect body first
  const angle = Math.atan2(dy, dx);
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));

  // Hit side
  if (absCos > 0.001) {
    const tSide = hw / absCos;
    const hitY = dy * (tSide / Math.sqrt(dx * dx + dy * dy));
    if (Math.abs(hitY) <= bodyHH + capHeight) {
      const t = hw / Math.abs(dx);
      return { x: cx + dx * t, y: cy + dy * t };
    }
  }

  // Hit top/bottom ellipse cap
  const capRx = hw;
  const capRy = capHeight;
  if (dy < 0) {
    // Top cap
    const capCy = bodyTop;
    const a2 = Math.atan2(capCy - cy + dy, dx);
    return {
      x: cx + capRx * Math.cos(a2),
      y: capCy + capRy * Math.sin(a2),
    };
  }
  // Bottom cap
  const capCy2 = bodyBottom;
  const a3 = Math.atan2(capCy2 - cy + dy, dx);
  return {
    x: cx + capRx * Math.cos(a3),
    y: capCy2 + capRy * Math.sin(a3),
  };
}

/** Stadium (pill): rect body with semicircle ends */
function stadiumPerimeter(
  node: CanvasNodeState,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): Point {
  const hw = node.w / 2;
  const hh = node.h / 2;
  const r = Math.min(hw, hh);

  // If pointing mostly vertical, use rect top/bottom
  // If pointing mostly horizontal, use semicircle cap
  const angle = Math.atan2(dy, dx);

  if (hw >= hh) {
    // Horizontal pill: semicircles on left/right
    const bodyHW = hw - r;
    // Check if ray hits the semicircle caps
    if (dx > 0 && Math.abs(dx) * hh > Math.abs(dy) * bodyHW) {
      // Right semicircle
      const capCx = cx + bodyHW;
      return {
        x: capCx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    }
    if (dx < 0 && Math.abs(dx) * hh > Math.abs(dy) * bodyHW) {
      // Left semicircle
      const capCx = cx - bodyHW;
      return {
        x: capCx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    }
    // Hits top/bottom of rect body
    const t = hh / Math.abs(dy || 0.001);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  // Vertical pill: semicircles on top/bottom
  const bodyHH = hh - r;
  if (dy > 0 && Math.abs(dy) * hw > Math.abs(dx) * bodyHH) {
    const capCy = cy + bodyHH;
    return {
      x: cx + r * Math.cos(angle),
      y: capCy + r * Math.sin(angle),
    };
  }
  if (dy < 0 && Math.abs(dy) * hw > Math.abs(dx) * bodyHH) {
    const capCy = cy - bodyHH;
    return {
      x: cx + r * Math.cos(angle),
      y: capCy + r * Math.sin(angle),
    };
  }
  const t = hw / Math.abs(dx || 0.001);
  return { x: cx + dx * t, y: cy + dy * t };
}
