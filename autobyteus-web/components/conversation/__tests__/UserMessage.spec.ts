import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import UserMessage from '../UserMessage.vue';
import {
  createUploadedContextAttachment,
  createWorkspaceContextAttachment,
  hydrateContextAttachment,
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

describe('UserMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).electronAPI = {};
    window.open = windowOpenMock as typeof window.open;
    windowOpenMock.mockReset();
  });

  it('renders uploaded image attachments as thumbnails, routes thumbnail clicks into the file viewer, and falls back to a chip on preview failure', async () => {
    const uploadedImage = createUploadedContextAttachment({
      storedFilename: 'ctx_upload__proof.png',
      locator: 'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      displayName: 'proof.png',
      phase: 'final',
      type: 'Image',
    });

    const wrapper = mount(UserMessage, {
      props: {
        message: {
          type: 'user',
          text: 'Here is the context',
          timestamp: new Date(),
          contextFilePaths: [
            uploadedImage,
            createWorkspaceContextAttachment('/Users/normy/project/notes.txt', 'Text'),
          ],
        },
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const thumbnail = wrapper.find('img.message-attachment-thumbnail');
    expect(thumbnail.exists()).toBe(true);
    expect(thumbnail.attributes('src')).toBe('https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png');
    expect(wrapper.text()).toContain('notes.txt');

    await wrapper.find('button.message-attachment-thumbnail-button').trigger('click');
    expect(fileExplorerStoreMock.openFilePreview).toHaveBeenCalledWith(
      'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      'ws-1',
    );
    expect(fileExplorerStoreMock.openFile).not.toHaveBeenCalledWith(
      'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      'ws-1',
    );

    const chipButtons = wrapper.findAll('button.message-attachment-chip');
    await chipButtons[0]?.trigger('click');
    expect(fileExplorerStoreMock.openFile).toHaveBeenCalledWith('/Users/normy/project/notes.txt', 'ws-1');

    await thumbnail.trigger('error');
    await nextTick();

    expect(wrapper.find('img.message-attachment-thumbnail').exists()).toBe(false);
    expect(wrapper.text()).toContain('proof.png');

    await wrapper.findAll('button.message-attachment-chip')[0]?.trigger('click');
    expect(windowOpenMock).toHaveBeenCalledWith(
      'https://node.example/rest/runs/run-1/context-files/ctx_upload__proof.png',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('renders unsupported local-file metadata as a non-interactive label chip', async () => {
    const unsupported = hydrateContextAttachment({
      locator: 'local-file://opaque/image.png',
      type: 'Image',
      displayName: 'opaque image.png',
    });
    const wrapper = mount(UserMessage, {
      props: {
        message: {
          type: 'user',
          text: 'Keep the label only',
          timestamp: new Date(),
          contextFilePaths: [unsupported],
        },
      },
      global: { mocks: { $t: (key: string) => key } },
    });

    expect(wrapper.text()).toContain('opaque image.png');
    expect(wrapper.find('span.message-attachment-chip').exists()).toBe(true);
    expect(wrapper.find('button.message-attachment-chip').exists()).toBe(false);
    expect(wrapper.find('img.message-attachment-thumbnail').exists()).toBe(false);
    expect(fileExplorerStoreMock.openFile).not.toHaveBeenCalled();
    expect(fileExplorerStoreMock.openFilePreview).not.toHaveBeenCalled();
    expect(windowOpenMock).not.toHaveBeenCalled();
  });
});
