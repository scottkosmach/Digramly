import { T } from "tldraw";
import type { DiagramCylinderShape } from "./diagram-shapes";
import { BaseDiagramShapeUtil } from "./BaseDiagramShapeUtil";
import { SHAPE_DEFAULTS, SHAPE_COLOR_NAMES, DEFAULT_SHAPE_COLOR } from "./shared/shape-styles";

const ELLIPSE_HEIGHT = 14;

export class CylinderShapeUtil extends BaseDiagramShapeUtil<DiagramCylinderShape> {
  static override type = "diagram-cylinder" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.literalEnum(...SHAPE_COLOR_NAMES),
    nodeId: T.string,
  };

  override getDefaultProps(): DiagramCylinderShape["props"] {
    return {
      w: SHAPE_DEFAULTS.w,
      h: SHAPE_DEFAULTS.h + 14,
      label: "Database",
      color: DEFAULT_SHAPE_COLOR,
      nodeId: "",
    };
  }

  renderShape(
    shape: DiagramCylinderShape,
    colors: { fill: string; stroke: string }
  ) {
    const { w, h } = shape.props;
    const ry = ELLIPSE_HEIGHT;
    const bodyPath = `
      M 1 ${ry}
      L 1 ${h - ry}
      A ${w / 2 - 1} ${ry} 0 0 0 ${w - 1} ${h - ry}
      L ${w - 1} ${ry}
    `;
    return (
      <>
        {/* Body */}
        <path
          d={bodyPath}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={SHAPE_DEFAULTS.strokeWidth}
        />
        {/* Bottom ellipse (behind body) */}
        <ellipse
          cx={w / 2}
          cy={h - ry}
          rx={w / 2 - 1}
          ry={ry}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={SHAPE_DEFAULTS.strokeWidth}
        />
        {/* Top ellipse */}
        <ellipse
          cx={w / 2}
          cy={ry}
          rx={w / 2 - 1}
          ry={ry}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={SHAPE_DEFAULTS.strokeWidth}
        />
      </>
    );
  }

  override indicator(shape: DiagramCylinderShape) {
    const { w, h } = shape.props;
    const ry = ELLIPSE_HEIGHT;
    return (
      <>
        <ellipse cx={w / 2} cy={ry} rx={w / 2} ry={ry} />
        <line x1={0} y1={ry} x2={0} y2={h - ry} />
        <line x1={w} y1={ry} x2={w} y2={h - ry} />
        <ellipse cx={w / 2} cy={h - ry} rx={w / 2} ry={ry} />
      </>
    );
  }
}
