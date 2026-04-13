import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import ContextFilePathInputArea from '../ContextFilePathInputArea.vue';
import type { ContextAttachment } from '~/types/conversation';
import {
  createUploadedContextAttachment,
  createWorkspaceContextAttachment,
} from '~/utils/contextFiles/contextAttachmentModel';

type MockAgentContext = {
  config: { workspaceId: string | null };
  requirement: string;
  contextFilePaths: ContextAttachment[];
  state: { runId: string };
};

const createContext = (runId: string): MockAgentContext => ({
  config: { workspaceId: 'ws-1' },
  requirement: '',
  contextFilePaths: [],
  state: { runId },
});

const activeContextStoreMock = reactive({
  activeAgentContext: createContext('temp-agent-1') as MockAgentContext | null,
  currentContextPaths: [] as ContextAttachment[],
  addContextFilePathForContext: vi.fn(),
  removeContextFilePathForContext: vi.fn(),
});

const agentContextsStoreMock = reactive({
  activeRun: activeContextStoreMock.activeAgentContext as MockAgentContext | null,
});

const agentSelectionStoreMock = reactive({
  selectedType: 'agent' as 'agent' | 'team' | null,
});

const agentTeamContextsStoreMock = reactive({
  activeTeamContext: null as null,
});

const contextFileUploadStoreMock = reactive({
  isUploading: false,
  uploadAttachment: vi.fn(),
  deleteDraftAttachment: vi.fn(),
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

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => agentContextsStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => agentSelectionStoreMock,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => agentTeamContextsStoreMock,
}));

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => contextFileUploadStoreMock,
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

describe('ContextFilePathInputArea', () => {
  const selectContext = (context: MockAgentContext | null) => {
    activeContextStoreMock.activeAgentContext = context;
    activeContextStoreMock.currentContextPaths = context?.contextFilePaths ?? [];
    agentContextsStoreMock.activeRun = context;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    activeContextStoreMock.addContextFilePathForContext.mockImplementation(
      (context: MockAgentContext | null, attachment: ContextAttachment) => {
        if (!context) {
          return;
        }
        context.contextFilePaths.push(attachment);
        if (activeContextStoreMock.activeAgentContext === context) {
          activeContextStoreMock.currentContextPaths = context.contextFilePaths;
        }
      },
    );

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

    selectContext(createContext('temp-agent-1'));
    agentSelectionStoreMock.selectedType = 'agent';
    contextFileUploadStoreMock.isUploading = false;
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    workspaceStoreMock.activeWorkspace = { workspaceId: 'ws-1' };
    (window as any).electronAPI = {};
  });

  it('renders an image thumbnail for an absolute workspace image path in embedded Electron runtime', () => {
    const context = createContext('temp-agent-thumb');
    context.contextFilePaths.push(createWorkspaceContextAttachment('/tmp/test-image.png', 'Image'));
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
    const architectureContext = createContext('temp-architecture');
    const apiE2eContext = createContext('temp-api-e2e');
    selectContext(architectureContext);

    let resolveUpload: ((attachment: ContextAttachment) => void) | null = null;
    contextFileUploadStoreMock.uploadAttachment.mockImplementation(
      () =>
        new Promise<ContextAttachment>((resolve) => {
          resolveUpload = resolve;
        }),
    );

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

    expect(architectureContext.contextFilePaths).toEqual([]);

    selectContext(apiE2eContext);
    await nextTick();

    resolveUpload?.(
      createUploadedContextAttachment({
        storedFilename: 'ctx_uploadtoken__diagram.png',
        locator: '/rest/drafts/agent-runs/temp-architecture/context-files/ctx_uploadtoken__diagram.png',
        displayName: 'diagram.png',
        phase: 'draft',
        type: 'Image',
      }),
    );
    await flushPromises();

    expect(architectureContext.contextFilePaths).toEqual([
      expect.objectContaining({
        kind: 'uploaded',
        locator: '/rest/drafts/agent-runs/temp-architecture/context-files/ctx_uploadtoken__diagram.png',
        displayName: 'diagram.png',
      }),
    ]);
    expect(apiE2eContext.contextFilePaths).toEqual([]);
    expect(contextFileUploadStoreMock.uploadAttachment).toHaveBeenCalledWith({
      owner: { kind: 'agent_draft', draftRunId: 'temp-architecture' },
      file,
    });
  });

  it('deletes draft uploads immediately when the user removes them from the composer', async () => {
    const context = createContext('temp-agent-delete');
    const draftAttachment = createUploadedContextAttachment({
      storedFilename: 'ctx_remove__notes.txt',
      locator: '/rest/drafts/agent-runs/temp-agent-delete/context-files/ctx_remove__notes.txt',
      displayName: 'notes.txt',
      phase: 'draft',
      type: 'Text',
    });
    context.contextFilePaths.push(draftAttachment);
    selectContext(context);

    const wrapper = mount(ContextFilePathInputArea, {
      global: {
        stubs: {
          FullScreenImageModal: true,
        },
      },
    });

    const removeButtons = wrapper.findAll('button[aria-label="Remove file"]');
    await removeButtons[0]?.trigger('click');
    await flushPromises();

    expect(contextFileUploadStoreMock.deleteDraftAttachment).toHaveBeenCalledWith({
      owner: { kind: 'agent_draft', draftRunId: 'temp-agent-delete' },
      attachment: draftAttachment,
    });
    expect(context.contextFilePaths).toEqual([]);
  });
});
