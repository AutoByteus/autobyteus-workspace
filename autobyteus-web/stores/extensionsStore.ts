import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { GetExtensionLog, GetExtensions } from '~/graphql/queries/extensionsQueries';
import {
  InstallExtension,
  RemoveExtension,
  SetExtensionEnabled,
  UpdateExtension,
} from '~/graphql/mutations/extensionsMutations';
import { callExtensionAction } from '~/services/extensions/extensionActionClient';
import { useVoiceInputStore } from '~/stores/voiceInputStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { ExtensionItem, ExtensionList } from '~/types/extensions';
import { getApolloClient } from '~/utils/apolloClient';

/** While an item is installing, updating or starting, the page reads the list again this often (DS-009). */
export const EXTENSIONS_POLL_INTERVAL_MS = 1000;

type PendingAction = 'install' | 'update' | 'remove' | 'switch';

interface ExtensionsStoreState {
  /** The extensions of this window's node; null until the first read answers. */
  list: ExtensionList | null;
  /** The node refused the list: this desktop holds no owner credential for it (REQ-005). */
  notOwner: boolean;
  error: string | null;
  /** The lifecycle request this window sent and is waiting for, per extension. */
  pending: Record<string, PendingAction>;
  /** Installed from this window just now: the card says "Installed and on." while it starts (TR-001). */
  justInstalled: Record<string, boolean>;
  openPages: Record<string, boolean>;
  logFor: string | null;
  logLines: string[];
  removeFor: string | null;
  pageOpen: boolean;
  bindingRevision: number;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;
const graphqlCode = (error: unknown): string | undefined =>
  (error as { graphQLErrors?: { extensions?: { code?: string } }[] })?.graphQLErrors?.[0]?.extensions?.code;
const isRefusal = (error: unknown): boolean => {
  const status = (error as { networkError?: { statusCode?: number } })?.networkError?.statusCode;
  return graphqlCode(error) === 'NODE_ROUTE_NOT_PERMITTED' || status === 401 || status === 403;
};
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
/** What this computer's microphone button depends on (design AR-001): installed, on and ready. */
const voiceAvailabilityOf = (list: ExtensionList | null): string => {
  const voice = list?.extensions.find((item) => item.id === 'voice-input');
  return voice ? `${voice.state}:${voice.enabled}:${voice.ready}` : 'none';
};

/**
 * Settings → Extensions: the extensions of this window's node (REQ-001, REQ-011), through its owner-only GraphQL
 * (extension-contract.md §6). Install and Update return at once; the list is read again every second while an item is
 * installing, updating or starting. A change to `voice-input` on the desktop's own node tells this computer's voice
 * store to read its availability again.
 */
export const useExtensionsStore = defineStore('extensions', {
  state: (): ExtensionsStoreState => ({
    list: null,
    notOwner: false,
    error: null,
    pending: {},
    justInstalled: {},
    openPages: {},
    logFor: null,
    logLines: [],
    removeFor: null,
    pageOpen: false,
    bindingRevision: -1,
  }),

  getters: {
    items: (state): ExtensionItem[] => state.list?.extensions ?? [],
    /** Install and Update need a catalog this node just verified (V13-01, V13-03). */
    canInstall: (state): boolean => state.list?.catalog === 'verified',
    itemOf: (state) => (id: string): ExtensionItem | null => state.list?.extensions.find((item) => item.id === id) ?? null,
    isBusy: (state): boolean => (state.list?.extensions ?? [])
      .some((item) => item.state === 'installing' || item.state === 'updating' || item.starting),
  },

  actions: {
    /** The Extensions page opened: read the list with a fresh catalog fetch, and keep it current while it is open. */
    async open(): Promise<void> {
      const windowNode = useWindowNodeContextStore();
      if (this.bindingRevision !== windowNode.bindingRevision) {
        this.$reset();
        this.bindingRevision = windowNode.bindingRevision;
      }
      this.pageOpen = true;
      await this.refresh(true);
    },

    close(): void {
      this.pageOpen = false;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    },

    async refresh(refreshCatalog = false): Promise<void> {
      try {
        const { data } = await getApolloClient().query<{ extensions: ExtensionList }>({
          query: GetExtensions, variables: { refreshCatalog }, fetchPolicy: 'no-cache',
        });
        const voiceBefore = voiceAvailabilityOf(this.list);
        this.list = data.extensions;
        // An install, update or start that this page follows ends later than its mutation: when this computer's Voice
        // Input changes, its microphone buttons read it again.
        if (this.list && voiceBefore !== voiceAvailabilityOf(this.list) && useWindowNodeContextStore().isEmbeddedWindow) {
          void useVoiceInputStore().refreshAvailability();
        }
        this.notOwner = false;
        this.error = null;
        for (const id of Object.keys(this.justInstalled)) {
          const item = this.itemOf(id);
          if (!item || item.state === 'failed' || (item.state === 'installed' && !item.starting)) delete this.justInstalled[id];
        }
      } catch (error) {
        if (isRefusal(error)) this.notOwner = true;
        else this.error = messageOf(error);
      }
      this.schedulePoll();
    },

    schedulePoll(): void {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
      if (this.pageOpen && this.isBusy) pollTimer = setTimeout(() => { void this.refresh(); }, EXTENSIONS_POLL_INTERVAL_MS);
    },

    async install(id: string): Promise<void> {
      if (await this.lifecycle(id, 'install', InstallExtension, 'installExtension')) this.justInstalled[id] = true;
    },
    async update(id: string): Promise<void> {
      await this.lifecycle(id, 'update', UpdateExtension, 'updateExtension');
    },
    async setEnabled(id: string, enabled: boolean): Promise<void> {
      delete this.justInstalled[id];
      await this.lifecycle(id, 'switch', SetExtensionEnabled, 'setExtensionEnabled', { enabled });
    },
    async remove(id: string): Promise<void> {
      this.removeFor = null;
      delete this.justInstalled[id];
      if (await this.lifecycle(id, 'remove', RemoveExtension, 'removeExtension')) this.openPages[id] = false;
    },

    /** Sends one lifecycle mutation to this window's node and shows its answer; a refusal is shown as a toast. */
    async lifecycle(
      id: string,
      action: PendingAction,
      mutation: typeof InstallExtension,
      field: string,
      variables: Record<string, unknown> = {},
    ): Promise<boolean> {
      if (this.pending[id]) return false;
      this.pending[id] = action;
      let done = false;
      try {
        const { data } = await getApolloClient().mutate<Record<string, ExtensionItem | null>>({
          mutation, variables: { id, ...variables },
        });
        const item = data?.[field] ?? null;
        if (this.list && item) this.list.extensions = this.list.extensions.map((existing) => (existing.id === id ? item : existing));
        done = true;
      } catch (error) {
        useToasts().addToast(messageOf(error), 'error');
      } finally {
        delete this.pending[id];
      }
      if (id === 'voice-input' && useWindowNodeContextStore().isEmbeddedWindow) void useVoiceInputStore().refreshAvailability();
      await this.refresh();
      return done;
    },

    togglePage(id: string): void {
      this.openPages[id] = !this.openPages[id];
    },

    async showLog(id: string): Promise<void> {
      this.logFor = id;
      this.logLines = [];
      try {
        const { data } = await getApolloClient().query<{ extensionLog: string[] }>({
          query: GetExtensionLog, variables: { id }, fetchPolicy: 'no-cache',
        });
        if (this.logFor === id) this.logLines = data.extensionLog;
      } catch (error) {
        useToasts().addToast(messageOf(error), 'error');
      }
    },

    /** An extension page's call through the bridge: an action of that extension on this window's node. */
    callAction(id: string, action: string, input: unknown): Promise<unknown> {
      return callExtensionAction(useWindowNodeContextStore().nodeBaseUrl, id, action, { json: input });
    },
  },
});
