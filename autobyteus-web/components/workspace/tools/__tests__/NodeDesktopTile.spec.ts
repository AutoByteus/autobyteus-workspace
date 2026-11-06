import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import NodeDesktopTile from '../NodeDesktopTile.vue';
import type { NodeDesktopStreamEnd } from '~/utils/nodeDesktopClient';

const session = vi.hoisted(() => ({ current: null as any }));

vi.mock('~/composables/useVncSession', () => ({ useVncSession: () => session.current }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));

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
    connect: vi.fn((next: 'view' | 'control' = 'view') => {
      mode.value = next;
      streamEnd.value = null;
      connectionStatus.value = 'connecting';
    }),
    disconnect: vi.fn(() => {
      connectionStatus.value = 'disconnected';
      streamEnd.value = null;
    }),
    switchMode: vi.fn(),
  };
};

let visibility: DocumentVisibilityState = 'visible';
const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
};

const mountTile = async () => {
  const wrapper = mount(NodeDesktopTile, {
    attachTo: document.body,
    global: { stubs: { Icon: true, Teleport: true }, mocks: { $t: (key: string) => key } },
  });
  await flushPromises();
  return wrapper;
};

describe('NodeDesktopTile', () => {
  beforeEach(() => {
    session.current = makeSession();
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(675);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('opens a View only stream when it mounts in a visible window', async () => {
    const wrapper = await mountTile();
    expect(session.current.setContainer).toHaveBeenCalledTimes(1);
    expect(session.current.connect).toHaveBeenCalledWith('view');
    wrapper.unmount();
    expect(session.current.disconnect).toHaveBeenCalled();
  });

  it('opens no stream while the window is hidden, and opens one when it becomes visible', async () => {
    visibility = 'hidden';
    await mountTile();
    expect(session.current.connect).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(session.current.connect).toHaveBeenCalledWith('view');
  });

  it('ends the stream when the window is hidden and reconnects in View only when it is visible again', async () => {
    await mountTile();
    session.current.connectionStatus.value = 'connected';
    session.current.mode.value = 'control';
    session.current.connect.mockClear();

    setVisibility('hidden');
    expect(session.current.disconnect).toHaveBeenCalledTimes(1);
    expect(session.current.connect).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(session.current.connect).toHaveBeenCalledTimes(1);
    expect(session.current.connect).toHaveBeenCalledWith('view');
  });

  it('does not reconnect on visibility after the user disconnected', async () => {
    const wrapper = await mountTile();
    session.current.connectionStatus.value = 'connected';
    await flushPromises();
    await wrapper.get('[data-testid="node-desktop-disconnect"]').trigger('click');
    session.current.connect.mockClear();

    setVisibility('hidden');
    setVisibility('visible');
    expect(session.current.connect).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="node-desktop-connect"]').text())
      .toBe('workspace.components.workspace.tools.NodeDesktopTile.connect');
  });

  it('switches mode with the mode button and shows the current mode', async () => {
    const wrapper = await mountTile();
    session.current.connectionStatus.value = 'connected';
    await flushPromises();

    const modeButton = wrapper.get('[data-testid="node-desktop-mode"]');
    expect(modeButton.text()).toBe('workspace.components.workspace.tools.NodeDesktopTile.view_only');
    expect(wrapper.get('[data-testid="node-desktop-status"]').text())
      .toBe('workspace.components.workspace.tools.NodeDesktopTile.connected_view_only');
    await modeButton.trigger('click');
    expect(session.current.switchMode).toHaveBeenCalledWith('control');

    session.current.mode.value = 'control';
    await flushPromises();
    expect(wrapper.get('[data-testid="node-desktop-mode"]').text())
      .toBe('workspace.components.workspace.tools.NodeDesktopTile.control');
    await wrapper.get('[data-testid="node-desktop-mode"]').trigger('click');
    expect(session.current.switchMode).toHaveBeenLastCalledWith('view');
  });

  it('offers Reconnect after the node desktop disconnected, and it opens View only', async () => {
    const wrapper = await mountTile();
    session.current.connectionStatus.value = 'disconnected';
    session.current.streamEnd.value = {
      state: 'disconnected',
      messageKey: 'workspace.components.workspace.tools.NodeDesktopTile.desktop_disconnected',
    };
    session.current.mode.value = 'control';
    session.current.connect.mockClear();
    await flushPromises();

    expect(wrapper.get('[data-testid="node-desktop-status"]').text())
      .toBe('workspace.components.workspace.tools.NodeDesktopTile.desktop_disconnected');
    const reconnect = wrapper.get('[data-testid="node-desktop-connect"]');
    expect(reconnect.text()).toBe('workspace.components.workspace.tools.NodeDesktopTile.reconnect');
    await reconnect.trigger('click');
    expect(session.current.connect).toHaveBeenCalledWith('view');
  });

  it('offers no Connect when the viewer is not allowed or the node has no shared desktop', async () => {
    const wrapper = await mountTile();
    session.current.connectionStatus.value = 'disconnected';
    for (const end of [
      { state: 'not-allowed', messageKey: 'workspace.components.workspace.tools.NodeDesktopTile.not_allowed' },
      { state: 'unavailable', messageKey: 'workspace.components.workspace.tools.NodeDesktopTile.no_shared_desktop' },
    ] as const) {
      session.current.streamEnd.value = end;
      await flushPromises();
      expect(wrapper.find('[data-testid="node-desktop-connect"]').exists()).toBe(false);
      expect(wrapper.get('[data-testid="node-desktop-status"]').text()).toBe(end.messageKey);
    }
  });
});
