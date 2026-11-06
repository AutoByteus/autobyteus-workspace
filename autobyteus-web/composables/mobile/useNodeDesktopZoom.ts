import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

export const NODE_DESKTOP_MAX_ZOOM = 4;
/** Two taps closer than this in time and space are a double tap; a single tap waits this long. */
export const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 30;
/** A touch that moves less than this is a tap, not a drag. */
const TAP_SLOP_PX = 8;
const WHEEL_ZOOM_STEP = 0.01;

type Point = { x: number; y: number };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * View only zoom of the fitted node desktop picture (DS-S3-4): a page-level transform, so no input
 * reaches the desktop. On the gesture layer above the picture: a two-finger pinch scales (1×–4×)
 * around the pinch centre, a one-finger drag pans (clamped to the picture), a double tap returns to
 * fit, and a single tap (after the double-tap window) calls `onSingleTap`. Ctrl+wheel (a trackpad
 * pinch in a desktop browser) zooms around the pointer. A resize or rotation returns to fit. While
 * the layer is absent (Control) the picture stays fitted, so noVNC's coordinates stay correct.
 */
export function useNodeDesktopZoom(layer: Ref<HTMLElement | null>, options: { onSingleTap?: () => void } = {}) {
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
  let singleTapTimer: ReturnType<typeof setTimeout> | null = null;
  let attached: HTMLElement | null = null;

  const size = () => ({ width: attached?.clientWidth ?? 0, height: attached?.clientHeight ?? 0 });

  const place = (nextScale: number, nextX: number, nextY: number) => {
    const { width, height } = size();
    scale.value = clamp(nextScale, 1, NODE_DESKTOP_MAX_ZOOM);
    x.value = clamp(nextX, width - width * scale.value, 0);
    y.value = clamp(nextY, height - height * scale.value, 0);
  };

  /** Back to fit (double tap, Fit, a resize, a rotation, Control). */
  const reset = () => {
    scale.value = 1;
    x.value = 0;
    y.value = 0;
    pinch = null;
    drag = null;
  };

  /** Scales to `nextScale` keeping the picture point under `at` (layer coordinates) where it is. */
  const zoomAround = (at: Point, nextScale: number) => {
    const content = { x: (at.x - x.value) / scale.value, y: (at.y - y.value) / scale.value };
    const bounded = clamp(nextScale, 1, NODE_DESKTOP_MAX_ZOOM);
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
    if (pointers.size === 0) sequenceHadPinch = false;
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
      const nextScale = clamp(pinch.startScale * (distance(first, second) / pinch.startDistance), 1, NODE_DESKTOP_MAX_ZOOM);
      place(nextScale, centre.x - pinch.contentPoint.x * nextScale, centre.y - pinch.contentPoint.y * nextScale);
      return;
    }
    if (drag && first) {
      const dx = first.x - drag.start.x;
      const dy = first.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) > TAP_SLOP_PX) drag.moved = true;
      if (drag.moved) place(scale.value, drag.startX + dx, drag.startY + dy);
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
    if (!tap) return;
    const now = Date.now();
    if (lastTap && now - lastTap.at < DOUBLE_TAP_MS && distance(lastTap.point, tap) < DOUBLE_TAP_DISTANCE_PX) {
      lastTap = null;
      clearSingleTap();
      reset();
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

  return { scale, transform, reset };
}
