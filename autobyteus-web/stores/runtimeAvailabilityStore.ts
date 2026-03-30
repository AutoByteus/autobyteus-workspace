import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_RUNTIME_AVAILABILITIES } from '~/graphql/queries/runtime_availability_queries';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRuntimeKind } from '~/types/agent/AgentRunConfig';

export interface RuntimeAvailability {
  runtimeKind: AgentRuntimeKind;
  enabled: boolean;
  reason: string | null;
}

export const useRuntimeAvailabilityStore = defineStore('runtimeAvailability', {
  state: () => ({
    availabilities: [] as RuntimeAvailability[],
    isLoading: false,
    hasFetched: false,
  }),
  getters: {
    availabilityByKind: (state) => (runtimeKind: AgentRuntimeKind): RuntimeAvailability | null => {
      return state.availabilities.find((availability) => availability.runtimeKind === runtimeKind) ?? null;
    },
    isRuntimeEnabled(): (runtimeKind: AgentRuntimeKind) => boolean {
      return (runtimeKind: AgentRuntimeKind) => {
        const availability = this.availabilityByKind(runtimeKind);
        if (!availability) {
          return runtimeKind === DEFAULT_AGENT_RUNTIME_KIND;
        }
        return availability.enabled;
      };
    },
    runtimeReason(): (runtimeKind: AgentRuntimeKind) => string | null {
      return (runtimeKind: AgentRuntimeKind) => this.availabilityByKind(runtimeKind)?.reason ?? null;
    },
  },
  actions: {
    async fetchRuntimeAvailabilities(force = false) {
      if (this.hasFetched && !force) {
        return this.availabilities;
      }
      this.isLoading = true;
      try {
        const client = getApolloClient();
        const { data } = await client.query({
          query: GET_RUNTIME_AVAILABILITIES,
          fetchPolicy: force ? 'network-only' : 'cache-first',
        });

        const rows = Array.isArray(data?.runtimeAvailabilities) ? data.runtimeAvailabilities : [];
        this.availabilities = rows
          .filter((row: any) => row && typeof row.runtimeKind === 'string')
          .map((row: any) => ({
            runtimeKind: row.runtimeKind as AgentRuntimeKind,
            enabled: row.enabled === true,
            reason: typeof row.reason === 'string' && row.reason.trim().length > 0 ? row.reason : null,
          }));

        this.hasFetched = true;
        return this.availabilities;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
