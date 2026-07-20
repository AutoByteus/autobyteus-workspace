import { describe, expect, it } from 'vitest';
import {
  MAX_DIAGRAM_ZOOM,
  MIN_DIAGRAM_ZOOM,
  calculateAnchoredScroll,
  calculateDiagramPlane,
  calculateFittedDiagramSize,
  clampDiagramZoom,
} from '../mermaidDiagramViewport';

describe('mermaidDiagramViewport', () => {
  it('fits wide and tall diagrams without changing their aspect ratios', () => {
    expect(calculateFittedDiagramSize(
      { width: 2000, height: 500 },
      { width: 1000, height: 800 },
    )).toEqual({ width: 1000, height: 250 });

    expect(calculateFittedDiagramSize(
      { width: 400, height: 1200 },
      { width: 900, height: 600 },
    )).toEqual({ width: 200, height: 600 });
  });

  it('returns safe finite empty geometry for invalid dimensions', () => {
    expect(calculateFittedDiagramSize(
      { width: Number.NaN, height: 200 },
      { width: 800, height: 600 },
    )).toEqual({ width: 0, height: 0 });

    expect(calculateFittedDiagramSize(
      { width: 800, height: 600 },
      { width: Number.POSITIVE_INFINITY, height: 600 },
    )).toEqual({ width: 0, height: 0 });
  });

  it('clamps zoom and creates real centered or overflow plane extents', () => {
    expect(clampDiagramZoom(0)).toBe(MIN_DIAGRAM_ZOOM);
    expect(clampDiagramZoom(10)).toBe(MAX_DIAGRAM_ZOOM);

    expect(calculateDiagramPlane(
      { width: 1000, height: 800 },
      { width: 800, height: 400 },
      1,
    )).toEqual({
      size: { width: 1000, height: 800 },
      stageSize: { width: 800, height: 400 },
      stageOffset: { x: 100, y: 200 },
      maxScroll: { x: 0, y: 0 },
      zoom: 1,
    });

    expect(calculateDiagramPlane(
      { width: 1000, height: 800 },
      { width: 800, height: 400 },
      2,
    )).toEqual({
      size: { width: 1600, height: 800 },
      stageSize: { width: 1600, height: 800 },
      stageOffset: { x: 0, y: 0 },
      maxScroll: { x: 600, y: 0 },
      zoom: 2,
    });
  });

  it('keeps the anchored diagram point stable while zooming from a centered fit', () => {
    const before = calculateDiagramPlane(
      { width: 1000, height: 800 },
      { width: 800, height: 400 },
      1,
    );
    const after = calculateDiagramPlane(
      { width: 1000, height: 800 },
      { width: 800, height: 400 },
      2,
    );

    expect(calculateAnchoredScroll({
      before,
      after,
      currentScroll: { x: 0, y: 0 },
      anchor: { x: 500, y: 400 },
    })).toEqual({ x: 300, y: 0 });
  });

  it('clamps anchored scroll at every real plane edge', () => {
    const before = calculateDiagramPlane(
      { width: 1000, height: 800 },
      { width: 1000, height: 800 },
      2,
    );
    const after = calculateDiagramPlane(
      { width: 1000, height: 800 },
      { width: 1000, height: 800 },
      4,
    );

    expect(calculateAnchoredScroll({
      before,
      after,
      currentScroll: { x: 1000, y: 800 },
      anchor: { x: 1000, y: 800 },
    })).toEqual({ x: 3000, y: 2400 });

    expect(calculateAnchoredScroll({
      before,
      after,
      currentScroll: { x: -10, y: Number.NaN },
      anchor: { x: 0, y: 0 },
    })).toEqual({ x: 0, y: 0 });
  });
});
