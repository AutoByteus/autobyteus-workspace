import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import UserMessage from '../UserMessage.vue';
import { createUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

// autobyteus-450 DS-001 / REQ-001, REQ-002: on the phone a message's attachments show with the phone's key and open in
// the phone's viewer; the page never loads or navigates to the node's file URL by itself.

const phone = vi.hoisted(() => ({ isPhone: true, open: vi.fn(), authorized: new Map<string, { url: string | null; error: string | null }>() }));
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => phone.isPhone }));
vi.mock('~/composables/mobile/useMobileAttachmentOpening', () => ({ useMobileAttachmentOpening: () => ({ open: phone.open }) }));
vi.mock('~/composables/useAuthorizedObjectUrl', () => ({
  useAuthorizedObjectUrl: (source: () => string | null) => {
    const answer = phone.authorized.get(source() ?? '') ?? { url: null, error: null };
    return { resolvedUrl: ref(answer.url), error: ref(answer.error), refresh: vi.fn() };
  },
}));
vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => reactive({ openFile: vi.fn(), openFilePreview: vi.fn() }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => reactive({ isEmbeddedWindow: false, initialized: true, nodeBaseUrl: 'http://192.168.77.10:29695', getBoundEndpoints: () => ({ rest: 'http://192.168.77.10:29695/rest' }) }),
}));
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => reactive({ activeWorkspace: { workspaceId: 'ws-1' } }) }));

const NODE = 'http://192.168.77.10:29695';
const image = createUploadedContextAttachment({
  storedFilename: 'ctx_ab12__photo.png', locator: '/rest/runs/run-1/context-files/ctx_ab12__photo.png', displayName: 'photo.png', phase: 'final', type: 'Image',
});
const pdf = createUploadedContextAttachment({
  storedFilename: 'ctx_cd34__spec.pdf', locator: '/rest/runs/run-1/context-files/ctx_cd34__spec.pdf', displayName: 'spec.pdf', phase: 'final', type: 'Pdf',
});
const mountMessage = () => mount(UserMessage, {
  props: { message: { type: 'user', text: 'see attached', timestamp: new Date(), contextFilePaths: [image, pdf] } as never },
  global: { mocks: { $t: (key: string) => key } },
});

describe('UserMessage attachments on the phone', () => {
  const windowOpen = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    phone.isPhone = true;
    phone.authorized.clear();
    window.open = windowOpen as typeof window.open;
  });

  it('shows an image as a thumbnail loaded with the phone key (an object URL), the others as names', () => {
    phone.authorized.set(`${NODE}${image.locator}`, { url: 'blob:phone/1', error: null });
    const wrapper = mountMessage();
    const thumbnail = wrapper.get('img.message-attachment-thumbnail');
    expect(thumbnail.attributes('src')).toBe('blob:phone/1');
    expect(wrapper.text()).toContain('spec.pdf');
    expect(wrapper.html()).not.toContain(`src="${NODE}`);
  });

  it('a tap opens the attachment in the phone viewer, never a new window or a page navigation', async () => {
    phone.authorized.set(`${NODE}${image.locator}`, { url: 'blob:phone/1', error: null });
    const wrapper = mountMessage();
    await wrapper.get('button[aria-label="Open photo.png"]').trigger('click');
    await wrapper.get('button[aria-label="Open spec.pdf"]').trigger('click');
    expect(phone.open.mock.calls.map(([attachment]) => attachment.displayName)).toEqual(['photo.png', 'spec.pdf']);
    expect(windowOpen).not.toHaveBeenCalled();
  });

  it('a thumbnail the node refuses shows the attachment by its name', async () => {
    phone.authorized.set(`${NODE}${image.locator}`, { url: null, error: 'HTTP 404' });
    const wrapper = mountMessage();
    await flushPromises();
    expect(wrapper.find('img.message-attachment-thumbnail').exists()).toBe(false);
    expect(wrapper.get('button[aria-label="Open photo.png"]').text()).toBe('photo.png');
  });
});
