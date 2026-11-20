import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { AGENT_SEMANTIC_MEMORY_FOLDER, GLOBAL_SEMANTIC_MEMORY_FOLDER } from '~/graphql/queries/semanticMemoryQueries';

/** A semantic memory folder as the node reports it; reading it never creates it. */
export interface SemanticMemoryFolderState {
  folderPath: string;
  exists: boolean;
  isEmpty: boolean;
}

/**
 * The transient, read-only workspace the node opens for a semantic memory folder (autobyteus-554): an agent's
 * (`semantic_ws_<encoded definition ID>`) or the node's global one (`semantic_global_ws`). `null` is Global.
 */
export const semanticMemoryWorkspaceId = (agentDefinitionId: string | null): string =>
  agentDefinitionId === null ? 'semantic_global_ws' : `semantic_ws_${encodeURIComponent(agentDefinitionId)}`;

const ownerKeyOf = (agentDefinitionId: string | null) => (agentDefinitionId === null ? 'GLOBAL' : `AGENT:${agentDefinitionId}`);

interface SemanticMemoryFolderStoreState {
  /** Whose folder is loaded: `GLOBAL` or `AGENT:<id>`. */
  ownerKey: string | null;
  folder: SemanticMemoryFolderState | null;
  loading: boolean;
  error: string | null;
  requestId: number;
}

/** The Memory page's semantic memory folder state (an agent's Semantic tab, or Global); this node's only. */
export const useSemanticMemoryFolderStore = defineStore('semanticMemoryFolderStore', {
  state: (): SemanticMemoryFolderStoreState => ({ ownerKey: null, folder: null, loading: false, error: null, requestId: 0 }),

  actions: {
    folderOf(agentDefinitionId: string | null): SemanticMemoryFolderState | null {
      return this.ownerKey === ownerKeyOf(agentDefinitionId) ? this.folder : null;
    },

    async open(agentDefinitionId: string | null): Promise<void> {
      const ownerKey = ownerKeyOf(agentDefinitionId);
      if (this.ownerKey !== ownerKey) {
        this.ownerKey = ownerKey;
        this.folder = null;
      }
      const requestId = ++this.requestId;
      this.loading = true;
      this.error = null;
      try {
        const { data, errors } = agentDefinitionId === null
          ? await getApolloClient().query<any>({ query: GLOBAL_SEMANTIC_MEMORY_FOLDER, fetchPolicy: 'network-only' })
          : await getApolloClient().query<any>({ query: AGENT_SEMANTIC_MEMORY_FOLDER, variables: { agentDefinitionId }, fetchPolicy: 'network-only' });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        if (requestId !== this.requestId) return;
        this.folder = (agentDefinitionId === null ? data?.globalSemanticMemoryFolder : data?.agentSemanticMemoryFolder) ?? null;
      } catch (error: any) {
        if (requestId === this.requestId) this.error = error?.message || 'Failed to read the folder.';
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },

    clear() {
      this.ownerKey = null;
      this.folder = null;
      this.error = null;
      this.loading = false;
      this.requestId += 1;
    },
  },
});
