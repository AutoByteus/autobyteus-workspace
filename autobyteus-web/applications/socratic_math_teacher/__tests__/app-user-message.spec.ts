import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import AppUserMessage from '../components/AppUserMessage.vue';
import {
  createUploadedContextAttachment,
  createWorkspaceContextAttachment,
} from '~/utils/contextFiles/contextAttachmentModel';

const fileExplorerStoreMock = reactive({
  openFile: vi.fn(),
  openFilePreview: vi.fn(),
});

const windowNodeContextStoreMock = reactive({
  isEmbeddedWindow: true,
});

const workspaceStoreMock = reactive({
  activeWorkspace: { workspaceId: 'ws-1' },
});
const windowOpenMock = vi.fn();

vi.mock('~/stores/fileExplorer', () => ({
  useFileExplorerStore: () => fileExplorerStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

describe('AppUserMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).electronAPI = {};
    window.open = windowOpenMock as typeof window.open;
    windowOpenMock.mockReset();
  });

  it('renders uploaded image attachments as thumbnails, routes thumbnail clicks into the file viewer, and falls back to a chip on preview failure', async () => {
    const uploadedImage = createUploadedContextAttachment({
      storedFilename: 'ctx_upload__graph.png',
      locator: 'https://node.example/rest/team-runs/team-run-1/members/professor/context-files/ctx_upload__graph.png',
      displayName: 'graph.png',
      phase: 'final',
      type: 'Image',
    });

    const wrapper = mount(AppUserMessage, {
      props: {
        message: {
          type: 'user',
          text: 'Solve this',
          timestamp: new Date(),
          contextFilePaths: [
            uploadedImage,
            createWorkspaceContextAttachment('/Users/normy/project/problem.txt', 'Text'),
          ],
        },
      },
    });

    const thumbnail = wrapper.find('img.message-attachment-thumbnail');
    expect(thumbnail.exists()).toBe(true);
    expect(thumbnail.attributes('src')).toBe(
      'https://node.example/rest/team-runs/team-run-1/members/professor/context-files/ctx_upload__graph.png',
    );
    expect(wrapper.text()).toContain('problem.txt');

    await wrapper.find('button.message-attachment-thumbnail-button').trigger('click');
    expect(fileExplorerStoreMock.openFilePreview).toHaveBeenCalledWith(
      'https://node.example/rest/team-runs/team-run-1/members/professor/context-files/ctx_upload__graph.png',
      'ws-1',
    );
    expect(fileExplorerStoreMock.openFile).not.toHaveBeenCalledWith(
      'https://node.example/rest/team-runs/team-run-1/members/professor/context-files/ctx_upload__graph.png',
      'ws-1',
    );

    const chipButtons = wrapper.findAll('button.message-attachment-chip');
    await chipButtons[0]?.trigger('click');
    expect(fileExplorerStoreMock.openFile).toHaveBeenCalledWith('/Users/normy/project/problem.txt', 'ws-1');

    await thumbnail.trigger('error');
    await nextTick();

    expect(wrapper.find('img.message-attachment-thumbnail').exists()).toBe(false);
    expect(wrapper.text()).toContain('graph.png');

    await wrapper.findAll('button.message-attachment-chip')[0]?.trigger('click');
    expect(windowOpenMock).toHaveBeenCalledWith(
      'https://node.example/rest/team-runs/team-run-1/members/professor/context-files/ctx_upload__graph.png',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
