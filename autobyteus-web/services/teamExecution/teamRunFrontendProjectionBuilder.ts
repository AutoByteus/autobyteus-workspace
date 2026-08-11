import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { flattenTeamRunAgentMetadata } from '~/stores/runHistoryMetadata';
import type { TeamRunMetadataPayload } from '~/stores/runHistoryTypes';
import { createTeamTopologySnapshot } from './teamTopologySnapshot';
import { createTeamExecutionState } from './teamExecutionState';

export interface TeamPersistentAgentSeed {
  readonly memberAddress: string;
  readonly agentContext: AgentContext;
  readonly runtime: Readonly<{ kind: 'fresh' | 'loaded' | 'historical_unloaded' }>;
}

export const buildTeamRunFrontendProjection = (input: {
  metadata: TeamRunMetadataPayload;
  configuration: TeamRunConfig;
  rootLifecycle: Readonly<{ isActive: boolean }>;
  initialFocusedMemberAddress: string;
  persistentAgentSeeds: readonly TeamPersistentAgentSeed[];
}): AgentTeamContext => {
  const rootTeamRunId = input.metadata.rootTeam.teamRunId;
  const topology = createTeamTopologySnapshot({ metadata: input.metadata, configuration: input.configuration });
  const metadataAgents = flattenTeamRunAgentMetadata(input.metadata.rootTeam.children);
  const seedByAddress = new Map(input.persistentAgentSeeds.map((seed) => [seed.memberAddress, seed] as const));
  if (seedByAddress.size !== input.persistentAgentSeeds.length || seedByAddress.size !== metadataAgents.length) {
    throw new Error('Team frontend projection requires exactly one seed per persistent Agent.');
  }
  const persistentAgentContexts = metadataAgents.map((member) => {
    const seed = seedByAddress.get(member.address);
    if (!seed) throw new Error(`Missing persistent Agent seed for '${member.address}'.`);
    if (seed.agentContext.state.runId !== member.agentRunId) throw new Error(`Persistent Agent run binding mismatch for '${member.address}'.`);
    return Object.freeze({
      executionAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: member.address }),
      agentContext: seed.agentContext,
    });
  });
  const initialFocusedAddress = createTeamExecutionAddress({
    rootTeamRunId,
    memberAddress: input.initialFocusedMemberAddress,
  });
  const focusedNode = topology.getNode(initialFocusedAddress.memberAddress);
  if (!focusedNode || focusedNode.kind !== 'agent') throw new Error('Initial Team focus must resolve to an Agent.');
  const executions = createTeamExecutionState({
    rootTeamRunId,
    rootActive: input.rootLifecycle.isActive,
    initialFocusedAddress,
    topology,
    metadata: input.metadata,
    persistentAgentContexts,
  });
  return Object.freeze({ topology, executions });
};
