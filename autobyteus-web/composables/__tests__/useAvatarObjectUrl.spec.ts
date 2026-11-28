import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { defineComponent, h, ref, type Ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AVATAR_OBJECT_URL_RELEASE_MS,
  resetAvatarObjectUrlsForTests,
  resolveAvatarAddress,
  useAvatarObjectUrl,
} from '~/composables/useAvatarObjectUrl';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { MobileNodeSession } from '~/types/remoteAccess';

const NODE = 'http://node.example';
const ADDRESS = '/rest/definition-avatars/agent/writer?v=0123456789ab';

const session = (credential: string): MobileNodeSession => ({
  entryId: 'mobile-paired-node', serverBaseUrl: NODE, credential, pairedAt: '2026-11-28T00:00:00.000Z',
  device: { deviceId: 'device-1', displayName: 'Phone', clientFacingBaseUrl: NODE, connectionWay: null, createdAt: '2026-11-28T00:00:00.000Z', lastSeenAt: null, revokedAt: null },
});

/** A synthetic picture's bytes: a plain coloured square, never a realistic person. */
const pictureResponse = (): Response => ({ ok: true, status: 200, statusText: 'OK', blob: () => Promise.resolve(new Blob(['square'], { type: 'image/png' })) }) as Response;

let pinia: Pinia;
let objectUrls: number;

/** `count` avatars, as a phone's run list shows them, each showing its own address. */
const mountAvatars = (addresses: Ref<(string | null)[]>) => {
  const shown: ReturnType<typeof useAvatarObjectUrl>[] = [];
  const wrapper = mount(defineComponent({
    setup() {
      return () => h('div', addresses.value.map((_, index) => h(defineComponent({
        setup() {
          const avatar = useAvatarObjectUrl(() => addresses.value[index]);
          shown[index] = avatar;
          return () => h('img', { src: avatar.src.value ?? undefined });
        },
      }), { key: index })));
    },
  }), { global: { plugins: [pinia] } });
  return { wrapper, shown };
};

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  resetAvatarObjectUrlsForTests();
  objectUrls = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:picture-${++objectUrls}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});

afterEach(() => {
  resetAvatarObjectUrlsForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// autobyteus-669 W-2 (REQ-006, AC-005): a phone reads a definition's picture with its credential in a header, once.
describe('useAvatarObjectUrl on a paired phone', () => {
  const pairPhone = (credential = 'phone-key') => {
    useWindowNodeContextStore().bindNodeContext('mobile-paired-node', NODE);
    useMobileNodeSessionStore().$patch({ session: session(credential) });
  };

  it('reads one address for twenty rows with one fetch: the credential in the Authorization header, never in the address', async () => {
    pairPhone();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pictureResponse());
    const { wrapper, shown } = mountAvatars(ref(Array.from({ length: 20 }, () => ADDRESS)));
    await flushPromises();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe(`${NODE}/rest/definition-avatars/agent/writer?v=0123456789ab`);
    expect(String(url)).not.toContain('phone-key');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer phone-key');
    expect(new Set(shown.map((avatar) => avatar.src.value))).toEqual(new Set(['blob:picture-1']));
    expect(wrapper.findAll('img').every((img) => img.attributes('src') === 'blob:picture-1')).toBe(true);
    wrapper.unmount();
  });

  it('keeps the picture a while after the last row went away, then revokes it', async () => {
    vi.useFakeTimers();
    pairPhone();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pictureResponse());
    const first = mountAvatars(ref([ADDRESS]));
    await flushPromises();
    first.wrapper.unmount();
    // A row scrolled back in within the window reuses it.
    const again = mountAvatars(ref([ADDRESS]));
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(again.shown[0]!.src.value).toBe('blob:picture-1');
    again.wrapper.unmount();
    vi.advanceTimersByTime(AVATAR_OBJECT_URL_RELEASE_MS);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picture-1');
    mountAvatars(ref([ADDRESS]));
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('remembers a failed read: the rows show their fallback and nothing is fetched again', async () => {
    pairPhone();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' } as Response);
    const first = mountAvatars(ref([ADDRESS, ADDRESS]));
    await flushPromises();
    expect(first.shown.map((avatar) => [avatar.src.value, avatar.failed.value])).toEqual([[null, true], [null, true]]);
    first.wrapper.unmount();
    const again = mountAvatars(ref([ADDRESS]));
    await flushPromises();
    expect(again.shown[0]!.failed.value).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('a new version is a new address, read once', async () => {
    pairPhone();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pictureResponse());
    const addresses = ref<(string | null)[]>([ADDRESS, ADDRESS]);
    const { shown } = mountAvatars(addresses);
    await flushPromises();
    addresses.value = [ADDRESS.replace('0123456789ab', 'ba9876543210'), ADDRESS.replace('0123456789ab', 'ba9876543210')];
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(shown.map((avatar) => avatar.src.value)).toEqual(['blob:picture-2', 'blob:picture-2']);
  });

  it('a changed credential reads the picture again with the new one', async () => {
    pairPhone('old-key');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pictureResponse());
    const { shown } = mountAvatars(ref([ADDRESS]));
    await flushPromises();
    useMobileNodeSessionStore().$patch({ session: session('new-key') });
    await flushPromises();
    expect(fetchSpy.mock.calls.map(([, init]) => new Headers(init?.headers).get('Authorization'))).toEqual(['Bearer old-key', 'Bearer new-key']);
    expect(shown[0]!.src.value).toBe('blob:picture-2');
  });

  it('a late error of a picture since replaced does not mark the new one failed', async () => {
    pairPhone();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pictureResponse());
    const addresses = ref<(string | null)[]>([ADDRESS]);
    const { shown } = mountAvatars(addresses);
    await flushPromises();
    addresses.value = [ADDRESS.replace('0123456789ab', 'ba9876543210')];
    await flushPromises();
    shown[0]!.onError('blob:picture-1');
    expect(shown[0]!.src.value).toBe('blob:picture-2');
    shown[0]!.onError('blob:picture-2');
    expect([shown[0]!.src.value, shown[0]!.failed.value]).toEqual([null, true]);
  });
});

describe('useAvatarObjectUrl without a phone credential (a desktop window)', () => {
  it('shows the address itself against the bound node, and stops showing one that failed', async () => {
    useWindowNodeContextStore().initializeFromWindowContext({ windowId: 1, entryId: 'embedded-local' }, 'http://127.0.0.1:29695');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { shown } = mountAvatars(ref([ADDRESS, '  ', null]));
    await flushPromises();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(shown.map((avatar) => avatar.src.value)).toEqual([`http://127.0.0.1:29695/rest/definition-avatars/agent/writer?v=0123456789ab`, null, null]);
    shown[0]!.onError();
    expect(shown[0]!.src.value).toBeNull();
  });

  it('keeps an absolute address as given', () => {
    expect(resolveAvatarAddress('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(resolveAvatarAddress('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(resolveAvatarAddress('')).toBeNull();
  });
});
