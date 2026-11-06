import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { useNodeDesktopConnection } from '../useNodeDesktopConnection';
import type { NodeDesktopStreamEnd } from '~/utils/nodeDesktopClient';

const fakeSession = () => {
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const streamEnd = ref<NodeDesktopStreamEnd | null>(null);
  return {
    connectionStatus,
    streamEnd,
    isConnected: computed(() => connectionStatus.value === 'connected'),
    isConnecting: computed(() => connectionStatus.value === 'connecting'),
    setContainer: vi.fn(),
    refreshViewport: vi.fn(),
    connect: vi.fn(() => { connectionStatus.value = 'connecting'; }),
    disconnect: vi.fn(() => { connectionStatus.value = 'disconnected'; }),
    switchMode: vi.fn(),
  };
};

let visibility: DocumentVisibilityState = 'visible';
const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
};

const mountPolicy = async (width = 400) => {
  const session = fakeSession();
  let policy!: ReturnType<typeof useNodeDesktopConnection>;
  const wrapper = mount(defineComponent({
    setup() {
      const screen = ref<HTMLElement | null>(null);
      policy = useNodeDesktopConnection(session as never, screen);
      return () => h('div', { ref: screen, style: `width:${width}px` });
    },
  }), { attachTo: document.body });
  await flushPromises();
  return { session, policy, wrapper };
};

describe('useNodeDesktopConnection', () => {
  let width = 400;
  beforeEach(() => {
    visibility = 'visible';
    width = 400;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => (width ? 225 : 0));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('connects View only on mount, ends on hidden and reconnects View only on visible (REQ-016)', async () => {
    const { session, wrapper } = await mountPolicy();
    expect(session.setContainer).toHaveBeenCalledTimes(1);
    expect(session.connect).toHaveBeenLastCalledWith('view');
    session.connectionStatus.value = 'connected';

    setVisibility('hidden');
    expect(session.disconnect).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    expect(session.connect).toHaveBeenCalledTimes(2);
    expect(session.connect).toHaveBeenLastCalledWith('view');

    wrapper.unmount();
    expect(session.disconnect).toHaveBeenCalledTimes(2);
  });

  it('waits for a screen with a size before it connects', async () => {
    width = 0;
    const { session } = await mountPolicy(0);
    expect(session.connect).not.toHaveBeenCalled();
  });

  it('does not come back after the user stopped the stream', async () => {
    const { session, policy } = await mountPolicy();
    session.connectionStatus.value = 'connected';
    policy.stop();
    session.connect.mockClear();
    setVisibility('hidden');
    setVisibility('visible');
    expect(session.connect).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'connect'],
    [{ state: 'closed', messageKey: 'x' }, 'connect'],
    [{ state: 'disconnected', messageKey: 'x' }, 'reconnect'],
    [{ state: 'unreachable', messageKey: 'x' }, 'reconnect'],
    [{ state: 'too-many', messageKey: 'x' }, 'retry'],
    [{ state: 'not-allowed', messageKey: 'x' }, null],
    [{ state: 'unavailable', messageKey: 'x' }, null],
  ] as const)('offers %o → %s when no stream is open', async (end, offer) => {
    const { session, policy } = await mountPolicy();
    session.connectionStatus.value = 'disconnected';
    session.streamEnd.value = end as NodeDesktopStreamEnd | null;
    expect(policy.offer.value).toBe(offer);
    session.connectionStatus.value = 'connected';
    expect(policy.offer.value).toBeNull();
  });

  it('Retry and Reconnect open View only', async () => {
    const { session, policy } = await mountPolicy();
    session.connectionStatus.value = 'disconnected';
    session.streamEnd.value = { state: 'too-many', messageKey: 'x' };
    session.connect.mockClear();
    policy.openViewOnly();
    expect(session.connect).toHaveBeenCalledWith('view');
  });
});
