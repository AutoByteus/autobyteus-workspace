import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import { GetAgentTeamDefinitions } from '~/graphql/queries/agentTeamDefinitionQueries';
import { CreateAgentTeamDefinition, UpdateAgentTeamDefinition, DeleteAgentTeamDefinition } from '~/graphql/mutations/agentTeamDefinitionMutations';
import type { GetAgentTeamDefinitionsQuery } from '~/generated/graphql';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { EMBEDDED_NODE_ID } from '~/types/node';

export interface TeamMemberInput {
  memberName: string;
  referenceId: string;
  referenceType: 'AGENT' | 'AGENT_TEAM';
  homeNodeId?: string | null;
}

export interface AgentTeamDefinition {
  __typename?: 'AgentTeamDefinition';
  id: string;
  name: string;
  description: string;
  role?: string | null;
  avatarUrl?: string | null;
  coordinatorMemberName: string;
  nodes: {
    __typename?: 'TeamMember';
    memberName: string;
    referenceId: string;
    referenceType: 'AGENT' | 'AGENT_TEAM';
    homeNodeId?: string | null;
  }[];
}

export interface CreateAgentTeamDefinitionInput {
  name: string;
  description: string;
  coordinatorMemberName: string;
  role?: string | null;
  avatarUrl?: string | null;
  nodes: TeamMemberInput[];
}

export interface UpdateAgentTeamDefinitionInput {
  id: string;
  name?: string | null;
  description?: string | null;
  coordinatorMemberName?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  nodes?: TeamMemberInput[] | null;
}

const normalizeTeamMember = (member: any): TeamMemberInput => ({
  memberName: String(member?.memberName ?? ''),
  referenceId: String(member?.referenceId ?? ''),
  referenceType: member?.referenceType === 'AGENT_TEAM' ? 'AGENT_TEAM' : 'AGENT',
  homeNodeId: String(member?.homeNodeId ?? '').trim() || EMBEDDED_NODE_ID,
});

const normalizeDefinition = (definition: any): AgentTeamDefinition => ({
  __typename: definition?.__typename,
  id: String(definition?.id ?? ''),
  name: String(definition?.name ?? ''),
  description: String(definition?.description ?? ''),
  role: definition?.role ?? null,
  avatarUrl: definition?.avatarUrl ?? null,
  coordinatorMemberName: String(definition?.coordinatorMemberName ?? ''),
  nodes: Array.isArray(definition?.nodes)
    ? definition.nodes.map(normalizeTeamMember)
    : [],
});

export const useAgentTeamDefinitionStore = defineStore('agentTeamDefinition', () => {
  const agentTeamDefinitions = ref<AgentTeamDefinition[]>([]);
  const loading = ref(false);
  const error = ref<any>(null);

  // --- ACTIONS ---

  async function fetchAllAgentTeamDefinitions() {
    if (agentTeamDefinitions.value.length > 0) return;

    const windowNodeContextStore = useWindowNodeContextStore();
    const isReady = await windowNodeContextStore.waitForBoundBackendReady();
    if (!isReady) {
      error.value = new Error('Bound backend is not ready');
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const client = getApolloClient();
      const { data, errors } = await client.query<GetAgentTeamDefinitionsQuery>({
        query: GetAgentTeamDefinitions,
        // Uses default 'cache-first'
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      agentTeamDefinitions.value = (data.agentTeamDefinitions || []).map((definition: any) =>
        normalizeDefinition(definition),
      );
    } catch (e) {
      error.value = e;
      console.error("Failed to fetch agent team definitions:", e);
    } finally {
      loading.value = false;
    }
  }

  async function reloadAllAgentTeamDefinitions() {
    loading.value = true;
    error.value = null;
    try {
      const client = getApolloClient();
      const { data, errors } = await client.query<GetAgentTeamDefinitionsQuery>({
        query: GetAgentTeamDefinitions,
        fetchPolicy: 'network-only',
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      agentTeamDefinitions.value = (data.agentTeamDefinitions || []).map((definition: any) =>
        normalizeDefinition(definition),
      );
    } catch (e) {
      error.value = e;
      console.error("Failed to reload agent team definitions:", e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createAgentTeamDefinition(input: CreateAgentTeamDefinitionInput): Promise<AgentTeamDefinition | null> {
    try {
      const client = getApolloClient();
      const cleanedInput = JSON.parse(JSON.stringify(input));
      if (cleanedInput.nodes) {
        cleanedInput.nodes = cleanedInput.nodes.map((node: any) => {
          const nextNode = { ...node };
          delete nextNode.__typename;
          nextNode.homeNodeId = String(nextNode.homeNodeId ?? '').trim() || EMBEDDED_NODE_ID;
          return nextNode;
        });
      }

      const { data, errors } = await client.mutate({
        mutation: CreateAgentTeamDefinition,
        variables: { input: cleanedInput },
        refetchQueries: [{ query: GetAgentTeamDefinitions }]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.createAgentTeamDefinition) {
        // The refetch will update the cache and trigger reactivity.
        // We need to wait for the data to be available in the store.
        await client.query({ query: GetAgentTeamDefinitions, fetchPolicy: 'network-only' }).then(({ data }) => {
          agentTeamDefinitions.value = (data.agentTeamDefinitions || []).map((definition: any) =>
            normalizeDefinition(definition),
          );
        });
        return getAgentTeamDefinitionById.value(data.createAgentTeamDefinition.id);
      }
      return null;
    } catch (e) {
      error.value = e;
      console.error("Failed to create agent team definition:", e);
      throw e;
    }
  }

  async function updateAgentTeamDefinition(input: UpdateAgentTeamDefinitionInput): Promise<AgentTeamDefinition | null> {
    try {
      const client = getApolloClient();
      const cleanedInput = JSON.parse(JSON.stringify(input));
      if (cleanedInput.nodes) {
        cleanedInput.nodes = cleanedInput.nodes.map((node: any) => {
          const nextNode = { ...node };
          delete nextNode.__typename;
          nextNode.homeNodeId = String(nextNode.homeNodeId ?? '').trim() || EMBEDDED_NODE_ID;
          return nextNode;
        });
      }

      const { data, errors } = await client.mutate({
        mutation: UpdateAgentTeamDefinition,
        variables: { input: cleanedInput },
        refetchQueries: [{ query: GetAgentTeamDefinitions }]
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      if (data?.updateAgentTeamDefinition) {
        await client.query({ query: GetAgentTeamDefinitions, fetchPolicy: 'network-only' }).then(({ data }) => {
          agentTeamDefinitions.value = (data.agentTeamDefinitions || []).map((definition: any) =>
            normalizeDefinition(definition),
          );
        });
        return getAgentTeamDefinitionById.value(data.updateAgentTeamDefinition.id);
      }
      return null;
    } catch (e) {
      error.value = e;
      console.error("Failed to update agent team definition:", e);
      throw e;
    }
  }
  
  async function deleteAgentTeamDefinition(id: string): Promise<boolean> {
    try {
      const client = getApolloClient();
      const { data, errors } = await client.mutate({
        mutation: DeleteAgentTeamDefinition,
        variables: { id },
        update: (cache) => {
          cache.modify({
            fields: {
              agentTeamDefinitions(existingDefs: any[], { readField }) {
                const newDefs = existingDefs.filter(defRef => readField('id', defRef) !== id);
                return newDefs;
              }
            }
          });
          cache.evict({ id: cache.identify({ __typename: 'AgentTeamDefinition', id }) });
          cache.gc();
        }
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      const success = !!data?.deleteAgentTeamDefinition?.success;
      if (success) {
        agentTeamDefinitions.value = agentTeamDefinitions.value.filter((def) => def.id !== id);
      }
      return success;
    } catch (e) {
      error.value = e;
      console.error("Failed to delete agent team definition:", e);
      throw e;
    }
  }

  // --- GETTERS ---
  const getAgentTeamDefinitionById = computed(() => {
    return (id: string) => agentTeamDefinitions.value.find(def => def.id === id) || null;
  });

  const getAgentTeamDefinitionByName = computed(() => {
    return (name: string) => agentTeamDefinitions.value.find(def => def.name === name) || null;
  });

  return {
    agentTeamDefinitions,
    loading,
    error,
    fetchAllAgentTeamDefinitions,
    reloadAllAgentTeamDefinitions,
    createAgentTeamDefinition,
    updateAgentTeamDefinition,
    deleteAgentTeamDefinition,
    getAgentTeamDefinitionById,
    getAgentTeamDefinitionByName,
  };
});
