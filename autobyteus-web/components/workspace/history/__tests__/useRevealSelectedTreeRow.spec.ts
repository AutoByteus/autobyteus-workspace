import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { REVEAL_WINDOW_MS, useRevealSelectedTreeRow } from '../useRevealSelectedTreeRow';

/** collapsed-left-panel-expand-keeps-run (REQ-003, REQ-009, AC-004, D-4). */
describe('useRevealSelectedTreeRow', () => {
  let frames: FrameRequestCallback[] = [];
  const flushFrames = (): void => {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(0));
  };
  /** Delivers pending MutationObserver records (happy-dom queues them on a timer tick). */
  const flushMutations = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const setRect = (element: HTMLElement, top: number, height: number): void => {
    element.getBoundingClientRect = () => ({ top, bottom: top + height, height } as DOMRect);
  };

  /** The tree scroll container shows 0–200 px; rows report their own viewport position. */
  const mountTree = (runShown = ref(true)) => {
    const Host = defineComponent({
      setup() {
        const scroller = ref<HTMLElement | null>(null);
        useRevealSelectedTreeRow(scroller, runShown);
        return () => h('section', { 'data-test': 'app-left-panel-run-history', tabindex: '-1' }, [
          h('div', { ref: scroller, 'data-test': 'scroller' }),
        ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    const scroller = wrapper.get('[data-test="scroller"]').element as HTMLElement;
    const section = wrapper.get('[data-test="app-left-panel-run-history"]').element as HTMLElement;
    setRect(scroller, 0, 200);
    return { wrapper, scroller, section };
  };

  const addRow = (scroller: HTMLElement, top: number, selected: 'aria-current' | 'aria-selected' | null = 'aria-current') => {
    const row = document.createElement('div');
    row.tabIndex = 0;
    if (selected) row.setAttribute(selected, 'true');
    setRect(row, top, 20);
    scroller.appendChild(row);
    return row;
  };

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('centres a selected row that is not fully visible, once its row renders', async () => {
    const { wrapper, scroller } = mountTree();
    flushFrames();
    expect(scroller.scrollTop).toBe(0);

    addRow(scroller, 500);
    await flushMutations();
    flushFrames();

    // (500 - 0) - (200 - 20) / 2
    expect(scroller.scrollTop).toBe(410);
    wrapper.unmount();
  });

  it('does not move a row that is already fully visible', async () => {
    const { wrapper, scroller } = mountTree();
    addRow(scroller, 120);
    await flushMutations();
    flushFrames();

    expect(scroller.scrollTop).toBe(0);
    wrapper.unmount();
  });

  it('targets the deepest (last) selected row, marked either way', async () => {
    const { wrapper, scroller, section } = mountTree();
    addRow(scroller, 20, 'aria-current');
    const member = addRow(scroller, 300, 'aria-selected');
    section.focus();
    await flushMutations();
    flushFrames();

    expect(scroller.scrollTop).toBe(300 - 90);
    expect(document.activeElement).toBe(member);
    wrapper.unmount();
  });

  it('moves focus onto the row only when the panel was opened from Workspaces', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const { wrapper, scroller } = mountTree();
    addRow(scroller, 50);
    await flushMutations();
    flushFrames();

    expect(document.activeElement).toBe(outside);
    wrapper.unmount();
  });

  it.each(['wheel', 'pointerdown', 'keydown'])('stops at the first %s in the tree, so the tree never jumps later', async (type) => {
    const { wrapper, scroller } = mountTree();
    flushFrames();
    scroller.dispatchEvent(new Event(type));

    addRow(scroller, 500);
    await flushMutations();
    flushFrames();

    expect(scroller.scrollTop).toBe(0);
    wrapper.unmount();
  });

  it('reveals rows that arrive within the reveal window, and stops when it ends', async () => {
    const realSetTimeout = globalThis.setTimeout;
    let endWindow: (() => void) | null = null;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, delay?: number) => {
      if (delay === REVEAL_WINDOW_MS) {
        endWindow = callback;
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }
      return realSetTimeout(callback, delay);
    }) as typeof setTimeout);
    const { wrapper, scroller } = mountTree();
    flushFrames();
    expect(endWindow).not.toBeNull();

    const early = addRow(scroller, 500);
    await flushMutations();
    flushFrames();
    expect(scroller.scrollTop).toBe(410);

    early.removeAttribute('aria-current');
    await flushMutations();
    flushFrames();
    scroller.scrollTop = 0;
    endWindow!();
    addRow(scroller, 700);
    await flushMutations();
    flushFrames();

    expect(scroller.scrollTop).toBe(0);
    setTimeoutSpy.mockRestore();
    wrapper.unmount();
  });

  // CR-001: off a run (New chat, other pages) a row can still carry an earlier selection.
  it('neither scrolls nor moves focus when no run is shown, even with a selected row', async () => {
    const runShown = ref(false);
    const { wrapper, scroller, section } = mountTree(runShown);
    const stale = addRow(scroller, 500);
    section.focus();
    await flushMutations();
    flushFrames();

    expect(scroller.scrollTop).toBe(0);
    expect(document.activeElement).toBe(section);
    expect(stale.getAttribute('aria-current')).toBe('true');
    wrapper.unmount();
  });

  it('reveals the row when a run becomes shown within the window', async () => {
    const runShown = ref(false);
    const { wrapper, scroller, section } = mountTree(runShown);
    const row = addRow(scroller, 500);
    section.focus();
    await flushMutations();
    flushFrames();
    expect(scroller.scrollTop).toBe(0);

    runShown.value = true;
    await nextTick();
    flushFrames();

    expect(scroller.scrollTop).toBe(410);
    expect(document.activeElement).toBe(row);
    wrapper.unmount();
  });

  it('never changes selection or expansion: only scrollTop and focus', async () => {
    const { wrapper, scroller } = mountTree();
    const row = addRow(scroller, 500);
    const before = scroller.innerHTML;
    await flushMutations();
    flushFrames();

    expect(scroller.innerHTML).toBe(before);
    expect(row.getAttribute('aria-current')).toBe('true');
    wrapper.unmount();
  });
});
