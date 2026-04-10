import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ArtifactsTab from '../ArtifactsTab.vue';

const {
  mockArtifactsStore,
  mockRunFileChangesStore,
  mockActiveContextStore,
  state,
} = vi.hoisted(() => {
  const state = {
    runId: 'run-1',
    generatedArtifacts: [] as any[],
    fileChanges: [] as any[],
    latestVisibleArtifactSignal: null as string | null,
    latestVisibleArtifactId: null as string | null,
  };

  return {
    state,
    mockArtifactsStore: {
      getArtifactsForRun: vi.fn((runId: string) => (runId === state.runId ? state.generatedArtifacts : [])),
      getLatestVisibleArtifactSignalForRun: vi.fn((runId: string) =>
        runId === state.runId ? state.latestVisibleArtifactSignal : null,
      ),
      getLatestVisibleArtifactIdForRun: vi.fn((runId: string) =>
        runId === state.runId ? state.latestVisibleArtifactId : null,
      ),
    },
    mockRunFileChangesStore: {
      getArtifactsForRun: vi.fn((runId: string) => (runId === state.runId ? state.fileChanges : [])),
      getLatestVisibleArtifactSignalForRun: vi.fn(() => null),
      getLatestVisibleArtifactIdForRun: vi.fn(() => null),
    },
    mockActiveContextStore: {
      get activeAgentContext() {
        return { state: { runId: state.runId } };
      },
    },
  };
});

vi.mock('~/stores/agentArtifactsStore', () => ({
  useAgentArtifactsStore: () => mockArtifactsStore,
}));

vi.mock('~/stores/runFileChangesStore', () => ({
  useRunFileChangesStore: () => mockRunFileChangesStore,
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => mockActiveContextStore,
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
    state.generatedArtifacts = [];
    state.fileChanges = [];
    state.latestVisibleArtifactSignal = null;
    state.latestVisibleArtifactId = null;
    mockArtifactsStore.getArtifactsForRun.mockClear();
    mockArtifactsStore.getLatestVisibleArtifactSignalForRun.mockClear();
    mockArtifactsStore.getLatestVisibleArtifactIdForRun.mockClear();
    mockRunFileChangesStore.getArtifactsForRun.mockClear();
    mockRunFileChangesStore.getLatestVisibleArtifactSignalForRun.mockClear();
    mockRunFileChangesStore.getLatestVisibleArtifactIdForRun.mockClear();
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

    expect(viewer.props('artifact')).toEqual(state.fileChanges[0]);
    expect(viewer.props('refreshSignal')).toBe(0);

    list.vm.$emit('select', state.fileChanges[0]);
    await wrapper.vm.$nextTick();

    expect(viewer.props('artifact')).toEqual(state.fileChanges[0]);
    expect(viewer.props('refreshSignal')).toBe(1);
  });
});
