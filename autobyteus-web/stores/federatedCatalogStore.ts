import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getApolloClient } from '~/utils/apolloClient';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { EMBEDDED_NODE_ID, type NodeProfile } from '~/types/node';
import { FederatedNodeCatalogQuery } from '~/graphql/queries/federatedCatalogQueries';

export type FederatedNodeStatus = 'ready' | 'degraded' | 'unreachable';

export interface FederatedAgentRef {
  homeNodeId: string;
  definitionId: string;
  name: string;
  role: string;
  description: string;
  avatarUrl?: string | null;
  toolNames?: string[];
  skillNames?: string[];
}

export interface FederatedTeamRef {
  homeNodeId: string;
  definitionId: string;
  name: string;
  description: string;
  role?: string | null;
  avatarUrl?: string | null;
  coordinatorMemberName: string;
  memberCount: number;
  nestedTeamCount: number;
}

export interface CatalogNodeScope {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  status: FederatedNodeStatus;
  errorMessage?: string | null;
  agents: FederatedAgentRef[];
  teams: FederatedTeamRef[];
}

type FederatedCatalogQueryResult = {
  federatedNodeCatalog: CatalogNodeScope[];
};

const normalizeNodeOrder = (nodes: CatalogNodeScope[], localNodeId: string): CatalogNodeScope[] => {
  const copy = [...nodes];
  copy.sort((left, right) => {
    if (left.nodeId === localNodeId && right.nodeId !== localNodeId) {
      return -1;
    }
    if (right.nodeId === localNodeId && left.nodeId !== localNodeId) {
      return 1;
    }
    return left.nodeName.localeCompare(right.nodeName);
  });
  return copy;
};

const normalizeScope = (scope: CatalogNodeScope): CatalogNodeScope => ({
  nodeId: scope.nodeId,
  nodeName: scope.nodeName,
  baseUrl: scope.baseUrl,
  status: scope.status,
  errorMessage: scope.errorMessage ?? null,
  agents: Array.isArray(scope.agents)
    ? scope.agents.map((agent) => ({
      ...agent,
      toolNames: Array.isArray(agent.toolNames)
        ? agent.toolNames.filter((entry): entry is string => typeof entry === 'string')
        : [],
      skillNames: Array.isArray(agent.skillNames)
        ? agent.skillNames.filter((entry): entry is string => typeof entry === 'string')
        : [],
    }))
    : [],
  teams: Array.isArray(scope.teams)
    ? scope.teams.map((team) => ({
      ...team,
      memberCount: Number.isFinite(team.memberCount) ? team.memberCount : 0,
      nestedTeamCount: Number.isFinite(team.nestedTeamCount) ? team.nestedTeamCount : 0,
    }))
    : [],
});

const toNodeInput = (nodes: NodeProfile[]): Array<{ nodeId: string; nodeName: string; baseUrl: string; nodeType?: string | null }> =>
  nodes.map((node) => ({
    nodeId: node.id,
    nodeName: node.name,
    baseUrl: node.baseUrl,
    nodeType: node.nodeType,
  }));

export const useFederatedCatalogStore = defineStore('federatedCatalog', () => {
  const catalogByNode = ref<CatalogNodeScope[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const nodeStore = useNodeStore();
  const windowNodeContextStore = useWindowNodeContextStore();

  const localNodeId = computed(() => windowNodeContextStore.nodeId || EMBEDDED_NODE_ID);

  const allAgents = computed(() =>
    catalogByNode.value.flatMap((scope) =>
      scope.agents.map((agent) => ({
        ...agent,
        nodeId: scope.nodeId,
        nodeName: scope.nodeName,
        status: scope.status,
      })),
    ),
  );

  const allTeams = computed(() =>
    catalogByNode.value.flatMap((scope) =>
      scope.teams.map((team) => ({
        ...team,
        nodeId: scope.nodeId,
        nodeName: scope.nodeName,
        status: scope.status,
      })),
    ),
  );

  const findAgentByNodeAndId = (homeNodeId: string, definitionId: string): FederatedAgentRef | null => {
    const scope = catalogByNode.value.find((entry) => entry.nodeId === homeNodeId);
    if (!scope) {
      return null;
    }
    return scope.agents.find((agent) => agent.definitionId === definitionId) ?? null;
  };

  const findTeamByNodeAndId = (homeNodeId: string, definitionId: string): FederatedTeamRef | null => {
    const scope = catalogByNode.value.find((entry) => entry.nodeId === homeNodeId);
    if (!scope) {
      return null;
    }
    return scope.teams.find((team) => team.definitionId === definitionId) ?? null;
  };

  const applyCatalog = (nodes: CatalogNodeScope[]): void => {
    catalogByNode.value = normalizeNodeOrder(nodes.map(normalizeScope), localNodeId.value);
  };

  const queryCatalog = async (fetchPolicy?: 'cache-first' | 'network-only'): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      if (!nodeStore.initialized) {
        await nodeStore.initializeRegistry();
      }

      const isReady = await windowNodeContextStore.waitForBoundBackendReady();
      if (!isReady) {
        throw new Error('Bound backend is not ready');
      }

      const client = getApolloClient();
      const { data, errors } = await client.query<FederatedCatalogQueryResult>({
        query: FederatedNodeCatalogQuery,
        variables: {
          input: {
            nodes: toNodeInput(nodeStore.nodes),
          },
        },
        fetchPolicy: fetchPolicy ?? 'cache-first',
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((item) => item.message).join(', '));
      }

      applyCatalog(data?.federatedNodeCatalog ?? []);
    } catch (nextError) {
      error.value = nextError instanceof Error ? nextError : new Error(String(nextError));
      throw error.value;
    } finally {
      loading.value = false;
    }
  };

  const loadCatalog = async (): Promise<void> => {
    await queryCatalog('cache-first');
  };

  const reloadCatalog = async (): Promise<void> => {
    await queryCatalog('network-only');
  };

  return {
    catalogByNode,
    loading,
    error,
    localNodeId,
    allAgents,
    allTeams,
    loadCatalog,
    reloadCatalog,
    findAgentByNodeAndId,
    findTeamByNodeAndId,
  };
});
