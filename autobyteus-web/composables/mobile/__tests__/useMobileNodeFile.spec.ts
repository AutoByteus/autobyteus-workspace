import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, ref, type Ref } from 'vue';

vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ initialized: true, nodeBaseUrl: 'http://node.example/', getBoundEndpoints: () => ({ rest: 'http://node.example/rest/' }) }) }));
const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ authorizedFetch: transport.fetch }));
import { useMobileNodeFile, type MobileNodeFileSource } from '../useMobileNodeFile';

/** Mounts the composable in a component (its lifetime is the component's). */
/** Mounts the composable in a component (its lifetime is the component's), with a node path as its source. */
const mountWith = (path: Ref<string | null>) => {
  let result!: ReturnType<typeof useMobileNodeFile>;
  const source = computed<MobileNodeFileSource | null>(() => (path.value ? { kind: 'path', path: path.value } : null));
  const wrapper = mount(defineComponent({ setup() { result = useMobileNodeFile(source); return () => null; } }));
  return { wrapper, result };
};

describe('useMobileNodeFile (autobyteus-436)', () => {
  const created: string[] = [];
  const revoked: string[] = [];
  beforeEach(() => {
    transport.fetch.mockReset();
    created.length = 0; revoked.length = 0;
    let serial = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { const url = `blob:node/${++serial}`; created.push(url); return url; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => { revoked.push(url); });
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps a text file as content, read-only, without an object URL', async () => {
    transport.fetch.mockResolvedValue(new Response('# Contract', { status: 200 }));
    const { result } = mountWith(ref('/w/data-contract.md'));
    await flushPromises();
    expect(transport.fetch).toHaveBeenCalledWith('http://node.example/rest/node-files/content?path=%2Fw%2Fdata-contract.md');
    expect(result.fileState.value).toMatchObject({ path: '/w/data-contract.md', type: 'Text', content: '# Contract', url: null, isLoading: false, error: null,
      accessIntent: { readOnly: true } });
    expect(created).toEqual([]);
  });

  it('keeps an image as an object URL, revoked when another file opens and when the viewer closes', async () => {
    transport.fetch.mockResolvedValue(new Response(new Blob([new Uint8Array([0x89, 0x50])]), { status: 200 }));
    const path = ref<string | null>('/w/diagram.png');
    const { wrapper, result } = mountWith(path);
    await flushPromises();
    expect(result.fileState.value).toMatchObject({ type: 'Image', url: 'blob:node/1', content: null });
    transport.fetch.mockResolvedValue(new Response(new Blob([new Uint8Array([0x25, 0x50])]), { status: 200 }));
    path.value = '/w/report.pdf';
    await flushPromises();
    expect(revoked).toEqual(['blob:node/1']);
    expect(result.fileState.value).toMatchObject({ type: 'PDF', url: 'blob:node/2' });
    wrapper.unmount();
    expect(revoked).toEqual(['blob:node/1', 'blob:node/2']);
  });

  it('maps the node\'s refusal codes to the messages; a failed request says the preview could not be opened', async () => {
    const cases = [
      [new Response(JSON.stringify({ code: 'NODE_FILE_NOT_FOUND' }), { status: 404 }), 'workspace.components.mobile.views.MobileFiles.node_file_not_found'],
      [new Response(JSON.stringify({ code: 'NODE_FILE_IS_FOLDER' }), { status: 400 }), 'workspace.components.mobile.views.MobileFiles.node_file_is_folder'],
      [new Response(JSON.stringify({ code: 'NODE_FILE_PATH_INVALID' }), { status: 400 }), 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed'],
      [new Response('nope', { status: 500 }), 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed'],
    ] as const;
    for (const [answer, message] of cases) {
      transport.fetch.mockResolvedValue(answer);
      const { wrapper, result } = mountWith(ref('/w/x.md'));
      await flushPromises();
      expect(result.errorMessage.value).toBe(message);
      expect(result.fileState.value).toMatchObject({ isLoading: false, error: message });
      wrapper.unmount();
    }
    transport.fetch.mockRejectedValue(new TypeError('network'));
    const { result } = mountWith(ref('/w/x.md'));
    await flushPromises();
    expect(result.errorMessage.value).toBe('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed');
  });

  it('ignores the answer of a file that is no longer open', async () => {
    let settle!: (response: Response) => void;
    transport.fetch.mockReturnValueOnce(new Promise((resolve) => { settle = resolve; }));
    const path = ref<string | null>('/w/old.md');
    const { result } = mountWith(path);
    await flushPromises();
    transport.fetch.mockResolvedValueOnce(new Response('new', { status: 200 }));
    path.value = '/w/new.md';
    await flushPromises();
    settle(new Response('old', { status: 200 }));
    await flushPromises();
    expect(result.fileState.value).toMatchObject({ path: '/w/new.md', content: 'new' });
  });

  describe('a file attached to a message (autobyteus-450)', () => {
    const mountAttached = (source: MobileNodeFileSource) => {
      let result!: ReturnType<typeof useMobileNodeFile>;
      mount(defineComponent({ setup() { result = useMobileNodeFile(ref(source)); return () => null; } }));
      return result;
    };

    it('reads it from its node URL path with the phone key; its type and name come from the name it was sent with', async () => {
      transport.fetch.mockResolvedValue(new Response(new Blob(['png']), { status: 200 }));
      const result = mountAttached({ kind: 'contextFile', locator: '/rest/runs/run-1/context-files/ctx_ab12__photo.png', name: 'photo.png' });
      await flushPromises();
      expect(transport.fetch).toHaveBeenCalledWith('http://node.example/rest/runs/run-1/context-files/ctx_ab12__photo.png');
      expect(result.fileState.value).toMatchObject({ path: 'photo.png', type: 'Image', url: 'blob:node/1', isLoading: false, error: null });
    });

    it('keeps an attached text file as content', async () => {
      transport.fetch.mockResolvedValue(new Response('notes', { status: 200 }));
      const result = mountAttached({ kind: 'contextFile', locator: '/rest/runs/run-1/context-files/ctx_cd34__notes.txt', name: 'notes.txt' });
      await flushPromises();
      expect(result.fileState.value).toMatchObject({ path: 'notes.txt', type: 'Text', content: 'notes' });
    });

    it('a refusal shows the viewer\'s message, never a pairing screen', async () => {
      transport.fetch.mockResolvedValue(new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404 }));
      const result = mountAttached({ kind: 'contextFile', locator: '/rest/runs/run-1/context-files/gone.pdf', name: 'gone.pdf' });
      await flushPromises();
      expect(result.errorMessage.value).toBe('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed');
    });
  });
});
