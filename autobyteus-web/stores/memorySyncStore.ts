import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_MEMORY_SYNC_STATUS, LIST_MEMORY_HUB_URL_CANDIDATES } from '~/graphql/queries/memorySyncQueries';
import { CREATE_MEMORY_HUB_SOURCE_CREDENTIAL, REGENERATE_MEMORY_HUB_SOURCE_CREDENTIAL, REVOKE_MEMORY_HUB_SOURCE_CREDENTIAL, START_MEMORY_SYNC, TEST_MEMORY_HUB_CONNECTION, UPDATE_MEMORY_HUB_CONFIG, UPDATE_MEMORY_SYNC_SOURCE_CONFIG } from '~/graphql/mutations/memorySyncMutations';

export interface MemoryHubCredentialSummary {
  credentialId: string;
  label?: string | null;
  boundSourceNodeId?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  status: string;
}

export interface MemoryImportSummary {
  sourceNodeId: string;
  displayName?: string | null;
  lastKnownEndpoint?: string | null;
  lastImportedAt?: string | null;
  lastSyncStatus?: string | null;
  lastError?: string | null;
  fileCount: number;
  totalBytes: number;
}

export interface MemorySyncStatus {
  hub: { enabled: boolean; advertisedHubBaseUrl?: string | null; updatedAt?: string | null };
  source: {
    enabled: boolean;
    sourceNodeId?: string | null;
    displayName?: string | null;
    hubBaseUrl?: string | null;
    hubTokenConfigured: boolean;
    hubTokenPreview?: string | null;
    backgroundEnabled: boolean;
    intervalMs: number;
    batchSize: number;
    updatedAt?: string | null;
  };
  connectionInfo: {
    hubEnabled: boolean;
    advertisedHubBaseUrl?: string | null;
    ingestEndpointUrl?: string | null;
    healthEndpointUrl?: string | null;
    secureTransportWarning?: string | null;
    credentials: MemoryHubCredentialSummary[];
  };
  sourceState?: { jobState: string; lastSuccessfulSyncAt?: string | null; lastError?: string | null; trackedFileCount: number } | null;
  imports: MemoryImportSummary[];
  oneTimePlaintextToken?: string | null;
}

export interface ServerAddressCandidate { id: string; kind: string; label: string; baseUrl: string; source: string }

export type ConnectionTestMode = 'saved' | 'draft';

export type ConnectionTestRequest =
  | { mode: 'saved' }
  | { mode: 'draft'; hubBaseUrl: string; sourceNodeId: string; token: string };

export interface ConnectionTestResult {
  ok: boolean;
  mode: ConnectionTestMode;
  testedAt: string;
  hubBaseUrl?: string | null;
  sourceNodeId?: string | null;
  hubEnabled?: boolean | null;
  authenticated?: boolean | null;
  message?: string | null;
}

const emptyStatus = (): MemorySyncStatus => ({
  hub: { enabled: false, advertisedHubBaseUrl: null, updatedAt: null },
  source: {
    enabled: false,
    sourceNodeId: null,
    displayName: null,
    hubBaseUrl: null,
    hubTokenConfigured: false,
    hubTokenPreview: null,
    backgroundEnabled: false,
    intervalMs: 60000,
    batchSize: 25,
    updatedAt: null,
  },
  connectionInfo: {
    hubEnabled: false,
    advertisedHubBaseUrl: null,
    ingestEndpointUrl: null,
    healthEndpointUrl: null,
    secureTransportWarning: null,
    credentials: [],
  },
  sourceState: null,
  imports: [],
  oneTimePlaintextToken: null,
});

export const useMemorySyncStore = defineStore('memorySyncStore', {
  state: () => ({
    status: emptyStatus() as MemorySyncStatus,
    candidates: [] as ServerAddressCandidate[],
    loading: false,
    saving: false,
    syncing: false,
    testingConnection: false,
    statusRequestInFlight: false,
    error: null as string | null,
    oneTimeToken: null as string | null,
    connectionTestResult: null as ConnectionTestResult | null,
  }),

  actions: {
    async loadStatus() {
      await this.requestStatus({ showLoading: true, exposeError: true });
    },

    async refreshStatusOnly() {
      await this.requestStatus({ showLoading: false, exposeError: false });
    },

    async requestStatus(options: { showLoading: boolean; exposeError: boolean }) {
      if (this.statusRequestInFlight) {
        return;
      }
      this.statusRequestInFlight = true;
      if (options.showLoading) {
        this.loading = true;
      }
      if (options.exposeError) {
        this.error = null;
      }
      try {
        const { data, errors } = await getApolloClient().query<{ getMemorySyncStatus?: MemorySyncStatus }>({
          query: GET_MEMORY_SYNC_STATUS,
          fetchPolicy: 'network-only',
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        this.applyStatus(data?.getMemorySyncStatus || emptyStatus());
      } catch (error: any) {
        if (options.exposeError) {
          this.error = error?.message || 'Failed to load Memory Sync status.';
        }
      } finally {
        this.statusRequestInFlight = false;
        if (options.showLoading) {
          this.loading = false;
        }
      }
    },

    async loadCandidates(currentNodeBaseUrl?: string | null, manualBaseUrl?: string | null) {
      try {
        const { data } = await getApolloClient().query<{ listMemoryHubUrlCandidates?: ServerAddressCandidate[] }>({
          query: LIST_MEMORY_HUB_URL_CANDIDATES,
          variables: { currentNodeBaseUrl, manualBaseUrl },
          fetchPolicy: 'network-only',
        });
        this.candidates = data?.listMemoryHubUrlCandidates || [];
      } catch {
        this.candidates = [];
      }
    },

    async updateHubConfig(input: { enabled?: boolean; advertisedHubBaseUrl?: string | null }) {
      await this.mutateStatus(UPDATE_MEMORY_HUB_CONFIG, { input });
    },

    async updateSourceConfig(input: Record<string, unknown>) {
      await this.mutateStatus(UPDATE_MEMORY_SYNC_SOURCE_CONFIG, { input });
    },

    async createCredential(label?: string | null, boundSourceNodeId?: string | null) {
      this.saving = true;
      try {
        const { data, errors } = await getApolloClient().mutate<any>({
          mutation: CREATE_MEMORY_HUB_SOURCE_CREDENTIAL,
          variables: { input: { label, boundSourceNodeId } },
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        this.oneTimeToken = data?.createMemoryHubSourceCredential?.plaintextToken || null;
        await this.loadStatus();
      } finally {
        this.saving = false;
      }
    },

    async regenerateCredential(credentialId: string) {
      this.saving = true;
      try {
        const { data, errors } = await getApolloClient().mutate<any>({
          mutation: REGENERATE_MEMORY_HUB_SOURCE_CREDENTIAL,
          variables: { credentialId },
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        this.oneTimeToken = data?.regenerateMemoryHubSourceCredential?.plaintextToken || null;
        await this.loadStatus();
      } finally {
        this.saving = false;
      }
    },

    async revokeCredential(credentialId: string) {
      this.saving = true;
      try {
        await getApolloClient().mutate({ mutation: REVOKE_MEMORY_HUB_SOURCE_CREDENTIAL, variables: { credentialId } });
        await this.loadStatus();
      } finally {
        this.saving = false;
      }
    },

    async testConnection(input: ConnectionTestRequest) {
      if (this.testingConnection) {
        return null;
      }
      this.connectionTestResult = null;
      this.testingConnection = true;
      const testedAt = new Date().toISOString();
      const context = this.connectionTestContext(input);
      try {
        const { data, errors } = await getApolloClient().mutate<any>({
          mutation: TEST_MEMORY_HUB_CONNECTION,
          variables: { input: this.toConnectionTestMutationInput(input) },
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        const result = data?.testMemoryHubConnection;
        this.connectionTestResult = {
          ok: Boolean(result?.ok),
          mode: input.mode,
          testedAt,
          hubBaseUrl: context.hubBaseUrl,
          sourceNodeId: result?.sourceNodeId || context.sourceNodeId,
          hubEnabled: result?.hubEnabled ?? null,
          authenticated: result?.authenticated ?? null,
          message: result?.message || null,
        };
        return result;
      } catch (error: any) {
        this.connectionTestResult = {
          ok: false,
          mode: input.mode,
          testedAt,
          hubBaseUrl: context.hubBaseUrl,
          sourceNodeId: context.sourceNodeId,
          hubEnabled: null,
          authenticated: null,
          message: error?.message || null,
        };
        return null;
      } finally {
        this.testingConnection = false;
      }
    },

    async syncNow() {
      if (this.syncing) {
        return;
      }
      this.syncing = true;
      this.error = null;
      try {
        const { errors } = await getApolloClient().mutate<any>({ mutation: START_MEMORY_SYNC });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        await this.refreshStatusOnly();
      } catch (error: any) {
        this.error = error?.message || 'Sync failed.';
        await this.refreshStatusOnly();
      } finally {
        this.syncing = false;
      }
    },

    async mutateStatus(mutation: any, variables: Record<string, unknown>) {
      this.saving = true;
      this.error = null;
      try {
        const { data, errors } = await getApolloClient().mutate<any>({ mutation, variables });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        const nextStatus = data?.updateMemoryHubConfig || data?.updateMemorySyncSourceConfig;
        if (nextStatus) this.applyStatus(nextStatus);
      } catch (error: any) {
        this.error = error?.message || 'Failed to save Memory Sync settings.';
        throw error;
      } finally {
        this.saving = false;
      }
    },

    applyStatus(status: MemorySyncStatus) {
      this.status = status;
      if (status.oneTimePlaintextToken) {
        this.oneTimeToken = status.oneTimePlaintextToken;
      }
    },

    connectionTestContext(input: ConnectionTestRequest): { hubBaseUrl?: string | null; sourceNodeId?: string | null } {
      if (input.mode === 'draft') {
        return { hubBaseUrl: input.hubBaseUrl, sourceNodeId: input.sourceNodeId };
      }
      return {
        hubBaseUrl: this.status.source.hubBaseUrl,
        sourceNodeId: this.status.source.sourceNodeId,
      };
    },

    toConnectionTestMutationInput(input: ConnectionTestRequest): Record<string, unknown> {
      if (input.mode === 'draft') {
        return {
          mode: 'DRAFT',
          hubBaseUrl: input.hubBaseUrl,
          sourceNodeId: input.sourceNodeId,
          token: input.token,
        };
      }
      return { mode: 'SAVED' };
    },
  },
});
