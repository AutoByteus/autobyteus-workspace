import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import ContextFilePathInputArea from '../ContextFilePathInputArea.vue';

type MockContextFilePath = {
  path: string;
  type: 'Text' | 'Image' | 'Audio' | 'Video';
};

type MockAgentContext = {
  contextId: string;
  requirement: string;
  contextFilePaths: MockContextFilePath[];
};

const createContext = (contextId: string): MockAgentContext => ({
  contextId,
  requirement: '',
  contextFilePaths: [],
});

const activeContextStoreMock = reactive({
  activeAgentContext: createContext('ctx-1') as MockAgentContext | null,
  currentContextPaths: [] as MockContextFilePath[],
  addContextFilePath: vi.fn(),
  addContextFilePathForContext: vi.fn(),
  removeContextFilePath: vi.fn(),
  removeContextFilePathForContext: vi.fn(),
  clearContextFilePaths: vi.fn(),
  clearContextFilePathsForContext: vi.fn(),
});

const fileUploadStoreMock = reactive({
  uploadFile: vi.fn(),
});

const windowNodeContextStoreMock = reactive({
  isEmbeddedWindow: true,
});

const fileExplorerStoreMock = reactive({
  openFile: vi.fn(),
});

const workspaceStoreMock = reactive({
  activeWorkspace: { workspaceId: 'ws-1' },
});

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => activeContextStoreMock,
}));

vi.mock('~/stores/fileUploadStore', () => ({
  useFileUploadStore: () => fileUploadStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/fileExplorer', () => ({
  useFileExplorerStore: () => fileExplorerStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/utils/serverConfig', () => ({
  getServerBaseUrl: () => 'http://127.0.0.1:29695',
  getServerUrls: () => ({ rest: 'http://127.0.0.1:29695/rest' }),
}));

describe('ContextFilePathInputArea', () => {
  const selectContext = (context: MockAgentContext | null) => {
    activeContextStoreMock.activeAgentContext = context;
    activeContextStoreMock.currentContextPaths = context?.contextFilePaths ?? [];
  };

  beforeEach(() => {
    vi.clearAllMocks();

    activeContextStoreMock.addContextFilePath.mockImplementation((filePath: MockContextFilePath) => {
      const context = activeContextStoreMock.activeAgentContext;
      if (!context) {
        return;
      }
      context.contextFilePaths.push(filePath);
      activeContextStoreMock.currentContextPaths = context.contextFilePaths;
    });
    activeContextStoreMock.addContextFilePathForContext.mockImplementation(
      (context: MockAgentContext | null, filePath: MockContextFilePath) => {
        if (!context) {
          return;
        }
        context.contextFilePaths.push(filePath);
        if (activeContextStoreMock.activeAgentContext === context) {
          activeContextStoreMock.currentContextPaths = context.contextFilePaths;
        }
      },
    );
    activeContextStoreMock.removeContextFilePath.mockImplementation((index: number) => {
      const context = activeContextStoreMock.activeAgentContext;
      if (!context || index < 0) {
        return;
      }
      context.contextFilePaths.splice(index, 1);
      activeContextStoreMock.currentContextPaths = context.contextFilePaths;
    });
    activeContextStoreMock.removeContextFilePathForContext.mockImplementation(
      (context: MockAgentContext | null, index: number) => {
        if (!context || index < 0) {
          return;
        }
        context.contextFilePaths.splice(index, 1);
        if (activeContextStoreMock.activeAgentContext === context) {
          activeContextStoreMock.currentContextPaths = context.contextFilePaths;
        }
      },
    );
    activeContextStoreMock.clearContextFilePaths.mockImplementation(() => {
      const context = activeContextStoreMock.activeAgentContext;
      if (!context) {
        return;
      }
      context.contextFilePaths = [];
      activeContextStoreMock.currentContextPaths = context.contextFilePaths;
    });
    activeContextStoreMock.clearContextFilePathsForContext.mockImplementation(
      (context: MockAgentContext | null) => {
        if (!context) {
          return;
        }
        context.contextFilePaths = [];
        if (activeContextStoreMock.activeAgentContext === context) {
          activeContextStoreMock.currentContextPaths = context.contextFilePaths;
        }
      },
    );

    selectContext(createContext('ctx-1'));
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    workspaceStoreMock.activeWorkspace = { workspaceId: 'ws-1' };
    (window as any).electronAPI = {};
  });

  it('renders image thumbnail for absolute local image path in embedded Electron runtime', () => {
    const context = createContext('ctx-thumb');
    context.contextFilePaths.push({ path: '/tmp/test-image.png', type: 'Image' });
    selectContext(context);

    const wrapper = mount(ContextFilePathInputArea, {
      global: {
        stubs: {
          FullScreenImageModal: true,
        },
      },
    });

    const img = wrapper.find('img.context-image-thumbnail');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('local-file:///tmp/test-image.png');
  });

  it('keeps async uploads with the member that started them when focus changes', async () => {
    const architectureContext = createContext('ctx-architecture');
    const apiE2eContext = createContext('ctx-api-e2e');
    selectContext(architectureContext);

    let resolveUpload: ((path: string) => void) | null = null;
    fileUploadStoreMock.uploadFile.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:architecture-upload');

    const wrapper = mount(ContextFilePathInputArea, {
      global: {
        stubs: {
          FullScreenImageModal: true,
        },
      },
    });

    const input = wrapper.find('input[type="file"]');
    const file = new File(['image-data'], 'diagram.png', { type: 'image/png' });
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    });

    await input.trigger('change');
    await nextTick();

    expect(architectureContext.contextFilePaths).toEqual([
      { path: 'blob:architecture-upload', type: 'Image' },
    ]);

    selectContext(apiE2eContext);
    await nextTick();

    resolveUpload?.('/uploaded/diagram.png');
    await flushPromises();

    expect(architectureContext.contextFilePaths).toEqual([
      { path: '/uploaded/diagram.png', type: 'Image' },
    ]);
    expect(apiE2eContext.contextFilePaths).toEqual([]);

    createObjectUrlSpy.mockRestore();
  });
});
