import { T, Polygon2d, Vec } from "tldraw";
import type { DiagramDiamondShape } from "./diagram-shapes";
import { BaseDiagramShapeUtil } from "./BaseDiagramShapeUtil";
import { SHAPE_DEFAULTS, SHAPE_COLOR_NAMES, DEFAULT_SHAPE_COLOR } from "./shared/shape-styles";

export class DiamondShapeUtil extends BaseDiagramShapeUtil<DiagramDiamondShape> {
  static override type = "diagram-diamond" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.literalEnum(...SHAPE_COLOR_NAMES),
    nodeId: T.string,
  };

  override getDefaultProps(): DiagramDiamondShape["props"] {
    return {
      w: SHAPE_DEFAULTS.w,
      h: SHAPE_DEFAULTS.h + 20,
      label: "Decision",
      color: DEFAULT_SHAPE_COLOR,
      nodeId: "",
    };
  }

  override getGeometry(shape: DiagramDiamondShape) {
    const { w, h } = shape.props;
    return new Polygon2d({
      points: [
        new Vec(w / 2, 0),
        new Vec(w, h / 2),
        new Vec(w / 2, h),
        new Vec(0, h / 2),
      ],
      isFilled: true,
    });
  }

  renderShape(
    shape: DiagramDiamondShape,
    colors: { fill: string; stroke: string }
  ) {
    const { w, h } = shape.props;
    const d = `M ${w / 2} 1 L ${w - 1} ${h / 2} L ${w / 2} ${h - 1} L 1 ${h / 2} Z`;
    return (
      <path
        d={d}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={SHAPE_DEFAULTS.strokeWidth}
      />
    );
  }

  override indicator(shape: DiagramDiamondShape) {
    const { w, h } = shape.props;
    const d = `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    return <path d={d} />;
  }
}
