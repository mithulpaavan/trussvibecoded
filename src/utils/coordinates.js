export const PIXELS_PER_METER = 100;
export const WORLD_ORIGIN_Y = 500;
export const GRID_METERS = 0.25;

export function canvasToWorld(point) {
  return {
    x: point.x / PIXELS_PER_METER,
    y: (WORLD_ORIGIN_Y - point.y) / PIXELS_PER_METER
  };
}

export function worldToCanvas(point) {
  return {
    x: point.x * PIXELS_PER_METER,
    y: WORLD_ORIGIN_Y - point.y * PIXELS_PER_METER
  };
}

export function snapWorldValue(value) {
  return Math.round(value / GRID_METERS) * GRID_METERS;
}

export function snapCanvasValue(value) {
  return Math.round(value / (GRID_METERS * PIXELS_PER_METER)) * GRID_METERS * PIXELS_PER_METER;
}

export function nodeToAnalysisNode(node) {
  const world = canvasToWorld(node);
  return {
    ...node,
    x: world.x,
    y: world.y
  };
}

export function formatCoord(value) {
  return Number(value.toFixed(3));
}

