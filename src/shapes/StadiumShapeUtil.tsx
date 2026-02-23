import { T } from "tldraw";
import type { DiagramStadiumShape } from "./diagram-shapes";
import { BaseDiagramShapeUtil } from "./BaseDiagramShapeUtil";
import { SHAPE_DEFAULTS, SHAPE_COLOR_NAMES, DEFAULT_SHAPE_COLOR } from "./shared/shape-styles";

/** Stadium shape (pill / rounded rectangle with fully rounded ends) - used for terminal nodes */
export class StadiumShapeUtil extends BaseDiagramShapeUtil<DiagramStadiumShape> {
  static override type = "diagram-stadium" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.literalEnum(...SHAPE_COLOR_NAMES),
    nodeId: T.string,
  };

  override getDefaultProps(): DiagramStadiumShape["props"] {
    return {
      w: SHAPE_DEFAULTS.w,
      h: SHAPE_DEFAULTS.h,
      label: "Start / End",
      color: "green",
      nodeId: "",
    };
  }

  renderShape(
    shape: DiagramStadiumShape,
    colors: { fill: string; stroke: string }
  ) {
    const { w, h } = shape.props;
    const r = h / 2 - 1;
    return (
      <rect
        x={1}
        y={1}
        width={w - 2}
        height={h - 2}
        rx={r}
        ry={r}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={SHAPE_DEFAULTS.strokeWidth}
      />
    );
  }

  override indicator(shape: DiagramStadiumShape) {
    const { w, h } = shape.props;
    const r = h / 2;
    return <rect x={0} y={0} width={w} height={h} rx={r} ry={r} />;
  }
}
