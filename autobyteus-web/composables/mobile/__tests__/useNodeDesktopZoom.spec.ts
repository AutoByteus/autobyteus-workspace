import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { DOUBLE_TAP_MS, useNodeDesktopZoom } from '../useNodeDesktopZoom';

const WIDTH = 400;
const HEIGHT = 300;

const mountZoom = async () => {
  const onSingleTap = vi.fn();
  const present = ref(true);
  let zoom!: ReturnType<typeof useNodeDesktopZoom>;
  const wrapper = mount(defineComponent({
    setup() {
      const layer = ref<HTMLElement | null>(null);
      zoom = useNodeDesktopZoom(layer, { onSingleTap });
      return () => (present.value ? h('div', { ref: layer, 'data-testid': 'layer' }) : h('span'));
    },
  }), { attachTo: document.body });
  await flushPromises();
  const layer = () => wrapper.get('[data-testid="layer"]').element as HTMLElement;
  return { zoom, wrapper, layer, onSingleTap, present };
};

const pointer = (target: HTMLElement, type: string, id: number, x: number, y: number) => {
  target.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true }));
};

const pinch = (target: HTMLElement, from: [number, number, number, number], to: [number, number, number, number]) => {
  pointer(target, 'pointerdown', 1, from[0], from[1]);
  pointer(target, 'pointerdown', 2, from[2], from[3]);
  pointer(target, 'pointermove', 1, to[0], to[1]);
  pointer(target, 'pointermove', 2, to[2], to[3]);
  pointer(target, 'pointerup', 1, to[0], to[1]);
  pointer(target, 'pointerup', 2, to[2], to[3]);
};

const tap = (target: HTMLElement, x: number, y: number) => {
  pointer(target, 'pointerdown', 7, x, y);
  pointer(target, 'pointerup', 7, x, y);
};

describe('useNodeDesktopZoom (View only)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(HEIGHT);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: WIDTH, height: HEIGHT } as DOMRect);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('pinches to zoom around the pinch centre and clamps to 1×–4×', async () => {
    const { zoom, layer } = await mountZoom();
    pinch(layer(), [150, 150, 250, 150], [100, 150, 300, 150]);
    expect(zoom.scale.value).toBeCloseTo(2);
    // The centre (200, 150) stays where it was: translate = centre − centre × 2.
    expect(zoom.transform.value).toBe('translate(-200px, -150px) scale(2)');

    pinch(layer(), [190, 150, 210, 150], [0, 150, 400, 150]);
    expect(zoom.scale.value).toBe(4);
    pinch(layer(), [0, 150, 400, 150], [199, 150, 201, 150]);
    expect(zoom.scale.value).toBe(1);
    expect(zoom.transform.value).toBe('translate(0px, 0px) scale(1)');
  });

  it('pans a zoomed picture, clamped to the picture, and does not pan at fit', async () => {
    const { zoom, layer } = await mountZoom();
    pointer(layer(), 'pointerdown', 1, 100, 100);
    pointer(layer(), 'pointermove', 1, 300, 250);
    pointer(layer(), 'pointerup', 1, 300, 250);
    expect(zoom.transform.value).toBe('translate(0px, 0px) scale(1)');

    pinch(layer(), [150, 150, 250, 150], [100, 150, 300, 150]);
    pointer(layer(), 'pointerdown', 1, 200, 150);
    pointer(layer(), 'pointermove', 1, 250, 170);
    expect(zoom.transform.value).toBe('translate(-150px, -130px) scale(2)');
    pointer(layer(), 'pointermove', 1, 900, 900);
    pointer(layer(), 'pointerup', 1, 900, 900);
    expect(zoom.transform.value).toBe('translate(0px, 0px) scale(2)');
    pointer(layer(), 'pointerdown', 1, 900, 900);
    pointer(layer(), 'pointermove', 1, -900, -900);
    pointer(layer(), 'pointerup', 1, -900, -900);
    expect(zoom.transform.value).toBe(`translate(${WIDTH - WIDTH * 2}px, ${HEIGHT - HEIGHT * 2}px) scale(2)`);
  });

  it('a double tap returns to fit and is not a single tap', async () => {
    const { zoom, layer, onSingleTap } = await mountZoom();
    pinch(layer(), [150, 150, 250, 150], [100, 150, 300, 150]);
    vi.advanceTimersByTime(DOUBLE_TAP_MS);
    tap(layer(), 200, 150);
    vi.advanceTimersByTime(100);
    tap(layer(), 205, 152);
    expect(zoom.scale.value).toBe(1);
    vi.advanceTimersByTime(DOUBLE_TAP_MS * 2);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('lifting the fingers of a pinch is no tap', async () => {
    const { layer, onSingleTap } = await mountZoom();
    pointer(layer(), 'pointerdown', 1, 150, 150);
    pointer(layer(), 'pointerdown', 2, 250, 150);
    pointer(layer(), 'pointerup', 1, 150, 150);
    pointer(layer(), 'pointerup', 2, 250, 150);
    vi.advanceTimersByTime(DOUBLE_TAP_MS * 2);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('a single tap waits out the double-tap window; a drag is no tap', async () => {
    const { layer, onSingleTap } = await mountZoom();
    tap(layer(), 200, 150);
    vi.advanceTimersByTime(DOUBLE_TAP_MS - 1);
    expect(onSingleTap).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSingleTap).toHaveBeenCalledTimes(1);

    pointer(layer(), 'pointerdown', 1, 100, 100);
    pointer(layer(), 'pointermove', 1, 140, 100);
    pointer(layer(), 'pointerup', 1, 140, 100);
    vi.advanceTimersByTime(DOUBLE_TAP_MS);
    expect(onSingleTap).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+wheel zooms around the pointer and keeps the page from zooming; a plain wheel does nothing', async () => {
    const { zoom, layer } = await mountZoom();
    const plain = new WheelEvent('wheel', { deltaY: -100, clientX: 200, clientY: 150, cancelable: true });
    layer().dispatchEvent(plain);
    expect(zoom.scale.value).toBe(1);
    expect(plain.defaultPrevented).toBe(false);

    const pinchWheel = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 200, clientY: 150, cancelable: true });
    // happy-dom drops `ctrlKey` from the WheelEvent init; a browser's trackpad pinch sets it.
    Object.defineProperty(pinchWheel, 'ctrlKey', { value: true });
    layer().dispatchEvent(pinchWheel);
    expect(pinchWheel.defaultPrevented).toBe(true);
    expect(zoom.scale.value).toBeCloseTo(Math.E);
  });

  it('returns to fit on a resize or rotation', async () => {
    const { zoom, layer } = await mountZoom();
    pinch(layer(), [150, 150, 250, 150], [100, 150, 300, 150]);
    window.dispatchEvent(new Event('resize'));
    expect(zoom.scale.value).toBe(1);
    expect(zoom.transform.value).toBe('translate(0px, 0px) scale(1)');
  });

  it('returns to fit when the layer goes away (Control)', async () => {
    const { zoom, layer, present } = await mountZoom();
    pinch(layer(), [150, 150, 250, 150], [100, 150, 300, 150]);
    present.value = false;
    await flushPromises();
    expect(zoom.scale.value).toBe(1);
  });
});
