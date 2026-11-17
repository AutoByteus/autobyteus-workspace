import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withActiveComposerTarget } from '~/test-support/activeComposerTargetHarness'
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import ContextFilePathInputArea from '../ContextFilePathInputArea.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { ContextFileUploadError } from '~/utils/contextFiles/contextFileUploadFailure';
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

/** A delegated child's own team run and member address (a team-copy member), CR-461-106. */
const CHILD_TEAM = 'child-team'
const CHILD_MEMBER = '/software_engineering_team/implementation_engineer'
const activeContextStoreMock = reactive({
  activeAgentContext: createContext('temp-agent-1') as MockAgentContext | null,
  /** A delegated child of a standalone run (Agent copy or Team-copy member), when set. */
  delegatedChild: null as null | {
    kind: 'agent_run_task_agent' | 'agent_run_task_team_member';
    runId: string;
    access: 'live' | 'read_only';
  },
  get activeWorkspaceTarget(): any {
    const context = this.activeAgentContext;
    if (!context) return null;
    if (this.delegatedChild) {
      // Its own run (rule 2): an agent run, or a member of its own team run (CR-461-106).
      return {
        kind: this.delegatedChild.kind,
        context,
        access: this.delegatedChild.access,
        viewRun: { runId: this.delegatedChild.runId },
        address: CHILD_MEMBER,
        agentRunId: context.state.runId,
        browse: this.delegatedChild.kind === 'agent_run_task_agent' ? { kind: 'run', runId: context.state.runId }
          : { kind: 'teamMember', teamRunId: CHILD_TEAM, memberAddress: CHILD_MEMBER, agentRunId: context.state.runId },
      };
    }
    if (agentSelectionStoreMock.selectedType === 'agent' && agentContextsStoreMock.activeRun === context) {
      return { kind: 'standalone_agent', context, access: 'live', browse: { kind: 'run', runId: context.state.runId } };
    }
    const team = agentTeamContextsStoreMock.activeTeamContext;
    return agentSelectionStoreMock.selectedType === 'team' && team && agentTeamContextsStoreMock.activeExecutionFocusedMemberContext === context
      ? { kind: 'standalone_team_member', context, access: 'live', team: {
        rootRunId: team.view.getRootTeamRunId(), focusedMemberAddress: team.view.getFocusedMemberAddress(),
      }, browse: { kind: 'teamMember', teamRunId: team.view.getRootTeamRunId(), memberAddress: team.view.getFocusedMemberAddress(),
        agentRunId: context.state.runId } } : null;
  },
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
  activeTeamContext: null as any,
  activeExecutionFocusedMemberContext: null as MockAgentContext | null,
});

const MB = 1024 * 1024;
const nodeLimits = {
  otherFileMaxBytes: 25 * MB,
  audioVideoMaxBytes: 2048 * MB,
  audioVideoMimeTypes: ['video/mp4', 'video/quicktime', 'audio/mpeg'],
};
const contextFileUploadStoreMock = reactive({
  isUploading: false,
  readSizeLimits: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteDraftAttachment: vi.fn(),
});

const windowNodeContextStoreMock = reactive({
  isEmbeddedWindow: true,
  initialized: true,
  nodeBaseUrl: 'http://127.0.0.1:31000',
  getBoundEndpoints: () => ({ rest: 'http://127.0.0.1:31000/rest' }),
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

// autobyteus-450: the phone (off by default) and the authorized object URL (the URL itself unless a test sets one).
const phone = vi.hoisted(() => ({ isPhone: false, open: vi.fn(), authorized: new Map<string, string>() }));
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => phone.isPhone }));
vi.mock('~/composables/mobile/useMobileAttachmentOpening', () => ({ useMobileAttachmentOpening: () => ({ open: phone.open }) }));
vi.mock('~/composables/useAuthorizedObjectUrl', async () => {
  const { computed, ref } = await import('vue');
  return {
    useAuthorizedObjectUrl: (source: () => string | null) => ({
      resolvedUrl: computed(() => { const url = source(); return url ? (phone.authorized.get(url) ?? url) : null; }),
      error: ref(null), refresh: vi.fn(),
    }),
  };
});

describe('ContextFilePathInputArea', () => {
  const selectContext = (context: MockAgentContext | null) => {
    activeContextStoreMock.activeAgentContext = context;
    activeContextStoreMock.currentContextPaths = context?.contextFilePaths ?? [];
    agentContextsStoreMock.activeRun = context;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

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
    activeContextStoreMock.delegatedChild = null;
    contextFileUploadStoreMock.deleteDraftAttachment.mockReset();
    contextFileUploadStoreMock.uploadAttachment.mockReset();
    contextFileUploadStoreMock.readSizeLimits.mockReset().mockResolvedValue(nodeLimits);
    agentSelectionStoreMock.selectedType = 'agent';
    agentTeamContextsStoreMock.activeTeamContext = null;
    agentTeamContextsStoreMock.activeExecutionFocusedMemberContext = null;
    contextFileUploadStoreMock.isUploading = false;
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    workspaceStoreMock.activeWorkspace = { workspaceId: 'ws-1' };
    (window as any).electronAPI = {};
  });

  it('renders an image thumbnail for an absolute workspace image path in embedded Electron runtime', () => {
    const context = createContext('temp-agent-thumb');
    context.contextFilePaths.push(createWorkspaceContextAttachment('/tmp/test-image.png', 'Image'));
    selectContext(context);

    const wrapper = mount(withActiveComposerTarget(ContextFilePathInputArea), {
      global: {
        stubs: {
          FullScreenImageModal: true,
        },
      },
    });

    const img = wrapper.find('img.context-image-thumbnail');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('local-file://local/tmp/test-image.png');
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

    const wrapper = mount(withActiveComposerTarget(ContextFilePathInputArea), {
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

    (resolveUpload as unknown as (attachment: ContextAttachment) => void)(
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
      signal: expect.any(AbortSignal),
      onProgress: expect.any(Function),
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

    const wrapper = mount(withActiveComposerTarget(ContextFilePathInputArea), {
      global: {
        stubs: {
          FullScreenImageModal: true,
        },
      },
    });

    const removeButtons = wrapper.findAll('button[aria-label="Remove file"]');
    await removeButtons[0]?.trigger('click');
    await flushPromises();

    expect(contextFileUploadStoreMock.deleteDraftAttachment).toHaveBeenCalledWith(draftAttachment);
    expect(context.contextFilePaths).toEqual([]);
  });

  it('retains failed Team draft deletions while Clear all removes independently deletable items', async () => {
    const solutionContext = createContext('team-1::solution_designer');
    const implementationContext = createContext('team-1::implementation_engineer');
    const retainedAfterFailure = createUploadedContextAttachment({
      storedFilename: 'ctx_keep__retained.txt',
      locator: '/rest/drafts/team-runs/team-1/members/%2Fsolution_designer/context-files/ctx_keep__retained.txt',
      displayName: 'retained.txt', phase: 'draft', type: 'Text',
    });
    const removable = createUploadedContextAttachment({
      storedFilename: 'ctx_remove__removable.txt',
      locator: '/rest/drafts/team-runs/team-1/members/%2Fsolution_designer/context-files/ctx_remove__removable.txt',
      displayName: 'removable.txt', phase: 'draft', type: 'Text',
    });
    solutionContext.contextFilePaths.push(retainedAfterFailure, removable);
    selectContext(solutionContext);
    agentSelectionStoreMock.selectedType = 'team';
    agentContextsStoreMock.activeRun = null;
    agentTeamContextsStoreMock.activeTeamContext = {
      view: {
        getRootTeamRunId: () => 'team-1',
        getFocusedMemberAddress: () => '/solution_designer',
      },
    };
    agentTeamContextsStoreMock.activeExecutionFocusedMemberContext = solutionContext;
    contextFileUploadStoreMock.deleteDraftAttachment.mockImplementation(
      async (attachment: ContextAttachment) => {
        if (attachment.id === retainedAfterFailure.id) throw new Error('draft delete unavailable');
      },
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const wrapper = mount(withActiveComposerTarget(ContextFilePathInputArea), {
      global: { stubs: { FullScreenImageModal: true } },
    });

    await wrapper.findAll('button[aria-label="Remove file"]')[0]?.trigger('click');
    await flushPromises();
    expect(solutionContext.contextFilePaths).toEqual([retainedAfterFailure, removable]);
    expect(wrapper.find('[role="alert"]').text()).toBe("Couldn't remove retained.txt.");

    const clearAll = wrapper.findAll('button').find((button) => button.text().includes('Clear all'));
    expect(clearAll).toBeTruthy();
    await clearAll!.trigger('click');
    await flushPromises();

    expect(solutionContext.contextFilePaths).toEqual([retainedAfterFailure]);
    expect(implementationContext.contextFilePaths).toEqual([]);
    expect(contextFileUploadStoreMock.deleteDraftAttachment).toHaveBeenCalledWith(removable);
    expect(wrapper.find('[role="alert"]').text()).toContain("Couldn't remove retained.txt.");
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it('clones pasted draft URLs into the focused team member draft owner', async () => {
    const solutionContext = createContext('team-1::solution_designer');
    const implementationContext = createContext('team-1::implementation_engineer');
    selectContext(solutionContext);
    agentSelectionStoreMock.selectedType = 'team';
    agentContextsStoreMock.activeRun = null;
    agentTeamContextsStoreMock.activeTeamContext = {
      view: {
        getRootTeamRunId: () => 'team-1',
        getFocusedMemberAddress: () => '/solution_designer',
      },
    };
    agentTeamContextsStoreMock.activeExecutionFocusedMemberContext = solutionContext;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['image-bytes'], { type: 'image/png' }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    contextFileUploadStoreMock.uploadAttachment.mockResolvedValue(
      createUploadedContextAttachment({
        storedFilename: 'ctx_solutionclone__image.png',
        locator: '/rest/drafts/team-runs/team-1/members/solution_designer/context-files/ctx_solutionclone__image.png',
        displayName: 'image.png',
        phase: 'draft',
        type: 'Image',
      }),
    );

    const wrapper = mount(withActiveComposerTarget(ContextFilePathInputArea), {
      global: {
        stubs: {
          FullScreenImageModal: true,
        },
      },
    });

    const pasteEvent = new Event('paste', { bubbles: true }) as Event & { clipboardData?: DataTransfer | null };
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        items: [],
        getData: (type: string) =>
          type === 'text/plain'
            ? '/rest/drafts/team-runs/team-1/members/implementation_engineer/context-files/ctx_implcopy__image.png'
            : '',
      },
      configurable: true,
    });
    pasteEvent.preventDefault = vi.fn();
    wrapper.find('[data-file-drop-target="true"]').element.dispatchEvent(pasteEvent);
    await nextTick();
    await flushPromises();

    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      expect.stringContaining(
        '/rest/drafts/team-runs/team-1/members/implementation_engineer/context-files/ctx_implcopy__image.png',
      ),
    );
    expect(contextFileUploadStoreMock.uploadAttachment).toHaveBeenCalledWith({
      owner: {
        kind: 'team_member_draft',
        teamDraftId: 'team-1',
        memberAddress: '/solution_designer',
      },
      file: expect.any(File),
    });
    const uploadedFile = contextFileUploadStoreMock.uploadAttachment.mock.calls[0]?.[0]?.file as File;
    expect(uploadedFile.name).toBe('image.png');
    expect(solutionContext.contextFilePaths).toEqual([
      expect.objectContaining({
        kind: 'uploaded',
        locator:
          '/rest/drafts/team-runs/team-1/members/solution_designer/context-files/ctx_solutionclone__image.png',
      }),
    ]);
    expect(solutionContext.contextFilePaths[0]?.locator).not.toContain('/implementation_engineer/');
    expect(implementationContext.contextFilePaths).toEqual([]);
  });

  describe('delegated child of a standalone run (19.png)', () => {
    const mountComposer = () => mount(withActiveComposerTarget(ContextFilePathInputArea), {
      global: { stubs: { FullScreenImageModal: true } },
    });
    /** A draft under the delegated child's own run (CR-461-106): its agent run's, or its team run member's. */
    const collaborationDraft = (storedFilename: string, displayName: string, agentRunId = 'child-run') =>
      createUploadedContextAttachment({
        storedFilename,
        locator: activeContextStoreMock.delegatedChild?.kind === 'agent_run_task_team_member'
          ? `/rest/drafts/team-runs/${agentRunId === 'child-run' ? CHILD_TEAM : 'sibling-team'}/members/${encodeURIComponent(CHILD_MEMBER)}/context-files/${storedFilename}`
          : `/rest/drafts/agent-runs/${agentRunId}/context-files/${storedFilename}`,
        displayName,
        phase: 'draft',
        type: displayName.endsWith('.png') ? 'Image' : 'Text',
      });
    const selectDelegatedChild = (
      kind: 'agent_run_task_agent' | 'agent_run_task_team_member',
      access: 'live' | 'read_only' = 'live',
    ) => {
      const context = createContext('child-run');
      selectContext(context);
      activeContextStoreMock.delegatedChild = { kind, runId: 'host-run', access };
      return context;
    };
    const pasteFiles = async (wrapper: ReturnType<typeof mountComposer>, files: File[], text = '') => {
      const pasteEvent = new Event('paste', { bubbles: true }) as Event & { clipboardData?: unknown };
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          items: files.map((file) => ({ kind: 'file', getAsFile: () => file })),
          getData: (type: string) => (type === 'text/plain' ? text : ''),
        },
        configurable: true,
      });
      wrapper.find('[data-file-drop-target="true"]').element.dispatchEvent(pasteEvent);
      await flushPromises();
    };

    it.each(['agent_run_task_agent', 'agent_run_task_team_member'] as const)(
      '%s: × deletes the server draft at its locator and removes the item',
      async (kind) => {
        const context = selectDelegatedChild(kind);
        const pasted = collaborationDraft('ctx_paste__image.png', 'image.png');
        context.contextFilePaths.push(pasted);
        contextFileUploadStoreMock.deleteDraftAttachment.mockResolvedValue(undefined);
        const wrapper = mountComposer();

        await wrapper.find('button[aria-label="Remove file"]').trigger('click');
        await flushPromises();

        expect(contextFileUploadStoreMock.deleteDraftAttachment).toHaveBeenCalledWith(pasted);
        expect(context.contextFilePaths).toEqual([]);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      },
    );

    it('uploads with + under the delegated child owner, then Clear All deletes every own draft and keeps nothing', async () => {
      const context = selectDelegatedChild('agent_run_task_team_member');
      const uploaded = collaborationDraft('ctx_plus__notes.txt', 'notes.txt');
      contextFileUploadStoreMock.uploadAttachment.mockResolvedValue(uploaded);
      contextFileUploadStoreMock.deleteDraftAttachment.mockResolvedValue(undefined);
      const pasted = collaborationDraft('ctx_paste__image.png', 'image.png');
      const pathAttachment = createWorkspaceContextAttachment('/tmp/design.md', 'Text');
      context.contextFilePaths.push(pasted, pathAttachment);
      const wrapper = mountComposer();

      const input = wrapper.find('input[type="file"]');
      const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
      await input.trigger('change');
      await flushPromises();
      expect(contextFileUploadStoreMock.uploadAttachment).toHaveBeenCalledWith({
        owner: { kind: 'team_member_draft', teamDraftId: CHILD_TEAM, memberAddress: CHILD_MEMBER },
        file,
        signal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
      });
      expect(context.contextFilePaths).toHaveLength(3);

      const clearAll = wrapper.findAll('button').find((button) => button.text().includes('Clear all'));
      await clearAll!.trigger('click');
      await flushPromises();

      expect(contextFileUploadStoreMock.deleteDraftAttachment.mock.calls.map(([attachment]) => attachment))
        .toEqual([pasted, uploaded]);
      expect(context.contextFilePaths).toEqual([]);
    });

    it('removes a delegated child draft while the child is offline or after restart (no runtime status involved)', async () => {
      const context = selectDelegatedChild('agent_run_task_agent');
      (context.state as Record<string, unknown>).currentStatus = 'shutdown_complete';
      const restored = collaborationDraft('ctx_restored__old.txt', 'old.txt');
      context.contextFilePaths.push(restored);
      contextFileUploadStoreMock.deleteDraftAttachment.mockResolvedValue(undefined);
      const wrapper = mountComposer();

      await wrapper.find('button[aria-label="Remove file"]').trigger('click');
      await flushPromises();

      expect(contextFileUploadStoreMock.deleteDraftAttachment).toHaveBeenCalledWith(restored);
      expect(context.contextFilePaths).toEqual([]);
    });

    it('removes a foreign draft locally and never deletes another composer\'s file', async () => {
      const context = selectDelegatedChild('agent_run_task_agent');
      const foreign = collaborationDraft('ctx_foreign__other.txt', 'other.txt', 'sibling-run');
      const own = collaborationDraft('ctx_own__mine.txt', 'mine.txt');
      context.contextFilePaths.push(foreign, own);
      contextFileUploadStoreMock.deleteDraftAttachment.mockResolvedValue(undefined);
      const wrapper = mountComposer();

      await wrapper.findAll('button[aria-label="Remove file"]')[0]!.trigger('click');
      await flushPromises();
      expect(contextFileUploadStoreMock.deleteDraftAttachment).not.toHaveBeenCalled();
      expect(context.contextFilePaths).toEqual([own]);

      context.contextFilePaths.unshift(foreign);
      const clearAll = wrapper.findAll('button').find((button) => button.text().includes('Clear all'));
      await clearAll!.trigger('click');
      await flushPromises();
      expect(contextFileUploadStoreMock.deleteDraftAttachment.mock.calls).toEqual([[own]]);
      expect(context.contextFilePaths).toEqual([]);
    });

    it('keeps an item whose delete fails, names it, and clears the error on the next successful removal', async () => {
      const context = selectDelegatedChild('agent_run_task_team_member');
      const first = collaborationDraft('ctx_first__first.txt', 'first.txt');
      const second = collaborationDraft('ctx_second__second.txt', 'second.txt');
      context.contextFilePaths.push(first, second);
      contextFileUploadStoreMock.deleteDraftAttachment.mockRejectedValueOnce(new Error('Failed to fetch'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const wrapper = mountComposer();

      await wrapper.findAll('button[aria-label="Remove file"]')[0]!.trigger('click');
      await flushPromises();
      expect(context.contextFilePaths).toEqual([first, second]);
      expect(wrapper.find('[role="alert"]').text()).toBe("Couldn't remove first.txt.");

      contextFileUploadStoreMock.deleteDraftAttachment.mockResolvedValue(undefined);
      await wrapper.findAll('button[aria-label="Remove file"]')[0]!.trigger('click');
      await flushPromises();
      expect(context.contextFilePaths).toEqual([second]);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      consoleError.mockRestore();
    });

    it('shows a failed upload by file name instead of silently dropping it', async () => {
      selectDelegatedChild('agent_run_task_agent');
      // The server's own text must never reach the screen (AC-009 regression of the reported message).
      contextFileUploadStoreMock.uploadAttachment.mockRejectedValue({ response: { data: { detail: 'Uploaded file is too large.' } } });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const wrapper = mountComposer();

      await pasteFiles(wrapper, [new File(['x'], 'huge.png', { type: 'image/png' })]);

      expect(wrapper.find('[role="alert"]').text()).toBe("Couldn't attach huge.png.");
      expect(wrapper.text()).not.toContain('Uploaded file is too large.');
      expect(wrapper.text()).not.toContain('Uploading');
      consoleError.mockRestore();
    });

    it('reports a pasted foreign draft that cannot be cloned as a failed attach', async () => {
      const context = selectDelegatedChild('agent_run_task_agent');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const wrapper = mountComposer();

      await pasteFiles(wrapper, [], '/rest/drafts/agent-runs/other/context-files/ctx_gone__gone.png');

      expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
      expect(context.contextFilePaths).toEqual([]);
      expect(wrapper.find('[role="alert"]').text()).toContain("Couldn't attach gone.png.");
      consoleError.mockRestore();
    });

    it('offers no upload where the target has no upload owner, but still accepts path attachments', async () => {
      const context = selectDelegatedChild('agent_run_task_agent', 'read_only');
      const ownDraft = collaborationDraft('ctx_kept__kept.txt', 'kept.txt');
      context.contextFilePaths.push(ownDraft);
      const wrapper = mountComposer();

      const plus = wrapper.find('button[aria-label="Upload files"]');
      expect(plus.attributes('disabled')).toBeDefined();
      expect(plus.attributes('title')).toBe('Uploads unavailable');
      expect(wrapper.find('input[type="file"]').attributes('disabled')).toBeDefined();

      await pasteFiles(wrapper, [new File(['x'], 'image.png', { type: 'image/png' })]);
      expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
      expect(wrapper.find('[role="alert"]').text()).toBe("This agent can't receive uploaded files right now.");

      const browserDrop = new Event('drop', { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown };
      windowNodeContextStoreMock.isEmbeddedWindow = false;
      Object.defineProperty(browserDrop, 'dataTransfer', {
        value: { getData: () => '', files: [new File(['x'], 'dropped.txt')] },
      });
      wrapper.find('[data-file-drop-target="true"]').element.dispatchEvent(browserDrop);
      await flushPromises();
      expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();

      await pasteFiles(wrapper, [], '/tmp/spec.md');
      expect(context.contextFilePaths.map((attachment) => attachment.locator)).toEqual([ownDraft.locator, '/tmp/spec.md']);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);

      // Without an upload owner, removing a draft leaves its file to the owner (24h draft cleanup).
      await wrapper.findAll('button[aria-label="Remove file"]')[0]!.trigger('click');
      await flushPromises();
      expect(contextFileUploadStoreMock.deleteDraftAttachment).not.toHaveBeenCalled();
      expect(context.contextFilePaths.map((attachment) => attachment.locator)).toEqual(['/tmp/spec.md']);
    });

    it('keeps the Electron native file drop as path attachments without an upload owner', async () => {
      const context = selectDelegatedChild('agent_run_task_agent', 'read_only');
      windowNodeContextStoreMock.isEmbeddedWindow = true;
      (window as any).electronAPI = { getPathForFile: vi.fn().mockResolvedValue('/Users/me/diagram.png') };
      const wrapper = mountComposer();

      const nativeDrop = new Event('drop', { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown };
      Object.defineProperty(nativeDrop, 'dataTransfer', {
        value: { getData: () => '', files: [new File(['x'], 'diagram.png', { type: 'image/png' })] },
      });
      wrapper.find('[data-file-drop-target="true"]').element.dispatchEvent(nativeDrop);
      await flushPromises();

      expect(context.contextFilePaths.map((attachment) => attachment.locator)).toEqual(['/Users/me/diagram.png']);
      expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it('does not show a failure from an upload started on another target', async () => {
      selectDelegatedChild('agent_run_task_agent');
      let rejectUpload: ((error: Error) => void) | null = null;
      contextFileUploadStoreMock.uploadAttachment.mockImplementation(
        () => new Promise((_, reject) => { rejectUpload = reject; }),
      );
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const wrapper = mountComposer();
      await pasteFiles(wrapper, [new File(['x'], 'late.png', { type: 'image/png' })]);

      activeContextStoreMock.delegatedChild = null;
      selectContext(createContext('temp-other-agent'));
      await flushPromises();
      (rejectUpload as unknown as (error: Error) => void)(new Error('network down'));
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    describe('size limits, progress and cancel (AC-005 … AC-009)', () => {
      const fileOfSize = (name: string, type: string, bytes: number) => {
        const file = new File(['x'], name, { type });
        Object.defineProperty(file, 'size', { value: bytes });
        return file;
      };
      const errorLines = (wrapper: ReturnType<typeof mountComposer>) =>
        wrapper.findAll('[data-testid="context-file-error-line"]').map((line) => line.text());
      afterEach(async () => { await localizationRuntime.setPreference('en'); });

      it('zh-CN: three over-limit videos give one message with the names and the limit, and no request is made', async () => {
        await localizationRuntime.setPreference('zh-CN');
        selectDelegatedChild('agent_run_task_agent');
        const wrapper = mountComposer();

        await pasteFiles(wrapper, ['VID_1.mp4', 'VID_2.mp4', 'VID_3.mp4'].map((name) => fileOfSize(name, 'video/mp4', 3 * 1024 * MB)));

        expect(errorLines(wrapper)).toEqual(['无法附加 VID_1.mp4, VID_2.mp4, VID_3.mp4：文件超过 2 GB 大小限制。']);
        expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
        expect(wrapper.text()).not.toContain('Uploaded file is too large');
      });

      it('English: files over different limits get one message per limit, each with its own limit', async () => {
        selectDelegatedChild('agent_run_task_agent');
        const wrapper = mountComposer();

        await pasteFiles(wrapper, [fileOfSize('a.mp4', 'video/mp4', 3 * 1024 * MB), fileOfSize('b.pdf', 'application/pdf', 30 * MB)]);

        expect(errorLines(wrapper)).toEqual([
          "Couldn't attach a.mp4: over the 2 GB size limit.",
          "Couldn't attach b.pdf: over the 25 MB size limit.",
        ]);
        expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
      });

      it('a server refusal after the pre-check shows the same message with the server\'s limit (AC-006)', async () => {
        selectDelegatedChild('agent_run_task_agent');
        contextFileUploadStoreMock.uploadAttachment.mockRejectedValue(new ContextFileUploadError({ reason: 'too_large', maxBytes: 1572864000 }));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const wrapper = mountComposer();

        await pasteFiles(wrapper, [fileOfSize('a.mp4', 'video/mp4', 100 * MB)]);

        expect(errorLines(wrapper)).toEqual(["Couldn't attach a.mp4: over the 1.5 GB size limit."]);
      });

      it.each([
        [{ reason: 'unsupported_type' }, "Couldn't attach a.exe: this file type isn't supported."],
        [{ reason: 'interrupted' }, "Couldn't attach a.exe: the upload was interrupted. Check your connection and try again."],
        [{ reason: 'other' }, "Couldn't attach a.exe."],
      ] as const)('shows the %j failure as a localized line without any server text (AC-009)', async (failure, expected) => {
        selectDelegatedChild('agent_run_task_agent');
        const error = Object.assign(new ContextFileUploadError(failure), { response: { data: { detail: 'Unsupported file type: x' } } });
        contextFileUploadStoreMock.uploadAttachment.mockRejectedValue(error);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const wrapper = mountComposer();

        await pasteFiles(wrapper, [fileOfSize('a.exe', 'application/octet-stream', 5)]);

        expect(errorLines(wrapper)).toEqual([expected]);
      });

      it('regression: the reported mixed text (localized sentence plus raw server text) never renders', async () => {
        await localizationRuntime.setPreference('zh-CN');
        selectDelegatedChild('agent_run_task_agent');
        contextFileUploadStoreMock.uploadAttachment.mockRejectedValue({ response: { status: 400, data: { detail: 'Uploaded file is too large.' } } });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const wrapper = mountComposer();

        await pasteFiles(wrapper, [fileOfSize('VID_20260116.mp4', 'video/mp4', 30 * MB)]);

        expect(wrapper.find('[role="alert"]').text()).toBe('无法附加 VID_20260116.mp4。');
      });

      it('a failed removal says so by name and nothing else', async () => {
        const context = selectDelegatedChild('agent_run_task_agent');
        context.contextFilePaths.push(collaborationDraft('ctx_keep__notes.png', 'notes.png'));
        contextFileUploadStoreMock.deleteDraftAttachment.mockRejectedValue(new Error('Server says: forbidden'));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const wrapper = mountComposer();

        await wrapper.find('button[aria-label="Remove file"]').trigger('click');
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toBe("Couldn't remove notes.png.");
      });

      it('shows progress and a cancel control on an uploading item; cancel stops it with no message', async () => {
        const context = selectDelegatedChild('agent_run_task_agent');
        let report!: (percent: number) => void;
        let signal!: AbortSignal;
        contextFileUploadStoreMock.uploadAttachment.mockImplementation(({ signal: given, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void }) => {
          signal = given;
          report = onProgress;
          return new Promise((_, reject) => given.addEventListener('abort', () => reject(new Error('canceled'))));
        });
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const wrapper = mountComposer();

        await pasteFiles(wrapper, [fileOfSize('clip.mp4', 'video/mp4', 200 * MB)]);
        expect(wrapper.find('[data-testid="context-file-upload-progress"]').text()).toBe('0%');
        report(42);
        await flushPromises();
        expect(wrapper.find('[data-testid="context-file-upload-progress"]').text()).toBe('42%');
        const cancel = wrapper.find('button[aria-label="Cancel upload of clip.mp4"]');
        expect(cancel.exists()).toBe(true);
        expect(wrapper.find('button[aria-label="Remove file"]').exists()).toBe(false);

        await cancel.trigger('click');
        await flushPromises();

        expect(signal.aborted).toBe(true);
        expect(wrapper.find('[data-testid="context-file-upload-progress"]').exists()).toBe(false);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(context.contextFilePaths).toEqual([]);
      });

      it('zh-CN: the cancel control has a localized accessible name', async () => {
        await localizationRuntime.setPreference('zh-CN');
        selectDelegatedChild('agent_run_task_agent');
        contextFileUploadStoreMock.uploadAttachment.mockImplementation(() => new Promise(() => undefined));
        const wrapper = mountComposer();

        await pasteFiles(wrapper, [fileOfSize('clip.mp4', 'video/mp4', 200 * MB)]);

        expect(wrapper.find('button[aria-label="取消上传 clip.mp4"]').exists()).toBe(true);
      });
    });

    it('clears a shown error when the composer target changes', async () => {
      selectDelegatedChild('agent_run_task_agent', 'read_only');
      const wrapper = mountComposer();
      await pasteFiles(wrapper, [new File(['x'], 'image.png', { type: 'image/png' })]);
      expect(wrapper.find('[role="alert"]').exists()).toBe(true);

      activeContextStoreMock.delegatedChild = null;
      selectContext(createContext('temp-other-agent'));
      await flushPromises();
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });
  });

  describe('draft attachments on the phone (autobyteus-450 DEC-005)', () => {
    const draftImage = createUploadedContextAttachment({
      storedFilename: 'ctx_ab__photo.png', locator: '/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_ab__photo.png',
      displayName: 'photo.png', phase: 'draft', type: 'Image',
    });
    const draftPdf = createUploadedContextAttachment({
      storedFilename: 'ctx_cd__spec.pdf', locator: '/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_cd__spec.pdf',
      displayName: 'spec.pdf', phase: 'draft', type: 'Pdf',
    });
    const mountPhone = () => {
      const context = createContext('temp-agent-1');
      context.contextFilePaths.push(draftImage, draftPdf);
      selectContext(context);
      return mount(withActiveComposerTarget(ContextFilePathInputArea), {
        global: { stubs: { FullScreenImageModal: { props: ['imageUrl', 'visible'], template: '<div data-test="modal" :data-url="imageUrl" />' } } },
      });
    };

    beforeEach(() => {
      phone.isPhone = true;
      phone.open.mockReset();
      phone.authorized.clear();
      windowNodeContextStoreMock.isEmbeddedWindow = false;
      (window as any).electronAPI = undefined;
      phone.authorized.set(`http://127.0.0.1:31000${draftImage.locator}`, 'blob:phone/draft-1');
    });
    afterEach(() => { phone.isPhone = false; });

    it('shows a draft image\'s thumbnail and its full-screen view with the phone key (object URLs)', async () => {
      const wrapper = mountPhone();
      expect(wrapper.get('img.context-image-thumbnail').attributes('src')).toBe('blob:phone/draft-1');
      await wrapper.get('button[title="photo.png"]').trigger('click');
      expect(wrapper.get('[data-test="modal"]').attributes('data-url')).toBe('blob:phone/draft-1');
      expect(phone.open).not.toHaveBeenCalled();
    });

    it('opens any other draft in the phone viewer, never a new window', async () => {
      const windowOpen = vi.fn();
      vi.stubGlobal('open', windowOpen);
      const wrapper = mountPhone();
      const chip = wrapper.findAll('button').find((button) => button.text().includes('spec.pdf') || button.attributes('title') === 'spec.pdf');
      expect(chip).toBeTruthy();
      await chip!.trigger('click');
      expect(phone.open).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'spec.pdf', phase: 'draft' }));
      expect(windowOpen).not.toHaveBeenCalled();
    });
  });
});
