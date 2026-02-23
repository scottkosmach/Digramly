import {
  ShapeUtil,
  TLHandle,
  Polyline2d,
  Vec,
  T,
  IndexKey,
} from "tldraw";
import { buildPath, buildArrowhead } from "./connector-rendering";
import type { ConnectorShape } from "@/shapes/diagram-shapes";
// Ensure the module augmentation is loaded
import "@/shapes/diagram-shapes";

export class ConnectorShapeUtil extends ShapeUtil<ConnectorShape> {
  static override type = "diagram-connector" as const;

  static override props = {
    start: T.object({ x: T.number, y: T.number }),
    end: T.object({ x: T.number, y: T.number }),
    waypoints: T.arrayOf(T.object({ x: T.number, y: T.number })),
    curveType: T.literalEnum("straight", "bezier", "orthogonal"),
    label: T.string,
    edgeId: T.string,
    color: T.string,
  };

  override canResize() {
    return false;
  }

  override hideRotateHandle() {
    return true;
  }

  override getDefaultProps(): ConnectorShape["props"] {
    return {
      start: { x: 0, y: 0 },
      end: { x: 200, y: 100 },
      waypoints: [],
      curveType: "bezier",
      label: "",
      edgeId: "",
      color: "#374151",
    };
  }

  override getGeometry(shape: ConnectorShape) {
    const allPoints = [
      shape.props.start,
      ...shape.props.waypoints,
      shape.props.end,
    ].map((p) => new Vec(p.x, p.y));

    return new Polyline2d({ points: allPoints });
  }

  override getHandles(shape: ConnectorShape): TLHandle[] {
    const handles: TLHandle[] = [];

    // Start handle
    handles.push({
      id: "start",
      type: "vertex",
      x: shape.props.start.x,
      y: shape.props.start.y,
      index: "a1" as IndexKey,
    });

    // Waypoint handles
    shape.props.waypoints.forEach((wp, i) => {
      handles.push({
        id: `wp-${i}`,
        type: "vertex",
        x: wp.x,
        y: wp.y,
        index: `a${i + 2}` as IndexKey,
      });
    });

    // End handle
    handles.push({
      id: "end",
      type: "vertex",
      x: shape.props.end.x,
      y: shape.props.end.y,
      index: `a${shape.props.waypoints.length + 2}` as IndexKey,
    });

    // Bend handle in the middle of each segment for adding waypoints
    const allPoints = [shape.props.start, ...shape.props.waypoints, shape.props.end];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const a = allPoints[i];
      const b = allPoints[i + 1];
      handles.push({
        id: `mid-${i}`,
        type: "create",
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        index: `b${i + 1}` as IndexKey,
      });
    }

    return handles;
  }

  override onHandleDrag(
    shape: ConnectorShape,
    { handle }: { handle: TLHandle }
  ) {
    const updates: Partial<ConnectorShape["props"]> = {};

    if (handle.id === "start") {
      updates.start = { x: handle.x, y: handle.y };
    } else if (handle.id === "end") {
      updates.end = { x: handle.x, y: handle.y };
    } else if (handle.id.startsWith("wp-")) {
      const idx = parseInt(handle.id.split("-")[1]);
      const newWaypoints = [...shape.props.waypoints];
      newWaypoints[idx] = { x: handle.x, y: handle.y };
      updates.waypoints = newWaypoints;
    } else if (handle.id.startsWith("mid-")) {
      // Create a new waypoint at the handle position
      const segIdx = parseInt(handle.id.split("-")[1]);
      const newWaypoints = [...shape.props.waypoints];
      newWaypoints.splice(segIdx, 0, { x: handle.x, y: handle.y });
      updates.waypoints = newWaypoints;
    }

    return { id: shape.id, type: shape.type, props: updates };
  }

  override component(shape: ConnectorShape) {
    const allPoints = [
      shape.props.start,
      ...shape.props.waypoints,
      shape.props.end,
    ];

    const pathD = buildPath(allPoints, shape.props.curveType);
    const lastTwo = allPoints.slice(-2);
    const arrowD = buildArrowhead(lastTwo[0], lastTwo[1], 10);

    // Label position: midpoint of the path
    const mid = allPoints[Math.floor(allPoints.length / 2)];

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {/* Hit area (wider invisible path for easier clicking) */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ pointerEvents: "stroke" }}
        />
        {/* Visible path */}
        <path
          d={pathD}
          fill="none"
          stroke={shape.props.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead */}
        <path
          d={arrowD}
          fill="none"
          stroke={shape.props.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Label */}
        {shape.props.label && (
          <g>
            <rect
              x={mid.x - 30}
              y={mid.y - 10}
              width={60}
              height={20}
              rx={4}
              fill="white"
              fillOpacity={0.9}
            />
            <text
              x={mid.x}
              y={mid.y + 4}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {shape.props.label}
            </text>
          </g>
        )}
      </svg>
    );
  }

  override indicator(shape: ConnectorShape) {
    const allPoints = [
      shape.props.start,
      ...shape.props.waypoints,
      shape.props.end,
    ];
    const pathD = buildPath(allPoints, shape.props.curveType);
    return <path d={pathD} />;
  }
}
