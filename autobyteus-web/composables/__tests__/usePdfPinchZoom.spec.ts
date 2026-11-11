import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { PDF_DOUBLE_TAP_MS, usePdfPinchZoom } from '../usePdfPinchZoom';

// autobyteus-472 DS-001: two fingers pinch the PDF (live, then drawn again at the new zoom with the pinch point kept under
// the fingers); one finger is the browser's own scrolling; a double tap toggles 1× ↔ 2× at the tapped point.

const PADDING = 16;

const mountPinch = async (startZoom = 1) => {
  let zoom = startZoom;
  const setZoom = vi.fn(async (next: number) => { zoom = next; });
  const onCommit = vi.fn();
  const scroll = { left: 0, top: 0 };
  let live!: ReturnType<typeof usePdfPinchZoom>;
  const wrapper = mount(defineComponent({
    setup() {
      const scroller = ref<HTMLElement | null>(null);
      const pages = ref<HTMLElement | null>(null);
      live = usePdfPinchZoom(scroller, pages, { zoom: () => zoom, setZoom, onCommit });
      return () => h('div', { ref: scroller, 'data-testid': 'scroller' }, [
        h('div', { ref: pages, 'data-testid': 'pages', style: { transform: live.transform.value, transformOrigin: live.transformOrigin.value } }),
      ]);
    },
  }), { attachTo: document.body });
  const scroller = wrapper.get('[data-testid="scroller"]').element as HTMLElement;
  const pages = wrapper.get('[data-testid="pages"]').element as HTMLElement;
  Object.defineProperty(scroller, 'scrollLeft', { configurable: true, get: () => scroll.left, set: (v: number) => { scroll.left = v; } });
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => scroll.top, set: (v: number) => { scroll.top = v; } });
  // The pages sit inside the scroller's padding and move with its scroll.
  pages.getBoundingClientRect = () => ({ left: PADDING - scroll.left, top: PADDING - scroll.top, width: 0, height: 0 } as DOMRect);
  await flushPromises();
  return { wrapper, scroller, pages, live, setZoom, onCommit, scroll, zoom: () => zoom };
};

const touch = (target: HTMLElement, type: string, points: Array<[number, number]>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: points.map(([clientX, clientY], identifier) => ({ identifier, clientX, clientY })) });
  target.dispatchEvent(event);
  return event;
};

/** Two fingers from `from` to `to`; returns the events whose default the composable took. */
const pinch = (target: HTMLElement, from: Array<[number, number]>, to: Array<[number, number]>) => {
  const prevented: string[] = [];
  const note = (event: Event) => { if (event.defaultPrevented) prevented.push(event.type); };
  note(touch(target, 'touchstart', [from[0]]));
  note(touch(target, 'touchstart', from));
  note(touch(target, 'touchmove', to));
  return { prevented, end: () => { touch(target, 'touchend', [to[1]]); touch(target, 'touchend', []); } };
};

const tap = (target: HTMLElement, x: number, y: number) => {
  touch(target, 'touchstart', [[x, y]]);
  touch(target, 'touchend', []);
};

afterEach(() => { document.body.innerHTML = ''; });

describe('usePdfPinchZoom (the phone viewer\'s PDF)', () => {
  it('pinches live around the pinch centre, then draws at the new zoom and keeps the pinched point under the fingers', async () => {
    const { scroller, pages, live, setZoom, onCommit, scroll } = await mountPinch();
    const gesture = pinch(scroller, [[100, 200], [200, 200]], [[50, 200], [250, 200]]);
    // Two-finger moves are the viewer's: the browser neither scrolls nor zooms the page.
    expect(gesture.prevented).toEqual(['touchstart', 'touchmove']);
    // The pinch centre (150, 200) is the pages' point (134, 184); twice the distance → twice the size.
    expect(live.transformOrigin.value).toBe('134px 184px');
    expect(live.transform.value).toBe('translate(0px, 0px) scale(2)');
    await flushPromises();
    expect(pages.style.transform).toBe('translate(0px, 0px) scale(2)');

    gesture.end();
    await flushPromises();
    expect(setZoom).toHaveBeenCalledWith(2);
    expect(live.transform.value).toBe('');
    // The point drawn twice as large is scrolled back under the fingers: 16 + 134 × 2 − 150, 16 + 184 × 2 − 200.
    expect(scroll).toEqual({ left: 134, top: 184 });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('keeps the zoom within 1× (page width) and 3×', async () => {
    const out = await mountPinch();
    pinch(out.scroller, [[140, 200], [160, 200]], [[40, 200], [260, 200]]).end();
    await flushPromises();
    expect(out.setZoom).toHaveBeenLastCalledWith(3);
    out.wrapper.unmount();

    const back = await mountPinch(2);
    pinch(back.scroller, [[0, 200], [300, 200]], [[140, 200], [160, 200]]).end();
    await flushPromises();
    expect(back.setZoom).toHaveBeenLastCalledWith(1);
  });

  it('follows the fingers while they pinch: the pinched point moves with the pinch centre', async () => {
    const { scroller, live } = await mountPinch();
    pinch(scroller, [[100, 200], [200, 200]], [[100, 260], [300, 260]]);
    // Centre (150, 200) → (200, 260); distance 100 → 200.
    expect(live.transform.value).toBe('translate(50px, 60px) scale(2)');
  });

  // CRR-002 CR-001: a two-finger move that ends at the same zoom keeps where the fingers took the pages.
  it('a two-finger drag at a fixed zoom pans: the move becomes scroll when the fingers lift, with no zoom', async () => {
    const { scroller, live, setZoom, onCommit, scroll } = await mountPinch(2);
    scroll.left = 200; scroll.top = 300;
    const gesture = pinch(scroller, [[100, 200], [200, 200]], [[130, 240], [230, 240]]);
    expect(live.transform.value).toBe('translate(30px, 40px) scale(1)');
    gesture.end();
    await flushPromises();
    expect(setZoom).not.toHaveBeenCalled();
    expect(live.transform.value).toBe('');
    // The pages stay where the fingers left them: scrolled back by the move.
    expect(scroll).toEqual({ left: 170, top: 260 });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('a moving pinch held at the 3× cap pans with the fingers instead of snapping back', async () => {
    const { scroller, live, setZoom, onCommit, scroll } = await mountPinch(3);
    scroll.left = 500; scroll.top = 900;
    const gesture = pinch(scroller, [[150, 300], [250, 300]], [[70, 290], [370, 290]]);
    // Past the cap the pages do not grow; they follow the pinch centre (200, 300) → (220, 290).
    expect(live.transform.value).toBe('translate(20px, -10px) scale(1)');
    gesture.end();
    await flushPromises();
    expect(setZoom).not.toHaveBeenCalled();
    expect(live.transform.value).toBe('');
    expect(scroll).toEqual({ left: 480, top: 910 });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('two fingers that rest without moving change nothing', async () => {
    const { scroller, setZoom, onCommit, scroll } = await mountPinch(2);
    scroll.left = 50; scroll.top = 60;
    pinch(scroller, [[100, 200], [200, 200]], [[100, 200], [200, 200]]).end();
    await flushPromises();
    expect(setZoom).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(scroll).toEqual({ left: 50, top: 60 });
  });

  it('leaves one finger to the browser: no default taken, no zoom', async () => {
    const { scroller, live, setZoom } = await mountPinch();
    const start = touch(scroller, 'touchstart', [[100, 300]]);
    const move = touch(scroller, 'touchmove', [[100, 100]]);
    touch(scroller, 'touchend', []);
    await flushPromises();
    expect(start.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect(live.transform.value).toBe('');
    expect(setZoom).not.toHaveBeenCalled();
  });

  it('a double tap goes to 2× at the tapped point and back to 1×; a slow second tap does nothing', async () => {
    vi.useFakeTimers();
    try {
      const { scroller, setZoom, scroll, zoom } = await mountPinch();
      tap(scroller, 100, 100);
      tap(scroller, 100, 100);
      await vi.runAllTimersAsync();
      expect(setZoom).toHaveBeenLastCalledWith(2);
      // The tapped point (84, 84) of the pages stays under the finger: 16 + 84 × 2 − 100.
      expect(scroll).toEqual({ left: 84, top: 84 });
      expect(zoom()).toBe(2);

      vi.advanceTimersByTime(PDF_DOUBLE_TAP_MS + 50);
      tap(scroller, 100, 100);
      tap(scroller, 100, 100);
      await vi.runAllTimersAsync();
      expect(setZoom).toHaveBeenLastCalledWith(1);

      vi.advanceTimersByTime(PDF_DOUBLE_TAP_MS + 50);
      tap(scroller, 100, 100);
      vi.advanceTimersByTime(PDF_DOUBLE_TAP_MS + 50);
      tap(scroller, 100, 100);
      await vi.runAllTimersAsync();
      expect(setZoom).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a finger that moved is a scroll, not a tap', async () => {
    const { scroller, setZoom } = await mountPinch();
    tap(scroller, 100, 100);
    touch(scroller, 'touchstart', [[100, 100]]);
    touch(scroller, 'touchmove', [[100, 160]]);
    touch(scroller, 'touchend', []);
    await flushPromises();
    expect(setZoom).not.toHaveBeenCalled();
  });
});
