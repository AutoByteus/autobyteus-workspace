import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_RUNTIME_AVAILABILITY, GET_RUNTIME_AVAILABILITY_KINDS } from '~/graphql/queries/runtime_availability_queries';
import type { AgentRuntimeKind } from '~/types/agent/AgentRunConfig';

export interface RuntimeAvailability {
  runtimeKind: AgentRuntimeKind;
  enabled: boolean;
  reason: string | null;
}
type CapabilityRequest = { sequence: number; status: 'pending' | 'ready' | 'error'; error: string | null };
// Requests belong to one state incarnation. A Pinia reset cannot revive old responses.
const pendingByState = new WeakMap<object, Map<string, Promise<RuntimeAvailability | null>>>();
const collectionByState = new WeakMap<object, Promise<RuntimeAvailability[]>>();

export const useRuntimeAvailabilityStore = defineStore('runtimeAvailability', {
  state: () => ({
    availabilities: [] as RuntimeAvailability[],
    requestsByKind: {} as Record<string, CapabilityRequest>,
    isLoading: false,
    hasFetched: false,
    inventoryError: null as string | null,
    collectionSequence: 0,
  }),
  getters: {
    availabilityByKind: (state) => (kind: AgentRuntimeKind): RuntimeAvailability | null =>
      state.availabilities.find(row => row.runtimeKind === kind) ?? null,
    isRuntimePending: (state) => (kind: AgentRuntimeKind): boolean =>
      !state.requestsByKind[kind] || state.requestsByKind[kind]?.status === 'pending',
    isRuntimeEnabled(): (kind: AgentRuntimeKind) => boolean {
      return kind => this.requestsByKind[kind]?.status === 'ready' && this.availabilityByKind(kind)?.enabled === true;
    },
    runtimeReason(): (kind: AgentRuntimeKind) => string | null {
      return kind => this.requestsByKind[kind]?.error ?? this.availabilityByKind(kind)?.reason ?? null;
    },
  },
  actions: {
    fetchRuntimeAvailability(runtimeKind: AgentRuntimeKind, force = false): Promise<RuntimeAvailability | null> {
      const kind = runtimeKind.trim() as AgentRuntimeKind;
      if (!kind) return Promise.reject(new Error('runtimeKind is required.'));
      const state = this.requestsByKind;
      let pending = pendingByState.get(state);
      if (!pending) { pending = new Map(); pendingByState.set(state, pending); }
      if (!force && pending.has(kind)) return pending.get(kind)!;
      if (!force && state[kind]?.status === 'ready') return Promise.resolve(this.availabilityByKind(kind));
      const sequence = (state[kind]?.sequence ?? 0) + 1;
      state[kind] = { sequence, status: 'pending', error: null };
      const current = () => this.requestsByKind === state && state[kind]?.sequence === sequence;
      const request = (async () => {
        try {
          const result = await getApolloClient().query({
            query: GET_RUNTIME_AVAILABILITY, variables: { runtimeKind: kind },
            fetchPolicy: 'network-only', context: { queryDeduplication: false },
          });
          if (result.errors?.length) throw new Error(result.errors.map((e: { message: string }) => e.message).join(', '));
          const raw = result.data?.runtimeAvailability;
          if (!raw || raw.runtimeKind !== kind || typeof raw.enabled !== 'boolean'
            || !(raw.reason === null || typeof raw.reason === 'string')) throw new Error(`Invalid runtime capability for '${kind}'.`);
          const row: RuntimeAvailability = { runtimeKind: kind, enabled: raw.enabled, reason: raw.reason };
          if (!current()) return null;
          this.availabilities = [...this.availabilities.filter(row => row.runtimeKind !== kind), row];
          state[kind] = { sequence, status: 'ready', error: null };
          return row;
        } catch (cause) {
          if (!current()) return null;
          state[kind] = { sequence, status: 'error', error: cause instanceof Error ? cause.message : String(cause) };
          throw cause;
        } finally {
          if (current()) pending!.delete(kind);
        }
      })();
      pending.set(kind, request);
      return request;
    },

    fetchRuntimeAvailabilities(force = false): Promise<RuntimeAvailability[]> {
      if (this.hasFetched && !force) return Promise.resolve(this.availabilities);
      const state = this.requestsByKind;
      if (!force && collectionByState.has(state)) return collectionByState.get(state)!;
      const sequence = ++this.collectionSequence;
      const current = () => this.requestsByKind === state && this.collectionSequence === sequence;
      this.isLoading = true;
      this.inventoryError = null;
      const request = (async () => {
        try {
          const result = await getApolloClient().query({
            query: GET_RUNTIME_AVAILABILITY_KINDS, fetchPolicy: force ? 'network-only' : 'cache-first',
            context: { queryDeduplication: false },
          });
          if (result.errors?.length) throw new Error(result.errors.map((e: { message: string }) => e.message).join(', '));
          const kinds = result.data?.runtimeAvailabilityKinds;
          if (!Array.isArray(kinds) || !kinds.every(kind => typeof kind === 'string' && kind.trim())) throw new Error('Invalid runtime kind inventory.');
          if (!current()) return this.availabilities;
          // Each action publishes independently; the collection promise still waits for every kind.
          await Promise.allSettled(kinds.map(kind => this.fetchRuntimeAvailability(kind, force)));
          // A selected-kind retry may supersede work started by this collection.
          // Collection callers still await every inventoried kind's current verification.
          while (current()) {
            const outstanding = kinds.map(kind => pendingByState.get(state)?.get(kind))
              .filter((request): request is Promise<RuntimeAvailability | null> => Boolean(request));
            if (!outstanding.length) break;
            await Promise.allSettled(outstanding);
          }
          if (!current()) return this.availabilities;
          const failure = kinds.map(kind => state[kind]?.error).find(Boolean);
          if (failure) throw new Error(failure);
          this.hasFetched = true;
          return this.availabilities;
        } catch (cause) {
          if (current()) this.inventoryError = cause instanceof Error ? cause.message : String(cause);
          throw cause;
        } finally {
          if (current()) { this.isLoading = false; collectionByState.delete(state); }
        }
      })();
      collectionByState.set(state, request);
      return request;
    },
  },
});
