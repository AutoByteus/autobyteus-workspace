import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactsTab from '../ArtifactsTab.vue';

const {
  mockRunFileChangesStore,
  mockMessageFileReferencesStore,
  mockActiveContextStore,
  mockSelectionStore,
  mockTeamContextsStore,
  state,
} = vi.hoisted(() => {
  const state = {
    runId: 'run-1',
    teamRunId: 'team-1',
    selectedType: 'agent' as 'agent' | 'team',
    fileChanges: [] as any[],
    perspective: { sentGroups: [] as any[], receivedGroups: [] as any[] },
    latestVisibleArtifactSignal: null as string | null,
  };

  return {
    state,
    mockRunFileChangesStore: {
      getArtifactsForRun: vi.fn((runId: string) => (runId === state.runId ? state.fileChanges : [])),
      getLatestVisibleArtifactSignalForRun: vi.fn((runId: string) =>
        runId === state.runId ? state.latestVisibleArtifactSignal : null,
      ),
    },
    mockMessageFileReferencesStore: {
      getPerspectiveForMember: vi.fn((teamRunId: string, memberRunId: string) =>
        teamRunId === state.teamRunId && memberRunId === state.runId
          ? state.perspective
          : { sentGroups: [], receivedGroups: [] },
      ),
    },
    mockActiveContextStore: {
      get activeAgentContext() {
        return { state: { runId: state.runId } };
      },
    },
    mockSelectionStore: {
      get selectedType() {
        return state.selectedType;
      },
    },
    mockTeamContextsStore: {
      get activeTeamContext() {
        return { teamRunId: state.teamRunId };
      },
    },
  };
});

vi.mock('~/stores/runFileChangesStore', () => ({
  useRunFileChangesStore: () => mockRunFileChangesStore,
}));

vi.mock('~/stores/messageFileReferencesStore', () => ({
  useMessageFileReferencesStore: () => mockMessageFileReferencesStore,
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => mockActiveContextStore,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => mockSelectionStore,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => mockTeamContextsStore,
}));

describe('ArtifactsTab.vue', () => {
  const mountComponent = () =>
    mount(ArtifactsTab, {
      global: {
        stubs: {
          ArtifactList: {
            name: 'ArtifactList',
            template: '<div class="artifact-list-stub"></div>',
            props: ['artifacts', 'selectedArtifactId'],
            emits: ['select'],
          },
          ArtifactContentViewer: {
            name: 'ArtifactContentViewer',
            template: '<div class="artifact-viewer-stub"></div>',
            props: ['artifact', 'refreshSignal'],
          },
        },
      },
    });

  beforeEach(() => {
    state.runId = 'run-1';
    state.teamRunId = 'team-1';
    state.selectedType = 'agent';
    state.fileChanges = [];
    state.perspective = { sentGroups: [], receivedGroups: [] };
    state.latestVisibleArtifactSignal = null;
    mockRunFileChangesStore.getArtifactsForRun.mockClear();
    mockRunFileChangesStore.getLatestVisibleArtifactSignalForRun.mockClear();
    mockMessageFileReferencesStore.getPerspectiveForMember.mockClear();
  });

  it('renders with split pane layout', () => {
    const wrapper = mountComponent();

    expect(wrapper.findComponent({ name: 'ArtifactList' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'ArtifactContentViewer' }).exists()).toBe(true);
    expect(wrapper.find('.cursor-col-resize').exists()).toBe(true);
  });

  it('passes the selected artifact to the viewer and retries on same-row clicks', async () => {
    state.fileChanges = [
      {
        id: '1',
        runId: 'run-1',
        path: 'src/test.md',
        type: 'file',
        status: 'available',
        sourceTool: 'edit_file',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ];

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    const list = wrapper.findComponent({ name: 'ArtifactList' });
    const viewer = wrapper.findComponent({ name: 'ArtifactContentViewer' });
    const selected = viewer.props('artifact') as any;

    expect(selected).toMatchObject({ kind: 'agent', itemId: 'agent:1', path: 'src/test.md' });
    expect(viewer.props('refreshSignal')).toBe(0);

    list.vm.$emit('select', selected);
    await wrapper.vm.$nextTick();

    expect(viewer.props('artifact')).toMatchObject({ kind: 'agent', itemId: 'agent:1' });
    expect(viewer.props('refreshSignal')).toBe(1);
  });

  it('includes sent and received artifacts for the focused team member without mixing them into run file changes', async () => {
    state.selectedType = 'team';
    const reference = {
      referenceId: 'ref-1',
      teamRunId: 'team-1',
      senderRunId: 'run-1',
      senderMemberName: 'Focused',
      receiverRunId: 'receiver-run-1',
      receiverMemberName: 'Receiver',
      path: '/tmp/report.md',
      type: 'file',
      messageType: 'handoff',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    };
    state.perspective = {
      sentGroups: [
        {
          counterpartRunId: 'receiver-run-1',
          counterpartMemberName: 'Receiver',
          items: [{ ...reference, direction: 'sent', counterpartRunId: 'receiver-run-1', counterpartMemberName: 'Receiver', reference }],
        },
      ],
      receivedGroups: [],
    };

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    expect(mockRunFileChangesStore.getArtifactsForRun).toHaveBeenCalledWith('run-1');
    expect(mockMessageFileReferencesStore.getPerspectiveForMember).toHaveBeenCalledWith('team-1', 'run-1');
    expect(wrapper.findComponent({ name: 'ArtifactContentViewer' }).props('artifact')).toMatchObject({
      kind: 'message_reference',
      direction: 'sent',
      referenceId: 'ref-1',
      path: '/tmp/report.md',
    });
  });

  it('auto-selects the newest agent artifact row when a newly visible artifact signal arrives', async () => {
    state.fileChanges = [
      {
        id: 'older',
        runId: 'run-1',
        path: 'src/older.md',
        type: 'file',
        status: 'available',
        sourceTool: 'edit_file',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'newer',
        runId: 'run-1',
        path: 'src/newer.md',
        type: 'file',
        status: 'available',
        sourceTool: 'edit_file',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:01.000Z',
      },
    ];
    state.latestVisibleArtifactSignal = 'newer:1';

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    const viewer = wrapper.findComponent({ name: 'ArtifactContentViewer' });
    expect(viewer.props('artifact')).toMatchObject({ kind: 'agent', id: 'newer' });
  });
});
