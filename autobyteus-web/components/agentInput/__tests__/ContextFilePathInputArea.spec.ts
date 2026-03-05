import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ContextFilePathInputArea from '../ContextFilePathInputArea.vue';

const { activeContextStoreMock, fileUploadStoreMock, windowNodeContextStoreMock, fileExplorerStoreMock, workspaceStoreMock } = vi.hoisted(() => ({
  activeContextStoreMock: {
    activeAgentContext: { contextId: 'ctx-1' },
    currentContextPaths: [] as Array<{ path: string; type: 'Text' | 'Image' | 'Audio' | 'Video' }>,
    addContextFilePath: vi.fn(),
    removeContextFilePath: vi.fn(),
    clearContextFilePaths: vi.fn(),
  },
  fileUploadStoreMock: {
    uploadFile: vi.fn(),
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
  fileExplorerStoreMock: {
    openFile: vi.fn(),
  },
  workspaceStoreMock: {
    activeWorkspace: { workspaceId: 'ws-1' },
  },
}));

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
  getServerBaseUrl: () => 'http://localhost:29695',
  getServerUrls: () => ({ rest: 'http://localhost:29695/rest' }),
}));

describe('ContextFilePathInputArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeContextStoreMock.activeAgentContext = { contextId: 'ctx-1' };
    activeContextStoreMock.currentContextPaths = [];
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    workspaceStoreMock.activeWorkspace = { workspaceId: 'ws-1' };
    (window as any).electronAPI = {};
  });

  it('renders image thumbnail for absolute local image path in embedded Electron runtime', () => {
    activeContextStoreMock.currentContextPaths = [{ path: '/tmp/test-image.png', type: 'Image' }];

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
});
