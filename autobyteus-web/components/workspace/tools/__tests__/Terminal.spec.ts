import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

const {
  fitAddonInstances,
  sessionMock,
  sessionOptions,
  terminalConstructorSpy,
  terminalInstances,
  workspaceStoreState,
} = vi.hoisted(() => ({
  fitAddonInstances: [] as Array<{ fit: ReturnType<typeof vi.fn> }>,
  sessionMock: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    errorMessage: { value: '' },
    isConnected: { value: false },
    onOutput: vi.fn(),
    sendInput: vi.fn(),
    sendResize: vi.fn(),
  },
  sessionOptions: [] as any[],
  terminalConstructorSpy: vi.fn(),
  terminalInstances: [] as Array<{
    dispose: ReturnType<typeof vi.fn>;
    loadAddon: ReturnType<typeof vi.fn>;
    onData: ReturnType<typeof vi.fn>;
    onResize: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
    options: Record<string, unknown>;
    write: ReturnType<typeof vi.fn>;
    writeln: ReturnType<typeof vi.fn>;
  }>,
  workspaceStoreState: {
    activeWorkspaceMetadata: {
      workspaceId: 'workspace-1',
      workspaceRootPath: '/tmp/workspace-1',
      displayName: 'workspace-1',
      kind: 'filesystem',
    },
    ensureWorkspaceMetadata: vi.fn(async () => ({ workspaceId: 'workspace-1' })),
  },
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: class MockTerminal {
    options: Record<string, unknown>;
    loadAddon = vi.fn();
    open = vi.fn();
    onData = vi.fn();
    onResize = vi.fn();
    write = vi.fn();
    writeln = vi.fn();
    dispose = vi.fn();

    constructor(options: Record<string, unknown>) {
      this.options = { ...options };
      terminalConstructorSpy(this.options);
      terminalInstances.push(this);
    }
  },
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn();

    constructor() {
      fitAddonInstances.push(this);
    }
  },
}));

vi.mock('~/composables/useTerminalSession', () => ({
  useTerminalSession: (options: unknown) => {
    sessionOptions.push(options);
    return sessionMock;
  },
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreState,
}));

describe('Terminal.vue', () => {
  let TerminalComponent: typeof import('../Terminal.vue').default;
  let useAppFontSizeStore: typeof import('~/stores/appFontSizeStore').useAppFontSizeStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    terminalInstances.length = 0;
    fitAddonInstances.length = 0;
    sessionOptions.length = 0;
    sessionMock.errorMessage.value = '';
    sessionMock.isConnected.value = false;
    workspaceStoreState.activeWorkspaceMetadata = {
      workspaceId: 'workspace-1',
      workspaceRootPath: '/tmp/workspace-1',
      displayName: 'workspace-1',
      kind: 'filesystem',
    };
    workspaceStoreState.ensureWorkspaceMetadata.mockResolvedValue({ workspaceId: 'workspace-1' });

    setActivePinia(createPinia());

    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as typeof ResizeObserver;

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 1024;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return 768;
      },
    });

    TerminalComponent = (await import('../Terminal.vue')).default;
    ({ useAppFontSizeStore } = await import('~/stores/appFontSizeStore'));
  });

  it('initializes xterm with the default app font size and connects from active workspace metadata', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(TerminalComponent, {
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });

    await nextTick();
    await nextTick();
    await flushPromises();

    expect(terminalConstructorSpy).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 14 }));
    expect(terminalInstances).toHaveLength(1);
    expect(sessionMock.connect).toHaveBeenCalledTimes(1);
    expect(sessionOptions[0].target.value).toMatchObject({
      rootPath: '/tmp/workspace-1',
      workspaceId: 'workspace-1',
      displayName: 'workspace-1',
    });
    expect(workspaceStoreState.ensureWorkspaceMetadata).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('uses an explicit root-path terminal target without workspace activation', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(TerminalComponent, {
      props: {
        target: {
          rootPath: '/tmp/explicit-terminal-root',
          workspaceId: 'explicit_ws',
          displayName: 'Explicit root',
        },
      },
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });

    await nextTick();
    await nextTick();
    await flushPromises();

    expect(sessionOptions[0].target.value).toMatchObject({
      rootPath: '/tmp/explicit-terminal-root',
      workspaceId: 'explicit_ws',
      displayName: 'Explicit root',
    });
    expect(sessionMock.connect).toHaveBeenCalledTimes(1);
    expect(workspaceStoreState.ensureWorkspaceMetadata).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('updates the xterm font size and refits the layout when the preset changes', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const appFontSizeStore = useAppFontSizeStore();
    appFontSizeStore.initialize();

    const wrapper = mount(TerminalComponent, {
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });

    await nextTick();
    await nextTick();
    await flushPromises();

    expect(terminalInstances).toHaveLength(1);
    expect(fitAddonInstances).toHaveLength(1);

    const fitCallCountBeforeChange = fitAddonInstances[0].fit.mock.calls.length;

    appFontSizeStore.setPreset('extra-large');
    await nextTick();
    await nextTick();

    expect(terminalInstances[0].options.fontSize).toBe(18);
    expect(fitAddonInstances[0].fit.mock.calls.length).toBeGreaterThan(fitCallCountBeforeChange);

    wrapper.unmount();
  });
});
