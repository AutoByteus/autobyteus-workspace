export const MIN_DIAGRAM_ZOOM = 1;
export const MAX_DIAGRAM_ZOOM = 4;
export const DIAGRAM_ZOOM_STEP = 0.25;
export const DIAGRAM_WHEEL_ZOOM_STEP = 0.15;

export type DiagramSize = {
  width: number;
  height: number;
};

export type DiagramPoint = {
  x: number;
  y: number;
};

export type DiagramPlane = {
  size: DiagramSize;
  stageSize: DiagramSize;
  stageOffset: DiagramPoint;
  maxScroll: DiagramPoint;
  zoom: number;
};

export type AnchoredScrollInput = {
  before: DiagramPlane;
  after: DiagramPlane;
  currentScroll: DiagramPoint;
  anchor: DiagramPoint;
};

const finiteNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum);

export const clampDiagramZoom = (zoom: number): number =>
  clamp(zoom, MIN_DIAGRAM_ZOOM, MAX_DIAGRAM_ZOOM);

export const calculateFittedDiagramSize = (
  diagram: DiagramSize,
  canvas: DiagramSize,
): DiagramSize => {
  const diagramWidth = finiteNonNegative(diagram.width);
  const diagramHeight = finiteNonNegative(diagram.height);
  const canvasWidth = finiteNonNegative(canvas.width);
  const canvasHeight = finiteNonNegative(canvas.height);

  if (!diagramWidth || !diagramHeight || !canvasWidth || !canvasHeight) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(canvasWidth / diagramWidth, canvasHeight / diagramHeight);
  return {
    width: diagramWidth * scale,
    height: diagramHeight * scale,
  };
};

export const calculateDiagramPlane = (
  canvas: DiagramSize,
  fitted: DiagramSize,
  requestedZoom: number,
): DiagramPlane => {
  const canvasSize = {
    width: finiteNonNegative(canvas.width),
    height: finiteNonNegative(canvas.height),
  };
  const fittedSize = {
    width: finiteNonNegative(fitted.width),
    height: finiteNonNegative(fitted.height),
  };
  const zoom = clampDiagramZoom(requestedZoom);
  const stageSize = {
    width: fittedSize.width * zoom,
    height: fittedSize.height * zoom,
  };
  const size = {
    width: Math.max(canvasSize.width, stageSize.width),
    height: Math.max(canvasSize.height, stageSize.height),
  };

  return {
    size,
    stageSize,
    stageOffset: {
      x: Math.max((size.width - stageSize.width) / 2, 0),
      y: Math.max((size.height - stageSize.height) / 2, 0),
    },
    maxScroll: {
      x: Math.max(size.width - canvasSize.width, 0),
      y: Math.max(size.height - canvasSize.height, 0),
    },
    zoom,
  };
};

const anchoredAxisScroll = (
  beforeStageSize: number,
  beforeStageOffset: number,
  afterStageSize: number,
  afterStageOffset: number,
  currentScroll: number,
  anchor: number,
  maximumScroll: number,
): number => {
  if (beforeStageSize <= 0 || afterStageSize <= 0) return 0;

  const pointRatio = clamp(
    (finiteNonNegative(currentScroll) + finiteNonNegative(anchor) - beforeStageOffset) /
      beforeStageSize,
    0,
    1,
  );
  const target = afterStageOffset + pointRatio * afterStageSize - finiteNonNegative(anchor);
  return clamp(target, 0, finiteNonNegative(maximumScroll));
};

export const calculateAnchoredScroll = ({
  before,
  after,
  currentScroll,
  anchor,
}: AnchoredScrollInput): DiagramPoint => ({
  x: anchoredAxisScroll(
    before.stageSize.width,
    before.stageOffset.x,
    after.stageSize.width,
    after.stageOffset.x,
    currentScroll.x,
    anchor.x,
    after.maxScroll.x,
  ),
  y: anchoredAxisScroll(
    before.stageSize.height,
    before.stageOffset.y,
    after.stageSize.height,
    after.stageOffset.y,
    currentScroll.y,
    anchor.y,
    after.maxScroll.y,
  ),
});
