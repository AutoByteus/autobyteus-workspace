// autobyteus-471 REQ-003 (CR-001, CR-002): in a run another node runs, a file link and a path attachment of its messages
// say "This file is on <node>, where this run runs." on the run view's file status line and read nothing; in a run of
// this node a path attachment opens as before. The run view, its feed, the user message with its attachment chips, the
// Markdown renderer and the lazily created link opener are production implementations, so the real callers decide.
// Doubled: the phone-runtime switch, the remote runs (one run on "studio"), the Files panel store and external Apollo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import { WORKSPACE_TOOL_REVEAL_KEY } from '~/composables/layout/useWorkspaceToolReveal';
import { createWorkspaceContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import type { Conversation } from '~/types/conversation';

const runtime = vi.hoisted(() => ({ phone: false }));
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => runtime.phone }));
vi.mock('~/stores/remoteRunsStore', () => ({
  useRemoteRunsStore: () => ({ runOfAgentRun: (id: string | null | undefined) => (id === 'remote-B' ? { nodeName: 'studio' } : null) }),
}));
const files = vi.hoisted(() => ({ openFile: vi.fn(), openFilePreview: vi.fn() }));
vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => files }));
const io = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
const active = vi.hoisted(() => ({ target: null as unknown }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return active.target; } }) }));
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => reactive({ activeWorkspace: { workspaceId: 'ws-1' }, resolveWorkspaceMetadataByRootPath: vi.fn() }),
}));

enableAutoUnmount(afterEach);

const ON_STUDIO = 'This file is on studio, where this run runs.';
const STATUS = '[data-testid="event-monitor-file-preview-status"]';

const conversationOf = (runId: string, path: string): Conversation => ({
  id: runId,
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:02.000Z',
  messages: [
    { type: 'user', text: 'See the notes.', timestamp: new Date('2026-11-11T00:00:01.000Z'), contextFilePaths: [createWorkspaceContextAttachment(path)] },
    {
      type: 'ai',
      text: `The notes are in [notes.md](${path}).`,
      timestamp: new Date('2026-11-11T00:00:02.000Z'),
      segments: [{ type: 'text', content: `The notes are in [notes.md](${path}).` }],
      isComplete: true,
    },
  ],
} as Conversation);

const mountRunView = async (runId: string, path: string) => {
  const pinia = createPinia(); setActivePinia(pinia);
  active.target = { context: { state: { runId }, config: { workspaceId: 'ws-1' } }, workspaceRootPath: '/owned/B' };
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/mobile', component: { render: () => null } }] });
  await router.push('/mobile?screen=run'); await router.isReady();
  const wrapper = mount(AgentEventMonitor, {
    props: { conversation: conversationOf(runId, path), runId, browseSubject: { kind: 'run', runId } },
    global: {
      plugins: [router, pinia],
      provide: { [WORKSPACE_TOOL_REVEAL_KEY as symbol]: vi.fn() },
      stubs: { AgentUserInputForm: true, CollaboratorAddFailureNotice: true },
    },
  });
  await flushPromises();
  return { wrapper, router };
};

const fetchSpy = vi.fn();

describe('a run another node runs: its file paths name that node (autobyteus-471 REQ-003)', () => {
  beforeEach(() => {
    runtime.phone = false;
    files.openFile.mockReset(); files.openFilePreview.mockReset();
    fetchSpy.mockReset(); vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('desktop: a file link says where the file is and reads nothing (CR-001)', async () => {
    const { wrapper } = await mountRunView('remote-B', '/remote/B/notes.md');
    await wrapper.get('[data-event-monitor-file-action-id]').trigger('click');
    await vi.waitFor(() => expect(wrapper.find(STATUS).exists()).toBe(true));
    expect(wrapper.get(STATUS).text()).toBe(ON_STUDIO);
    expect(files.openFile).not.toHaveBeenCalled(); expect(files.openFilePreview).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('desktop: a path attachment says where the file is on the same status line and reads nothing (CR-002)', async () => {
    const { wrapper } = await mountRunView('remote-B', '/remote/B/notes.md');
    await wrapper.get('button.message-attachment-chip').trigger('click');
    await flushPromises();
    expect(wrapper.get(STATUS).text()).toBe(ON_STUDIO);
    expect(files.openFile).not.toHaveBeenCalled(); expect(files.openFilePreview).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('desktop: in a run of this node a path attachment opens as before, with no status line', async () => {
    const { wrapper } = await mountRunView('local-A', '/owned/B/notes.md');
    await wrapper.get('button.message-attachment-chip').trigger('click');
    await flushPromises();
    expect(files.openFile).toHaveBeenCalledWith('/owned/B/notes.md', 'ws-1');
    expect(wrapper.find(STATUS).exists()).toBe(false);
  });

  it('phone: a file link says where the file is and opens no screen (CR-001)', async () => {
    runtime.phone = true;
    const { wrapper, router } = await mountRunView('remote-B', '/remote/B/notes.md');
    await wrapper.get('[data-event-monitor-file-action-id]').trigger('click');
    await vi.waitFor(() => expect(wrapper.find(STATUS).exists()).toBe(true));
    expect(wrapper.get(STATUS).text()).toBe(ON_STUDIO);
    expect(router.currentRoute.value.fullPath).toBe('/mobile?screen=run');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
