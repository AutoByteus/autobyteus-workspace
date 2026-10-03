import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentDefinitionStore, type AgentDefinition } from '../agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '../agentTeamDefinitionStore';
import { GetAgentDefinitions } from '~/graphql/queries/agentDefinitionQueries';
import { GetAgentTeamDefinitions } from '~/graphql/queries/agentTeamDefinitionQueries';
import { RefreshAgentTeamDefinitionCatalog } from '~/graphql/mutations/agentTeamDefinitionMutations';
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId';

const { query, mutate } = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query, mutate }) }));
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }),
}));

const teamId = 'bridge-team';
const workerId = buildTeamLocalAgentDefinitionId(teamId, 'worker');
const agentsAt = (version: number): AgentDefinition[] => [workerId, 'shared-worker'].map((id) => ({
  id, name: id === workerId ? 'Worker' : 'Shared Worker',
  instructions: `Instructions v${version}`, description: `Description v${version}`,
  toolNames: [`tool-v${version}`], skillNames: [], skillScope: 'CONFIGURED',
  inputProcessorNames: [], llmResponseProcessorNames: [], lifecycleProcessorNames: [],
  toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [],
  ownershipScope: id === workerId ? 'TEAM_LOCAL' : 'SHARED',
  ownerTeamId: id === workerId ? teamId : null,
}));
const teamsAt = (version: number) => [{
  id: teamId, name: 'Bridge', description: `Team v${version}`, instructions: `Team instructions v${version}`,
  coordinatorMemberName: 'worker', ownershipScope: 'SHARED' as const,
  nodes: [
    { memberName: 'worker', ref: 'worker', refScope: 'TEAM_LOCAL' as const },
    { memberName: 'shared', ref: 'shared-worker', refScope: 'SHARED' as const },
  ],
}];
function respondAt(version: number) {
  query.mockImplementation(async ({ query: operation }) => {
    if (operation === GetAgentDefinitions) return { data: { agentDefinitions: agentsAt(version) } };
    if (operation === GetAgentTeamDefinitions) return { data: { agentTeamDefinitions: teamsAt(version) } };
    throw new Error('Unexpected catalog operation');
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('explicit Team Reload member publication', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    mutate.mockResolvedValue({ data: { refreshAgentTeamDefinitionCatalog: true } });
  });

  it('preserves first discovery, then refreshes warmed scoped/shared members on every Reload', async () => {
    const agents = useAgentDefinitionStore();
    const teams = useAgentTeamDefinitionStore();
    respondAt(1);
    await teams.fetchAllAgentTeamDefinitions();
    await agents.fetchAllAgentDefinitions();
    expect(agents.getAgentDefinitionById(workerId)?.instructions).toBe('Instructions v1');
    for (const version of [2, 3]) {
      query.mockClear();
      respondAt(version);
      // Ordinary detail fetches still preserve the warmed-cache fast path.
      await agents.fetchAllAgentDefinitions();
      expect(query).not.toHaveBeenCalled();
      await teams.refreshAndReloadAllAgentTeamDefinitions();
      expect(query.mock.calls.map(([request]) => request)).toEqual([
        { query: GetAgentDefinitions, fetchPolicy: 'network-only' },
        { query: GetAgentTeamDefinitions, fetchPolicy: 'network-only' },
      ]);
      expect(agents.agentDefinitions).toEqual(agentsAt(version));
      expect(teams.agentTeamDefinitions).toEqual(teamsAt(version));
      expect(agents.sharedAgentDefinitions.map((agent) => agent.id)).toEqual(['shared-worker']);
      expect(agents.teamLocalAgentDefinitions.map((agent) => agent.id)).toEqual([workerId]);
      expect(agents.getAgentDefinitionById(workerId)?.ownerTeamId).toBe(teamId);
    }
    expect(mutate.mock.calls).toEqual([
      [{ mutation: RefreshAgentTeamDefinitionCatalog }],
      [{ mutation: RefreshAgentTeamDefinitionCatalog }],
    ]);
  });

  it('awaits mutation, Agent publication and Team publication before successful completion', async () => {
    const mutation = deferred<any>();
    const agentRead = deferred<any>();
    const teamRead = deferred<any>();
    mutate.mockReturnValue(mutation.promise);
    query.mockImplementation(({ query: operation }) => {
      if (operation === GetAgentDefinitions) return agentRead.promise;
      if (operation === GetAgentTeamDefinitions) return teamRead.promise;
      throw new Error('Unexpected read');
    });
    const agents = useAgentDefinitionStore();
    const teams = useAgentTeamDefinitionStore();
    agents.agentDefinitions = agentsAt(1);
    teams.agentTeamDefinitions = teamsAt(1);
    const completed = vi.fn();
    const reload = teams.refreshAndReloadAllAgentTeamDefinitions().then(completed);
    expect(teams.loading).toBe(true);
    expect(query).not.toHaveBeenCalled();
    mutation.resolve({ data: { refreshAgentTeamDefinitionCatalog: true } });
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    expect(agents.loading).toBe(true);
    expect(teams.agentTeamDefinitions).toEqual(teamsAt(1));
    expect(completed).not.toHaveBeenCalled();
    agentRead.resolve({ data: { agentDefinitions: agentsAt(2) } });
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    expect(agents.agentDefinitions).toEqual(agentsAt(2));
    expect(agents.loading).toBe(false);
    expect(teams.loading).toBe(true);
    expect(teams.agentTeamDefinitions).toEqual(teamsAt(1));
    expect(completed).not.toHaveBeenCalled();
    teamRead.resolve({ data: { agentTeamDefinitions: teamsAt(2) } });
    await reload;
    expect(completed).toHaveBeenCalledTimes(1);
    expect(teams.agentTeamDefinitions).toEqual(teamsAt(2));
    expect(teams.loading).toBe(false);
  });

  it.each(['mutation', 'agent', 'team'] as const)('propagates %s transport/GraphQL failures and supports retry', async (stage) => {
    const agents = useAgentDefinitionStore();
    const teams = useAgentTeamDefinitionStore();
    for (const kind of ['transport', 'graphql']) {
      agents.agentDefinitions = agentsAt(1);
      teams.agentTeamDefinitions = teamsAt(1);
      respondAt(2);
      mutate.mockResolvedValue({ data: { refreshAgentTeamDefinitionCatalog: true } });
      query.mockClear();
      const failure = new Error(`${stage} ${kind} failure`);
      const response = () => kind === 'transport'
        ? Promise.reject(failure) : Promise.resolve({ errors: [{ message: failure.message }] });
      if (stage === 'mutation') mutate.mockImplementationOnce(response);
      else {
        const workingRead = query.getMockImplementation()!;
        query.mockImplementation((request) => request.query === (stage === 'agent' ? GetAgentDefinitions : GetAgentTeamDefinitions)
          ? response() : workingRead(request));
      }
      await expect(teams.refreshAndReloadAllAgentTeamDefinitions()).rejects.toThrow(failure.message);
      expect((teams.error as Error).message).toBe(failure.message);
      expect(teams.loading).toBe(false);
      expect(agents.loading).toBe(false);
      expect(teams.agentTeamDefinitions).toEqual(teamsAt(1));
      expect(agents.agentDefinitions).toEqual(agentsAt(stage === 'team' ? 2 : 1));
      expect(query).toHaveBeenCalledTimes(stage === 'mutation' ? 0 : stage === 'agent' ? 1 : 2);
      respondAt(3);
      await teams.refreshAndReloadAllAgentTeamDefinitions();
      expect(teams.error).toBeNull();
      expect(agents.error).toBeNull();
      expect(teams.agentTeamDefinitions).toEqual(teamsAt(3));
      expect(agents.agentDefinitions).toEqual(agentsAt(3));
    }
  });

  it('keeps package-coordinator Team reload query-only without refreshing Agent state', async () => {
    const agents = useAgentDefinitionStore();
    agents.agentDefinitions = agentsAt(1);
    respondAt(2);
    const teams = useAgentTeamDefinitionStore();
    await teams.reloadAllAgentTeamDefinitions();
    expect(mutate).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledExactlyOnceWith({ query: GetAgentTeamDefinitions, fetchPolicy: 'network-only' });
    expect(agents.agentDefinitions).toEqual(agentsAt(1));
    expect(teams.agentTeamDefinitions).toEqual(teamsAt(2));
  });
});
