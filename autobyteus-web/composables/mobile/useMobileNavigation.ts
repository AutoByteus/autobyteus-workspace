import { computed } from 'vue';
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router';

/** The phone's screens (UIS-001…UIS-010); the run list is the entry without a `screen` key. */
export type MobileScreen = 'list' | 'run' | 'artifacts' | 'files' | 'messages' | 'activity' | 'desktop' | 'new';
export type MobileView = 'artifacts' | 'files' | 'messages' | 'activity' | 'desktop';

const SCREENS: readonly MobileScreen[] = ['run', 'artifacts', 'files', 'messages', 'activity', 'desktop', 'new'];
/** `full=1`: the VNC Viewer's in-page full screen, its own entry, so Back leaves full screen first. */
const SCREEN_KEYS = ['screen', 'file', 'workspace', 'nodeFile', 'contextFile', 'contextFileName', 'reference', 'message', 'full'] as const;
/** The Org route keys, built only by `agentOrgRouteQuery`; `activeWorkspaceTarget` resolves the open Org from them. */
const ORG_KEYS = ['rootSubjectKind', 'definitionId', 'orgRunId', 'mode', 'memberAddress', 'agentRunId'] as const;

const one = (value: LocationQuery[string] | undefined): string => String(Array.isArray(value) ? value[0] ?? '' : value ?? '').trim();
const pick = (query: LocationQuery, keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(keys.flatMap((key) => (one(query[key]) ? [[key, one(query[key])]] : [])));
/** Keys this owner does not write (`unsupported`, `pairing`): kept on the list entry, never carried forward. */
const foreignOf = (query: LocationQuery): LocationQueryRaw => Object.fromEntries(Object.entries(query)
  .filter(([key]) => !(SCREEN_KEYS as readonly string[]).includes(key) && !(ORG_KEYS as readonly string[]).includes(key)));

/**
 * The phone's screen state (autobyteus-277 DS-004): `/mobile`'s route query, so the system Back key walks
 * file → view → run → list. This is the only writer of that query, for the screen keys and the Org keys. Forward moves
 * push; ← goes back; opening a run first rewrites the list entry with the opened subject's Org keys (none for an agent
 * or a Team run), so Back returns to a list where the same subject is still open.
 */
export function useMobileNavigation() {
  const route = useRoute();
  const router = useRouter();

  const screen = computed<MobileScreen>(() => {
    const value = one(route.query.screen) as MobileScreen;
    return SCREENS.includes(value) ? value : 'list';
  });
  const openFilePath = computed(() => (screen.value === 'files' ? one(route.query.file) || null : null));
  const openFileWorkspaceId = computed(() => (screen.value === 'files' ? one(route.query.workspace) || null : null));
  /** A node file (autobyteus-436): a file on the node's computer opened by its absolute path, read-only. */
  const openNodeFilePath = computed(() => (screen.value === 'files' ? one(route.query.nodeFile) || null : null));
  /** A file attached to a message (autobyteus-450): its node URL path (no credential) and the name it was sent with. */
  const openContextFileEntry = computed(() => {
    const locator = screen.value === 'files' ? one(route.query.contextFile) : '';
    return locator ? { locator, name: one(route.query.contextFileName) || locator.split('/').at(-1) || locator } : null;
  });
  const desktopFullScreen = computed(() => screen.value === 'desktop' && one(route.query.full) === '1');
  const openReference = computed(() => {
    if (screen.value !== 'messages') return null;
    const messageId = one(route.query.message);
    const referenceId = one(route.query.reference);
    return messageId && referenceId ? { messageId, referenceId } : null;
  });

  const orgKeys = (): Record<string, string> => pick(route.query, ORG_KEYS);
  /** Whether this entry has an entry of this app under it (vue-router's history state; a reload or a link has none). */
  const hasEntryBelow = (): boolean => Boolean(router.options.history.state?.back);
  const push = (query: LocationQueryRaw) => router.push({ path: route.path, query });

  /** One step back; a screen entered without an entry under it (a reload, a link) goes to its parent instead. */
  const back = async (): Promise<void> => {
    if (hasEntryBelow()) {
      router.back();
      return;
    }
    const parent: LocationQueryRaw = openFilePath.value || openNodeFilePath.value || openContextFileEntry.value
      ? { ...orgKeys(), screen: 'files' }
      : desktopFullScreen.value ? { ...orgKeys(), screen: 'desktop' }
      : openReference.value ? { ...orgKeys(), screen: 'messages' }
        : screen.value === 'run' || screen.value === 'new' ? { ...orgKeys() }
          : screen.value === 'list' ? route.query : { ...orgKeys(), screen: 'run' };
    await router.replace({ path: route.path, query: parent });
  };

  /** Back to the run list in place of this entry (a screen whose subject is gone). */
  const toList = async (): Promise<void> => {
    await router.replace({ path: route.path, query: { ...foreignOf(route.query), ...orgKeys() } });
  };

  const backThen = (): Promise<void> => new Promise((resolve) => {
    const stop = router.afterEach(() => { stop(); resolve(); });
    router.back();
  });

  /**
   * Opens the run screen of a subject: the current entry (the list) is rewritten with the subject's Org keys, or none,
   * then the run screen is pushed with them. `replace` (New run's Create run): the New run entry gives way, so Back
   * from the new run returns to the list.
   */
  const openRun = async (input: { orgQuery?: Record<string, string>; replace?: boolean } = {}): Promise<void> => {
    if (input.replace && screen.value === 'new' && hasEntryBelow()) {
      await backThen();
    } else if (input.replace) {
      await router.replace({ path: route.path, query: { ...(input.orgQuery ?? {}), screen: 'run' } });
      return;
    }
    await router.replace({ path: route.path, query: { ...foreignOf(route.query), ...(input.orgQuery ?? {}) } });
    await push({ ...(input.orgQuery ?? {}), screen: 'run' });
  };

  const openView = (view: MobileView) => push({ ...orgKeys(), screen: view });
  const openNewRun = () => push({ ...orgKeys(), screen: 'new' });
  /** Full screen is an entry above the VNC Viewer; leaving it is `back()`. */
  const openDesktopFullScreen = () => push({ ...orgKeys(), screen: 'desktop', full: '1' });
  const openFile = (input: { workspaceId: string; path: string }) =>
    push({ ...orgKeys(), screen: 'files', workspace: input.workspaceId, file: input.path });
  /** Opens a node file by its absolute path on the Files screen (a history entry; Back closes it). */
  const openNodeFile = (input: { path: string }) => push({ ...orgKeys(), screen: 'files', nodeFile: input.path });
  /** Opens a message's attached file on the Files screen (a history entry; Back returns to the conversation). */
  const openContextFile = (input: { locator: string; name: string }) =>
    push({ ...orgKeys(), screen: 'files', contextFile: input.locator, contextFileName: input.name });
  const openMessageReference = (input: { messageId: string; referenceId: string }) =>
    push({ ...orgKeys(), screen: 'messages', message: input.messageId, reference: input.referenceId });

  return {
    screen, openFilePath, openFileWorkspaceId, openNodeFilePath, openContextFileEntry, openReference, desktopFullScreen,
    back, toList, openRun, openView, openNewRun, openFile, openNodeFile, openContextFile, openMessageReference,
    openDesktopFullScreen,
  };
}

/**
 * What a conversation's file open needs from the phone navigation. `useMobileNavigation` reads the route through
 * `inject`, so a component takes it in setup and hands this to code that runs later (autobyteus-427).
 */
export type MobileFileNavigation = Pick<ReturnType<typeof useMobileNavigation>, 'openFile' | 'openNodeFile'>;
