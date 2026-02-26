import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_RUNTIME_CAPABILITIES } from '~/graphql/queries/runtime_capability_queries';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRuntimeKind } from '~/types/agent/AgentRunConfig';

export interface RuntimeCapability {
  runtimeKind: AgentRuntimeKind;
  enabled: boolean;
  reason: string | null;
}

export const useRuntimeCapabilitiesStore = defineStore('runtimeCapabilities', {
  state: () => ({
    capabilities: [] as RuntimeCapability[],
    isLoading: false,
    hasFetched: false,
  }),
  getters: {
    capabilityByKind: (state) => (runtimeKind: AgentRuntimeKind): RuntimeCapability | null => {
      return state.capabilities.find((capability) => capability.runtimeKind === runtimeKind) ?? null;
    },
    isRuntimeEnabled(): (runtimeKind: AgentRuntimeKind) => boolean {
      return (runtimeKind: AgentRuntimeKind) => {
        const capability = this.capabilityByKind(runtimeKind);
        if (!capability) {
          return runtimeKind === DEFAULT_AGENT_RUNTIME_KIND;
        }
        return capability.enabled;
      };
    },
    runtimeReason(): (runtimeKind: AgentRuntimeKind) => string | null {
      return (runtimeKind: AgentRuntimeKind) => this.capabilityByKind(runtimeKind)?.reason ?? null;
    },
  },
  actions: {
    async fetchRuntimeCapabilities(force = false) {
      if (this.hasFetched && !force) {
        return this.capabilities;
      }
      this.isLoading = true;
      try {
        const client = getApolloClient();
        const { data } = await client.query({
          query: GET_RUNTIME_CAPABILITIES,
          fetchPolicy: force ? 'network-only' : 'cache-first',
        });

        const rows = Array.isArray(data?.runtimeCapabilities) ? data.runtimeCapabilities : [];
        this.capabilities = rows
          .filter((row: any) => row && typeof row.runtimeKind === 'string')
          .map((row: any) => ({
            runtimeKind: row.runtimeKind as AgentRuntimeKind,
            enabled: row.enabled === true,
            reason: typeof row.reason === 'string' && row.reason.trim().length > 0 ? row.reason : null,
          }));

        this.hasFetched = true;
        return this.capabilities;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
