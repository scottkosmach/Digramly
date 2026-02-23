// Port definitions for connection points on shapes

export interface PortDefinition {
  id: string;
  /** Normalized position (0-1) relative to shape bounds */
  nx: number;
  ny: number;
}

/** Cardinal ports: top, right, bottom, left */
export const CARDINAL_PORTS: PortDefinition[] = [
  { id: "top", nx: 0.5, ny: 0 },
  { id: "right", nx: 1, ny: 0.5 },
  { id: "bottom", nx: 0.5, ny: 1 },
  { id: "left", nx: 0, ny: 0.5 },
];

/** Get absolute port positions for a shape with given width/height */
export function getPortPositions(
  w: number,
  h: number,
  ports: PortDefinition[] = CARDINAL_PORTS
) {
  return ports.map((p) => ({
    id: p.id,
    x: p.nx * w,
    y: p.ny * h,
  }));
}
