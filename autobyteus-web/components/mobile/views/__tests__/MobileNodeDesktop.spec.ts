import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import type { NodeDesktopStreamEnd } from '~/utils/nodeDesktopClient';

const session = vi.hoisted(() => ({ current: null as any }));
vi.mock('~/composables/useVncSession', () => ({ useVncSession: () => session.current }));

import MobileNodeDesktop from '../MobileNodeDesktop.vue';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';
import { DOUBLE_TAP_MS } from '~/composables/mobile/useNodeDesktopZoom';

const SENTINEL = '_'.repeat(32);

const makeSession = () => {
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const mode = ref<'view' | 'control'>('view');
  const streamEnd = ref<NodeDesktopStreamEnd | null>(null);
  return {
    connectionStatus,
    mode,
    streamEnd,
    isConnected: computed(() => connectionStatus.value === 'connected'),
    isConnecting: computed(() => connectionStatus.value === 'connecting'),
    setContainer: vi.fn(),
    refreshViewport: vi.fn(),
    connect: vi.fn((next: 'view' | 'control' = 'view') => { mode.value = next; connectionStatus.value = 'connecting'; }),
    disconnect: vi.fn(() => { connectionStatus.value = 'disconnected'; }),
    switchMode: vi.fn((next: 'view' | 'control') => { mode.value = next; connectionStatus.value = 'connected'; }),
    typeText: vi.fn(),
    pressKey: vi.fn(),
    remoteClipboardText: ref<string | null>(null),
    sendClipboardText: vi.fn(() => true),
  };
};

const mountView = async (query: Record<string, string> = { screen: 'desktop' }) => {
  const router = await createMobileTestRouter({ screen: 'run' });
  await router.push({ path: '/mobile', query });
  const wrapper = mount(MobileNodeDesktop, { attachTo: document.body, global: { plugins: [router], stubs: { Icon: true } } });
  await flushPromises();
  return { router, wrapper };
};

const inControl = async () => {
  const view = await mountView();
  session.current.mode.value = 'control';
  session.current.connectionStatus.value = 'connected';
  await flushPromises();
  return view;
};

describe('MobileNodeDesktop', () => {
  beforeEach(() => {
    session.current = makeSession();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(225);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('opens View only and fitted, with the gesture layer and no keyboard (REQ-014, REQ-015)', async () => {
    const { wrapper } = await mountView();
    expect(session.current.connect).toHaveBeenCalledWith('view');
    session.current.connectionStatus.value = 'connected';
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-node-desktop"]').attributes('data-mode')).toBe('view');
    expect(wrapper.find('[data-testid="mobile-node-desktop-gestures"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-node-desktop-keyboard"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-node-desktop-keyboard-input"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mobile-node-desktop-status"]').text()).toBe('Connected · View only');
  });

  it('switches to Control only by the switch: the gesture layer goes, Keyboard comes', async () => {
    const { wrapper } = await mountView();
    session.current.connectionStatus.value = 'connected';
    await flushPromises();
    await wrapper.get('[data-testid="mobile-node-desktop-mode"]').trigger('click');
    expect(session.current.switchMode).toHaveBeenCalledWith('control');
    await flushPromises();
    expect(wrapper.find('[data-testid="mobile-node-desktop-gestures"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-node-desktop-keyboard"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-node-desktop-mode"]').attributes('aria-pressed')).toBe('true');
  });

  it('shows "too many viewers" with Retry, which opens View only (AC-021)', async () => {
    const { wrapper } = await mountView();
    session.current.connectionStatus.value = 'disconnected';
    session.current.streamEnd.value = { state: 'too-many', messageKey: 'workspace.components.workspace.tools.NodeDesktopTile.too_many_viewers' };
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-node-desktop-status"]').text()).toBe('Too many viewers on this node right now');
    const retry = wrapper.get('[data-testid="mobile-node-desktop-connect"]');
    expect(retry.text()).toBe('Retry');
    session.current.connect.mockClear();
    await retry.trigger('click');
    expect(session.current.connect).toHaveBeenCalledWith('view');
  });

  describe('keyboard bridge (REQ-S3-2, AR-S3-009)', () => {
    const input = (wrapper: Awaited<ReturnType<typeof inControl>>['wrapper']) =>
      wrapper.get('[data-testid="mobile-node-desktop-keyboard-input"]').element as HTMLTextAreaElement;
    const type = async (element: HTMLTextAreaElement, value: string, caret = value.length) => {
      element.value = value;
      element.setSelectionRange(caret, caret);
      element.dispatchEvent(new Event('input'));
      await flushPromises();
    };

    it('opens the keyboard on the hidden input, reset to the sentinel with the caret at its end', async () => {
      const { wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-keyboard"]').trigger('click');
      const element = input(wrapper);
      expect(document.activeElement).toBe(element);
      expect(element.value).toBe(SENTINEL);
      expect(element.selectionStart).toBe(SENTINEL.length);
      expect(element.getAttribute('autocapitalize')).toBe('off');
      expect(element.getAttribute('autocorrect')).toBe('off');
    });

    it('sends typed text and Enter, then Backspace after a reset, and repeated Backspace', async () => {
      const { wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-keyboard"]').trigger('click');
      const element = input(wrapper);
      await type(element, `${SENTINEL}abc`);
      expect(session.current.typeText).toHaveBeenLastCalledWith('abc');
      expect(element.value).toBe(SENTINEL);
      await type(element, `${SENTINEL}\n`);
      expect(session.current.typeText).toHaveBeenLastCalledWith('\n');
      // After the reset there is still something to delete, so the Backspace is seen.
      await type(element, SENTINEL.slice(0, -1));
      await type(element, SENTINEL.slice(0, -1));
      await type(element, SENTINEL.slice(0, -1));
      expect(session.current.pressKey.mock.calls).toEqual([['Backspace'], ['Backspace'], ['Backspace']]);
      expect(element.value).toBe(SENTINEL);
    });

    it('follows the caret when the keyboard leaves it inside the sentinel after a reset (Gboard)', async () => {
      const { wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-keyboard"]').trigger('click');
      const element = input(wrapper);
      // Backspace; the keyboard then puts the caret at 31 of the reset sentinel.
      await type(element, SENTINEL.slice(0, -1));
      element.setSelectionRange(SENTINEL.length - 1, SENTINEL.length - 1);
      // A letter typed there lands before the sentinel's last character: only the letter is sent.
      await type(element, `${SENTINEL.slice(0, -1)}d_`, SENTINEL.length);
      element.setSelectionRange(SENTINEL.length - 1, SENTINEL.length - 1);
      // And Backspace there is still one Backspace.
      await type(element, SENTINEL.slice(0, -1), SENTINEL.length - 2);
      expect(session.current.pressKey.mock.calls).toEqual([['Backspace'], ['Backspace']]);
      expect(session.current.typeText.mock.calls).toEqual([['d']]);
      expect(element.value).toBe(SENTINEL);
    });

    it('sends a composition letter by letter as it grows, corrects a replaced word, and resets when it ends', async () => {
      const { wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-keyboard"]').trigger('click');
      const element = input(wrapper);
      element.dispatchEvent(new CompositionEvent('compositionstart'));
      await type(element, `${SENTINEL}h`);
      await type(element, `${SENTINEL}he`);
      await type(element, `${SENTINEL}hte`);
      expect(element.value).toBe(`${SENTINEL}hte`);
      expect(session.current.typeText.mock.calls).toEqual([['h'], ['e'], ['te']]);
      expect(session.current.pressKey.mock.calls).toEqual([['Backspace']]);
      element.value = `${SENTINEL}hte `;
      element.dispatchEvent(new CompositionEvent('compositionend'));
      await flushPromises();
      expect(session.current.typeText).toHaveBeenLastCalledWith(' ');
      expect(element.value).toBe(SENTINEL);
    });
  });

  describe('full screen (REQ-S3-3)', () => {
    it('hides the bars; in View only one tap shows them again', async () => {
      const { router, wrapper } = await mountView();
      session.current.connectionStatus.value = 'connected';
      await flushPromises();
      await wrapper.get('[data-testid="mobile-node-desktop-full-screen"]').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.query).toEqual({ screen: 'desktop', full: '1' });
      expect(wrapper.find('[data-testid="mobile-screen-bar"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="mobile-node-desktop-handle"]').exists()).toBe(false);

      vi.useFakeTimers();
      const layer = wrapper.get('[data-testid="mobile-node-desktop-gestures"]').element as HTMLElement;
      vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 225 } as DOMRect);
      layer.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, cancelable: true }));
      layer.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 100, cancelable: true }));
      vi.advanceTimersByTime(DOUBLE_TAP_MS);
      vi.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await flushPromises();
      expect(router.currentRoute.value.query).toEqual({ screen: 'desktop' });
    });

    it('in Control a tap is the desktop\'s, so a handle outside the canvas shows the controls', async () => {
      const { router, wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-full-screen"]').trigger('click');
      await flushPromises();
      expect(wrapper.find('[data-testid="mobile-node-desktop-gestures"]').exists()).toBe(false);
      const handle = wrapper.get('[data-testid="mobile-node-desktop-handle"]');
      expect(handle.element.closest('canvas')).toBeNull();
      await handle.trigger('click');
      await new Promise((resolve) => setTimeout(resolve, 20));
      await flushPromises();
      expect(router.currentRoute.value.query).toEqual({ screen: 'desktop' });
      expect(wrapper.find('[data-testid="mobile-screen-bar"]').exists()).toBe(true);
    });
  });

  describe('clipboard (autobyteus-426 REQ-005, AC-005)', () => {
    const sheet = () => document.body.querySelector('[data-testid="mobile-node-desktop-clipboard"]');
    const inSheet = (testId: string) => document.body.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

    it('offers Clipboard next to Keyboard in Control only while connected', async () => {
      const { wrapper } = await mountView();
      session.current.connectionStatus.value = 'connected';
      await flushPromises();
      expect(wrapper.find('[data-testid="mobile-node-desktop-clipboard-open"]').exists()).toBe(false);

      session.current.mode.value = 'control';
      await flushPromises();
      expect(wrapper.get('[data-testid="mobile-node-desktop-clipboard-open"]').text()).toBe('Clipboard');

      session.current.connectionStatus.value = 'connecting';
      await flushPromises();
      expect(wrapper.find('[data-testid="mobile-node-desktop-clipboard-open"]').exists()).toBe(false);
    });

    it('opens the sheet without touching the phone clipboard; Copy waits for the desktop', async () => {
      const readText = vi.fn();
      const writeText = vi.fn();
      vi.stubGlobal('navigator', { ...navigator, clipboard: { readText, writeText } });
      const { wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-clipboard-open"]').trigger('click');
      await flushPromises();

      expect(sheet()).not.toBeNull();
      expect(inSheet('mobile-node-desktop-clipboard-empty')!.textContent).toBe('Copy something on the desktop first.');
      expect(inSheet('mobile-node-desktop-clipboard-copy-button')!.hasAttribute('disabled')).toBe(true);
      expect(inSheet('mobile-node-desktop-clipboard-send')!.hasAttribute('disabled')).toBe(true);
      expect(readText).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('sends pasted text to the desktop clipboard and closes', async () => {
      const { wrapper } = await inControl();
      await wrapper.get('[data-testid="mobile-node-desktop-clipboard-open"]').trigger('click');
      await flushPromises();
      const input = inSheet('mobile-node-desktop-clipboard-paste-input') as HTMLTextAreaElement;
      input.value = 'from my phone';
      input.dispatchEvent(new Event('input'));
      await flushPromises();
      inSheet('mobile-node-desktop-clipboard-send')!.click();
      await flushPromises();

      expect(session.current.sendClipboardText).toHaveBeenCalledWith('from my phone');
      expect(sheet()).toBeNull();
    });

    it('copies the desktop text on a tap, with the selection copy where the async clipboard is missing', async () => {
      vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
      const execCommand = vi.fn(() => true);
      Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
      const { wrapper } = await inControl();
      session.current.remoteClipboardText.value = 'copied on the desktop';
      await wrapper.get('[data-testid="mobile-node-desktop-clipboard-open"]').trigger('click');
      await flushPromises();
      expect(inSheet('mobile-node-desktop-clipboard-remote-text')!.textContent).toBe('copied on the desktop');
      expect(execCommand).not.toHaveBeenCalled();

      inSheet('mobile-node-desktop-clipboard-copy-button')!.click();
      await flushPromises();
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(inSheet('mobile-node-desktop-clipboard-copy-button')!.textContent!.trim()).toBe('Copied');
      vi.unstubAllGlobals();
    });

    it('shows the text selectable with a long-press hint when the phone refuses the copy', async () => {
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => { throw new Error('NotAllowed'); }) } });
      Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
      const { wrapper } = await inControl();
      session.current.remoteClipboardText.value = 'secret-free text';
      await wrapper.get('[data-testid="mobile-node-desktop-clipboard-open"]').trigger('click');
      await flushPromises();
      inSheet('mobile-node-desktop-clipboard-copy-button')!.click();
      await flushPromises();

      expect(inSheet('mobile-node-desktop-clipboard-fallback')!.textContent!.trim()).toBe('Long-press the text to copy it.');
      expect(inSheet('mobile-node-desktop-clipboard-remote-text')!.className).toContain('select-text');
      vi.unstubAllGlobals();
    });
  });

  it('ends the stream when it leaves', async () => {
    const { wrapper } = await mountView();
    wrapper.unmount();
    expect(session.current.disconnect).toHaveBeenCalled();
  });
});
