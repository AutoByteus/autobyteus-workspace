import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamTaskReferenceViewer from '../TeamTaskReferenceViewer.vue';

const { determineFileTypeMock } = vi.hoisted(() => ({
  determineFileTypeMock: vi.fn(),
}));

const windowNodeContextStoreMock = {
  getBoundEndpoints: vi.fn(() => ({ rest: 'http://127.0.0.1:4100/rest/' })),
};

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/utils/fileExplorer/fileUtils', () => ({
  determineFileType: determineFileTypeMock,
}));

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.loading_reference': 'Loading reference file...',
  'workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable': 'Reference file unavailable',
  'workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable_detail': 'The file may have been deleted, moved, or become unreadable.',
  'workspace.components.workspace.team.TeamCommunicationPanel.preview': 'Preview',
  'workspace.components.workspace.team.TeamCommunicationPanel.raw': 'Raw',
  'workspace.components.workspace.team.TeamCommunicationPanel.maximize_view': 'Maximize view',
  'workspace.components.workspace.team.TeamCommunicationPanel.restore_view': 'Restore view',
};

const reference = {
  referenceId: 'task-reference:0:/tmp/design.md',
  path: '/tmp/design.md',
  type: 'file' as const,
  createdAt: '2026-06-28T00:00:00.000Z',
  updatedAt: '2026-06-28T00:00:00.000Z',
};

const mountSubject = () => mount(TeamTaskReferenceViewer, {
  props: {
    teamRunId: 'team run/1',
    taskId: 'task/1',
    reference,
  },
  global: {
    stubs: {
      Icon: true,
      FileViewer: {
        props: ['file', 'error', 'mode', 'readOnly'],
        template: '<div data-test="file-viewer" :data-file-type="file.type" :data-url="file.url || null" :data-read-only="String(readOnly)"><span data-test="content">{{ file.content }}</span><span data-test="mode">{{ mode }}</span><span data-test="error">{{ error }}</span></div>',
      },
    },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});

describe('TeamTaskReferenceViewer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    determineFileTypeMock.mockResolvedValue('Text');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('fetches task reference bytes from the task-owned content route without rendering task back navigation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => '# Design',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4100/rest/team-runs/team%20run%2F1/task-delegations/task%2F1/references/task-reference%3A0%3A%2Ftmp%2Fdesign.md/content',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(wrapper.get('[data-test="content"]').text()).toBe('# Design');
    expect(wrapper.find('[data-test="team-reference-viewer-back"]').exists()).toBe(false);
  });

  it('uses the shared-policy fallback for an SVG task reference and keeps it read-only', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    const blob = new Blob(['<svg'], { type: 'image/svg+xml' });
    const createObjectURL = vi.fn(() => 'blob:svg-task-reference');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      blob: async () => blob,
    })));
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    const wrapper = mount(TeamTaskReferenceViewer, {
      props: {
        teamRunId: 'team run/1',
        taskId: 'task/1',
        reference: {
          ...reference,
          referenceId: 'task-reference:svg',
          path: '/tmp/diagram.SVG',
        },
      },
      global: {
        stubs: {
          Icon: true,
          FileViewer: {
            props: ['file', 'error', 'mode', 'readOnly'],
            template: '<div data-test="file-viewer" :data-file-type="file.type" :data-url="file.url || null" :data-read-only="String(readOnly)" />',
          },
        },
        mocks: { $t: (key: string) => labels[key] ?? key },
      },
    });
    await flushPromises();

    expect(determineFileTypeMock).toHaveBeenCalledWith('/tmp/diagram.SVG');
    expect(wrapper.get('[data-test="file-viewer"]').attributes('data-file-type')).toBe('Image');
    expect(wrapper.get('[data-test="file-viewer"]').attributes('data-url')).toBe('blob:svg-task-reference');
    expect(wrapper.get('[data-test="file-viewer"]').attributes('data-read-only')).toBe('true');

    wrapper.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:svg-task-reference');
  });
});
