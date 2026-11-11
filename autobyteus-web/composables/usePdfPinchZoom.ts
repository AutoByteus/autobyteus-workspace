import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

/** The PDF's largest zoom: 1× is the page width (autobyteus-472 DEC-001). */
export const PDF_MAX_ZOOM = 3;
/** The zoom a double tap at 1× goes to. */
export const PDF_DOUBLE_TAP_ZOOM = 2;
/** Two taps closer than this in time and space are a double tap. */
export const PDF_DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 30;
/** A touch that moves less than this is a tap. */
const TAP_SLOP_PX = 10;

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pointOf = (touch: Touch): Point => ({ x: touch.clientX, y: touch.clientY });

/**
 * Touch zoom of the phone viewer's PDF (autobyteus-472 DS-001). The pages scroll natively in `scroller` (one finger
 * scrolls and pans; the scroller has `touch-action: pan-x pan-y`, so the browser never zooms the page itself). Two
 * fingers are handled here: their touch moves are taken from the browser (non-passive listeners, `preventDefault`,
 * proven in the Android WebView), and while they pinch, `transform` scales `pages` live around the pinch point and
 * follows the fingers. When the pinch ends, the new zoom (1×–3×) goes to `setZoom`, which draws the pages again at the
 * new width (sharp text) and resolves when the new layout is in place; then the live transform is cleared and the
 * scroller is scrolled so the pinched point stays under the fingers. A double tap toggles 1× ↔ 2× at the tapped
 * point the same way. `onCommit` follows each finished zoom.
 */
export function usePdfPinchZoom(
  scroller: Ref<HTMLElement | null>,
  pages: Ref<HTMLElement | null>,
  options: {
    zoom: () => number;
    /** Draws the pages at `zoom` and resolves when their new layout is in place (never rejects). */
    setZoom: (zoom: number) => Promise<void>;
    onCommit?: () => void;
  },
) {
  /** The live pinch: a CSS transform of `pages` and its origin; empty when no pinch is shown. */
  const transform = ref('');
  const transformOrigin = ref('0px 0px');

  let pinch: { startDistance: number; startCentre: Point; anchor: Point; scale: number; centre: Point } | null = null;
  let sequenceHadPinch = false;
  let tapStart: { point: Point; at: number; moved: boolean } | null = null;
  let lastTap: { point: Point; at: number } | null = null;
  let committing = false;
  let attached: HTMLElement | null = null;

  /** The point of `pages` (in its own unscaled layout, at the current zoom) under a screen point. */
  const anchorAt = (screen: Point): Point | null => {
    const rect = pages.value?.getBoundingClientRect();
    return rect ? { x: screen.x - rect.left, y: screen.y - rect.top } : null;
  };

  /** Shows `pages` scaled by `scale` around `anchor`, moved so the anchor sits under `screen`. */
  const show = (anchor: Point, scale: number, from: Point, screen: Point) => {
    transformOrigin.value = `${anchor.x}px ${anchor.y}px`;
    transform.value = `translate(${screen.x - from.x}px, ${screen.y - from.y}px) scale(${scale})`;
  };

  /**
   * Commits a zoom of `scale` (relative to the current zoom) around `anchor`, keeping it under `screen`: the live view
   * stays until the pages are drawn at the new width, then the scroll position takes over.
   */
  const commit = async (anchor: Point, scale: number, from: Point, screen: Point) => {
    const current = options.zoom();
    const next = clamp(current * scale, 1, PDF_MAX_ZOOM);
    const factor = next / current;
    if (Math.abs(factor - 1) < 0.01) {
      // The same zoom (a two-finger drag, or a pinch held at 1× or 3×): the live view only moved the pages with the
      // fingers, so that move becomes scroll, measured without the transform, before the next paint.
      transform.value = '';
      const moved = { x: screen.x - from.x, y: screen.y - from.y };
      if (moved.x === 0 && moved.y === 0) return;
      await nextTick();
      const box = scroller.value;
      if (box) {
        box.scrollLeft -= moved.x;
        box.scrollTop -= moved.y;
      }
      options.onCommit?.();
      return;
    }
    committing = true;
    show(anchor, factor, from, screen);
    await options.setZoom(next);
    // The pages are laid out at the new zoom: clear the live view, then (before the next paint) scroll so the anchor
    // is where the live view showed it. The layout is measured without the transform.
    transform.value = '';
    await nextTick();
    const box = scroller.value;
    const rect = pages.value?.getBoundingClientRect();
    if (box && rect) {
      box.scrollLeft += rect.left + anchor.x * factor - screen.x;
      box.scrollTop += rect.top + anchor.y * factor - screen.y;
    }
    committing = false;
    options.onCommit?.();
  };

  const startPinch = (touches: TouchList) => {
    const [first, second] = [pointOf(touches[0]), pointOf(touches[1])];
    const centre = middle(first, second);
    const anchor = anchorAt(centre);
    if (!anchor) return;
    sequenceHadPinch = true;
    tapStart = null;
    pinch = { startDistance: Math.max(distance(first, second), 1), startCentre: centre, anchor, scale: 1, centre };
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      sequenceHadPinch = false;
      tapStart = { point: pointOf(event.touches[0]), at: Date.now(), moved: false };
      return;
    }
    if (event.touches.length === 2 && !committing) {
      event.preventDefault();
      startPinch(event.touches);
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    if (tapStart && event.touches.length === 1 && distance(tapStart.point, pointOf(event.touches[0])) > TAP_SLOP_PX) tapStart.moved = true;
    if (!pinch || event.touches.length < 2) return;
    if (event.cancelable) event.preventDefault();
    const [first, second] = [pointOf(event.touches[0]), pointOf(event.touches[1])];
    const zoom = options.zoom();
    // Live scale within the zoom range: past 1× or 3× the pages stop growing or shrinking.
    pinch.scale = clamp(distance(first, second) / pinch.startDistance, 1 / zoom, PDF_MAX_ZOOM / zoom);
    pinch.centre = middle(first, second);
    show(pinch.anchor, pinch.scale, pinch.startCentre, pinch.centre);
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (pinch && event.touches.length < 2) {
      const ended = pinch;
      pinch = null;
      void commit(ended.anchor, ended.scale, ended.startCentre, ended.centre);
      return;
    }
    if (event.touches.length > 0 || sequenceHadPinch || !tapStart || tapStart.moved || committing) {
      if (event.touches.length === 0) tapStart = null;
      return;
    }
    const tap = { point: tapStart.point, at: Date.now() };
    tapStart = null;
    if (lastTap && tap.at - lastTap.at < PDF_DOUBLE_TAP_MS && distance(lastTap.point, tap.point) < DOUBLE_TAP_DISTANCE_PX) {
      lastTap = null;
      if (event.cancelable) event.preventDefault();
      const anchor = anchorAt(tap.point);
      if (!anchor) return;
      const target = options.zoom() > 1 ? 1 : PDF_DOUBLE_TAP_ZOOM;
      void commit(anchor, target / options.zoom(), tap.point, tap.point);
      return;
    }
    lastTap = tap;
  };

  const onTouchCancel = () => {
    pinch = null;
    tapStart = null;
    if (!committing) transform.value = '';
  };

  const attach = (element: HTMLElement | null) => {
    if (attached) {
      attached.removeEventListener('touchstart', onTouchStart);
      attached.removeEventListener('touchmove', onTouchMove);
      attached.removeEventListener('touchend', onTouchEnd);
      attached.removeEventListener('touchcancel', onTouchCancel);
    }
    attached = element;
    pinch = null;
    tapStart = null;
    lastTap = null;
    if (!element) return;
    // Not passive: preventDefault takes two-finger moves from the browser, so they pinch instead of scrolling.
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: false });
    element.addEventListener('touchcancel', onTouchCancel);
  };

  watch(scroller, attach);
  onMounted(() => attach(scroller.value));
  onBeforeUnmount(() => attach(null));

  return { transform, transformOrigin };
}
