import { computed, onBeforeUnmount, reactive, shallowReactive, watch, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { getBrowserServerUrls } from '~/utils/browserServerConfig';
import {
  fetchAuthorizedResourceBlob,
  shouldLoadResourceThroughAuthorizedFetchWithCredential,
} from '~/utils/remoteAccess/authorizedResourceUrl';

/** How long an object URL is kept after the last avatar showing it went away (a row scrolled out and back reuses it). */
export const AVATAR_OBJECT_URL_RELEASE_MS = 60_000;

type Entry = { state: 'loading' | 'ready' | 'failed'; objectUrl: string | null; users: number; credential: string; release: ReturnType<typeof setTimeout> | null };

/** One page's pictures read with the node's credential, by credential and absolute address (autobyteus-669 W-2). */
const entries = shallowReactive(new Map<string, Entry>());
/** Addresses an `<img>` could not show this session (a new version is a new address): no retry storm. */
const failedAddresses = shallowReactive(new Set<string>());

const keyOf = (credential: string, address: string): string => `${credential}\n${address}`;

const boundRestBase = (): string | null => {
  try {
    const node = useWindowNodeContextStore();
    // A desktop window's bound node, or the node a phone is paired with (bound by its session).
    if (node.initialized || node.nodeBaseUrl.trim()) return node.getBoundEndpoints().rest.replace(/\/+$/, '');
  } catch {
    // Outside a page with a bound node: the browser's own configuration.
  }
  try {
    return getBrowserServerUrls().rest.replace(/\/+$/, '');
  } catch {
    return null;
  }
};

/**
 * A picture address as a page shows it: a node-relative `/rest/…` address against the window's bound REST base (its
 * own node in `nuxt dev`, the installed `file://` window and the phone alike); an absolute address as given.
 */
export const resolveAvatarAddress = (address: string | null | undefined): string | null => {
  const text = address?.trim();
  if (!text) return null;
  if (!text.startsWith('/rest/')) return text;
  const base = boundRestBase();
  return base ? `${base}${text.slice('/rest'.length)}` : text;
};

const acquire = (key: string, address: string, credential: string): void => {
  // A page that changed its credential no longer shows the old one's pictures.
  for (const [otherKey, entry] of entries) {
    if (entry.credential !== credential && entry.users <= 0) drop(otherKey, entry);
  }
  const existing = entries.get(key);
  if (existing) {
    existing.users += 1;
    if (existing.release) { clearTimeout(existing.release); existing.release = null; }
    return;
  }
  const entry = reactive<Entry>({ state: 'loading', objectUrl: null, users: 1, credential, release: null });
  entries.set(key, entry);
  void fetchAuthorizedResourceBlob(address, {}, credential).then((blob) => {
    if (entries.get(key) !== entry) return;
    entry.objectUrl = URL.createObjectURL(blob);
    entry.state = 'ready';
  }, () => {
    if (entries.get(key) === entry) entry.state = 'failed';
  });
};

const drop = (key: string, entry: Entry): void => {
  if (entry.release) clearTimeout(entry.release);
  if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
  entries.delete(key);
};

const release = (key: string): void => {
  const entry = entries.get(key);
  if (!entry) return;
  entry.users -= 1;
  // A failed read is remembered for the session; a picture is kept a while for the next row that shows it.
  if (entry.users > 0 || entry.state === 'failed') return;
  entry.release = setTimeout(() => { if (entry.users <= 0 && entries.get(key) === entry) drop(key, entry); }, AVATAR_OBJECT_URL_RELEASE_MS);
};

/**
 * What an avatar's `<img>` shows for a definition's picture address (autobyteus-669 W-2). Where the node's credential
 * must be sent (a phone page, a protected address), the picture is read once by an authorized fetch into one object
 * URL that every avatar showing that address shares, revoked a while after the last one went away. Otherwise the
 * address itself (an Electron window attaches the credential). `src` is null while loading and after a failure, when
 * the avatar shows its fallback; `onError` records an `<img>` that could not show it (given the `src` it showed, a late
 * error of a picture since replaced is ignored).
 */
export function useAvatarObjectUrl(address: () => string | null | undefined): {
  src: ComputedRef<string | null>;
  failed: ComputedRef<boolean>;
  onError: (shownSrc?: string | null) => void;
} {
  const { activeCredential } = storeToRefs(useMobileNodeSessionStore());
  const absolute = computed(() => resolveAvatarAddress(address()));
  const protectedKey = computed(() => {
    const url = absolute.value;
    const credential = activeCredential.value;
    return url && credential && shouldLoadResourceThroughAuthorizedFetchWithCredential(url, credential) ? keyOf(credential, url) : null;
  });
  let held: string | null = null;
  watch(protectedKey, (key) => {
    if (key === held) return;
    if (held) release(held);
    held = key;
    if (key) acquire(key, absolute.value!, activeCredential.value!);
  }, { immediate: true });
  onBeforeUnmount(() => {
    if (held) release(held);
    held = null;
  });

  const src = computed(() => {
    const url = absolute.value;
    if (!url) return null;
    if (protectedKey.value) {
      const entry = entries.get(protectedKey.value);
      return entry?.state === 'ready' ? entry.objectUrl : null;
    }
    return failedAddresses.has(url) ? null : url;
  });
  const failed = computed(() => {
    const url = absolute.value;
    if (!url) return true;
    if (protectedKey.value) return entries.get(protectedKey.value)?.state === 'failed';
    return failedAddresses.has(url);
  });
  const onError = (shownSrc?: string | null): void => {
    if (shownSrc !== undefined && shownSrc !== src.value) return;
    const key = protectedKey.value;
    if (key) {
      const entry = entries.get(key);
      if (entry) { if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl); entry.objectUrl = null; entry.state = 'failed'; }
      return;
    }
    if (absolute.value) failedAddresses.add(absolute.value);
  };
  return { src, failed, onError };
}

/** A fresh page's cache (tests). */
export const resetAvatarObjectUrlsForTests = (): void => {
  for (const [key, entry] of entries) drop(key, entry);
  failedAddresses.clear();
};
