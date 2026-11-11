import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

export const PICTURE_MAX_ZOOM = 4;
/** Two taps closer than this in time and space are a double tap; a single tap waits this long. */
export const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 30;
/** A touch that moves less than this is a tap, not a drag. */
const TAP_SLOP_PX = 8;
const WHEEL_ZOOM_STEP = 0.01;

type Point = { x: number; y: number };
/** Where a zoomed picture is: its scale and its offset in the layer (what `restore` puts back). */
export type PictureZoomState = { scale: number; x: number; y: number };
/** The fitted picture inside the layer, at scale 1. */
type Box = { left: number; top: number; width: number; height: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Touch zoom of one fitted picture: the phone's VNC Viewer's node desktop (DS-S3-4, view only: a page-level
 * transform, so no input reaches the desktop) and the phone viewer's images (autobyteus-472, moved here from
 * `composables/mobile/useNodeDesktopZoom.ts`). On the gesture layer above the picture: a two-finger pinch scales (1×–4×)
 * around the pinch centre, a one-finger drag pans, a double tap toggles Fit ↔ Fill (autobyteus-432:
 * at fit the picture grows, centred and undistorted, until it covers the layer; otherwise back to
 * fit), and a single tap (after the double-tap window) calls `onSingleTap`. Ctrl+wheel (a trackpad
 * pinch in a desktop browser) zooms around the pointer. Along each axis the picture is kept covering
 * the layer when it is larger than the layer, and centred when it is smaller, so no letterbox is panned
 * into view. `picture` gives the picture's own size (noVNC's canvas: the desktop's size), which noVNC
 * fits into the layer and centres; without one the layer is the picture. A resize or rotation returns to fit. While the layer is absent (Control) the picture stays
 * fitted, so noVNC's coordinates stay correct. `onCommit` hears where the picture is after each finished gesture
 * (a pinch or a drag ends, a double tap), and `restore` puts a remembered place back (autobyteus-472 REQ-006).
 */
export function usePictureZoom(
  layer: Ref<HTMLElement | null>,
  options: {
    onSingleTap?: () => void;
    picture?: () => { width: number; height: number } | null;
    onCommit?: (state: PictureZoomState) => void;
  } = {},
) {
  const scale = ref(1);
  const x = ref(0);
  const y = ref(0);
  const transform = computed(() => `translate(${x.value}px, ${y.value}px) scale(${scale.value})`);

  const pointers = new Map<number, Point>();
  let pinch: { startDistance: number; startScale: number; contentPoint: Point } | null = null;
  let drag: { start: Point; startX: number; startY: number; moved: boolean; at: number } | null = null;
  let lastTap: { point: Point; at: number } | null = null;
  /** This touch sequence (first finger down to last finger up) had two fingers: it ends in no tap. */
  let sequenceHadPinch = false;
  /** This touch sequence moved the picture (a pinch or a drag): its end is a finished gesture (`onCommit`). */
  let sequenceMoved = false;
  let singleTapTimer: ReturnType<typeof setTimeout> | null = null;
  let attached: HTMLElement | null = null;

  const size = () => ({ width: attached?.clientWidth ?? 0, height: attached?.clientHeight ?? 0 });

  /** The fitted picture's box at scale 1: the picture's size fitted into the layer, centred (as noVNC places it). */
  const pictureBox = (): Box => {
    const { width, height } = size();
    const picture = options.picture?.();
    if (!picture || picture.width <= 0 || picture.height <= 0) return { left: 0, top: 0, width, height };
    const fit = Math.min(width / picture.width, height / picture.height);
    const fitted = { width: picture.width * fit, height: picture.height * fit };
    return { left: (width - fitted.width) / 2, top: (height - fitted.height) / 2, ...fitted };
  };

  /** The offset along one axis: covering the layer when the scaled picture is larger, else centred. */
  const offset = (wanted: number, layerSize: number, start: number, length: number, at: number) => {
    const scaled = length * at;
    if (scaled < layerSize) return (layerSize - scaled) / 2 - start * at;
    return clamp(wanted, layerSize - (start + length) * at, -start * at);
  };

  const place = (nextScale: number, nextX: number, nextY: number) => {
    const { width, height } = size();
    const box = pictureBox();
    scale.value = clamp(nextScale, 1, PICTURE_MAX_ZOOM);
    x.value = offset(nextX, width, box.left, box.width, scale.value);
    y.value = offset(nextY, height, box.top, box.height, scale.value);
  };

  /** Back to fit (double tap, Fit, a resize, a rotation, Control). */
  const reset = () => {
    scale.value = 1;
    x.value = 0;
    y.value = 0;
    pinch = null;
    drag = null;
  };

  const commit = () => options.onCommit?.({ scale: scale.value, x: x.value, y: y.value });

  /** Puts a remembered place back, kept inside the layer as any gesture is. */
  const restore = (state: PictureZoomState) => place(state.scale, state.x, state.y);

  /** Fit → Fill: the smallest scale at which the picture covers the layer, centred. Otherwise → Fit. */
  const toggleFill = () => {
    if (scale.value > 1) {
      reset();
      return;
    }
    const { width, height } = size();
    const box = pictureBox();
    if (box.width <= 0 || box.height <= 0) return;
    const cover = clamp(Math.max(width / box.width, height / box.height), 1, PICTURE_MAX_ZOOM);
    place(cover, width / 2 - (box.left + box.width / 2) * cover, height / 2 - (box.top + box.height / 2) * cover);
  };

  /** Scales to `nextScale` keeping the picture point under `at` (layer coordinates) where it is. */
  const zoomAround = (at: Point, nextScale: number) => {
    const content = { x: (at.x - x.value) / scale.value, y: (at.y - y.value) / scale.value };
    const bounded = clamp(nextScale, 1, PICTURE_MAX_ZOOM);
    place(bounded, at.x - content.x * bounded, at.y - content.y * bounded);
  };

  const local = (event: { clientX: number; clientY: number }): Point => {
    const rect = attached!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const clearSingleTap = () => {
    if (singleTapTimer) clearTimeout(singleTapTimer);
    singleTapTimer = null;
  };

  const startGesture = () => {
    const [first, second] = [...pointers.values()];
    if (first && second) {
      sequenceHadPinch = true;
      const centre = middle(first, second);
      pinch = {
        startDistance: Math.max(distance(first, second), 1),
        startScale: scale.value,
        contentPoint: { x: (centre.x - x.value) / scale.value, y: (centre.y - y.value) / scale.value },
      };
      drag = null;
    } else if (first) {
      drag = { start: first, startX: x.value, startY: y.value, moved: false, at: Date.now() };
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    if (pointers.size === 0) {
      sequenceHadPinch = false;
      sequenceMoved = false;
    }
    attached?.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, local(event));
    if (pointers.size > 2) return;
    startGesture();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, local(event));
    const [first, second] = [...pointers.values()];
    if (pinch && first && second) {
      const centre = middle(first, second);
      const nextScale = clamp(pinch.startScale * (distance(first, second) / pinch.startDistance), 1, PICTURE_MAX_ZOOM);
      place(nextScale, centre.x - pinch.contentPoint.x * nextScale, centre.y - pinch.contentPoint.y * nextScale);
      sequenceMoved = true;
      return;
    }
    if (drag && first) {
      const dx = first.x - drag.start.x;
      const dy = first.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) > TAP_SLOP_PX) drag.moved = true;
      if (drag.moved) {
        place(scale.value, drag.startX + dx, drag.startY + dy);
        sequenceMoved = true;
      }
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    const point = local(event);
    const tap = drag && !drag.moved && !sequenceHadPinch && pointers.size === 1 && Date.now() - drag.at < DOUBLE_TAP_MS ? point : null;
    pointers.delete(event.pointerId);
    pinch = null;
    drag = null;
    // A finger lifted from a pinch continues as a drag from where it is.
    if (pointers.size === 1) startGesture();
    if (sequenceMoved && pointers.size === 0) commit();
    if (!tap) return;
    const now = Date.now();
    if (lastTap && now - lastTap.at < DOUBLE_TAP_MS && distance(lastTap.point, tap) < DOUBLE_TAP_DISTANCE_PX) {
      lastTap = null;
      clearSingleTap();
      toggleFill();
      commit();
      return;
    }
    lastTap = { point: tap, at: now };
    clearSingleTap();
    singleTapTimer = setTimeout(() => {
      singleTapTimer = null;
      options.onSingleTap?.();
    }, DOUBLE_TAP_MS);
  };

  const onPointerCancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    pinch = null;
    drag = null;
  };

  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomAround(local(event), scale.value * Math.exp(-event.deltaY * WHEEL_ZOOM_STEP));
  };

  const attach = (element: HTMLElement | null) => {
    if (attached) {
      attached.removeEventListener('pointerdown', onPointerDown);
      attached.removeEventListener('pointermove', onPointerMove);
      attached.removeEventListener('pointerup', onPointerUp);
      attached.removeEventListener('pointercancel', onPointerCancel);
      attached.removeEventListener('wheel', onWheel);
    }
    attached = element;
    pointers.clear();
    clearSingleTap();
    reset();
    if (!element) return;
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerCancel);
    // Not passive: preventDefault keeps the page itself from zooming on a trackpad pinch.
    element.addEventListener('wheel', onWheel, { passive: false });
  };

  watch(layer, attach);
  onMounted(() => {
    attach(layer.value);
    window.addEventListener('resize', reset);
  });
  onBeforeUnmount(() => {
    attach(null);
    window.removeEventListener('resize', reset);
  });

  return { scale, transform, reset, restore };
}
