/**
 * The run list's answers (autobyteus-279): the node's workspace history (agent and Team runs, by definition) and its
 * collaboration roots (Team and Org runs). Only top-level runs are rows here; a delegated run is a row of its root's run
 * tree (the node's DS-11), so it never appears twice.
 */
import type { ListCollaborationRootHistoryQuery, ListWorkspaceRunHistoryQuery } from '~/generated/graphql';
import { DEMO_WORKSPACE_NAME, DEMO_WORKSPACE_ROOT, type DemoRun, type DemoWorld } from '../world/DemoWorld';
import { isLive, orgExecutionTree, teamExecutionTree } from '../world/projections';
import type { DemoGraphqlHandlers } from './operations';

type HistoryGroup = ListWorkspaceRunHistoryQuery['listWorkspaceRunHistory'][number];
type RootRow = ListCollaborationRootHistoryQuery['listCollaborationRootHistory'][number];

const newestFirst = (a: DemoRun, b: DemoRun) => b.lastActivityAt.localeCompare(a.lastActivityAt);

/** A stored run's status words, as the node's status projection reports them (live: ACTIVE_RUNTIME; else stored). */
const statusFields = (world: DemoWorld, run: DemoRun) => {
  const live = isLive(world, run);
  return { status: world.statusOf(run), isActive: live, shouldConnectStream: live, statusSource: live ? 'ACTIVE_RUNTIME' : 'HISTORICAL_METADATA' };
};

const byDefinition = (runs: DemoRun[]): Map<string, DemoRun[]> => {
  const groups = new Map<string, DemoRun[]>();
  for (const run of runs) groups.set(run.definitionId, [...(groups.get(run.definitionId) ?? []), run]);
  return groups;
};

export const workspaceHistory = (world: DemoWorld): HistoryGroup => {
  const agentRuns = world.topLevelRuns.filter((run) => run.kind === 'agent');
  const teamRuns = world.topLevelRuns.filter((run) => run.kind === 'team');
  return {
    __typename: 'WorkspaceRunHistoryGroupObject',
    workspaceRootPath: DEMO_WORKSPACE_ROOT,
    workspaceName: DEMO_WORKSPACE_NAME,
    agentDefinitions: [...byDefinition(agentRuns)].map(([definitionId, runs]) => ({
      __typename: 'RunHistoryAgentGroupObject',
      agentDefinitionId: definitionId,
      agentName: runs[0]!.name,
      runs: runs.sort(newestFirst).map((run) => ({
        __typename: 'RunHistoryItemObject',
        runId: run.runId, displayName: null, summary: run.summary, createdAt: run.createdAt, lastActivityAt: run.lastActivityAt,
        archivedAt: null, terminatedAt: null, ...statusFields(world, run),
        hasCollaboration: run.coordinator.delegated.length > 0,
      })),
    })).sort((a, b) => a.agentName.localeCompare(b.agentName)),
    teamDefinitions: [...byDefinition(teamRuns)].map(([definitionId, runs]) => ({
      __typename: 'WorkspaceHistoryTeamDefinitionObject',
      teamDefinitionId: definitionId,
      teamDefinitionName: runs[0]!.name,
      runs: runs.sort(newestFirst).map((run) => ({
        __typename: 'WorkspaceHistoryTeamRunItemObject',
        teamRunId: run.runId, displayName: null, teamDefinitionId: run.definitionId, teamDefinitionName: run.name,
        coordinatorAddress: `/${run.coordinator.memberName}`, workspaceRootPath: DEMO_WORKSPACE_ROOT, summary: run.summary,
        createdAt: run.createdAt, lastActivityAt: run.lastActivityAt, archivedAt: null, terminatedAt: null, isActive: isLive(world, run),
        rootTeam: teamExecutionTree(run).root_team,
        members: run.agents.map((agent) => ({
          __typename: 'WorkspaceHistoryTeamRunMemberObject',
          memberAddress: `/${agent.memberName}`, displayName: agent.memberName!, agentRunId: agent.agentRunId, status: agent.status,
          runtimeKind: agent.launch.runtimeKind, workspaceRootPath: agent.launch.workspaceRootPath,
        })),
      })),
    })),
  };
};

const orgRootRow = (world: DemoWorld, run: DemoRun): Extract<RootRow, { __typename: 'AgentOrgRootHistoryObject' }> => ({
  __typename: 'AgentOrgRootHistoryObject',
  root_subject_kind: 'agent_org', root_run_id: run.runId, created_at: run.createdAt, last_activity_at: run.lastActivityAt,
  archived_at: null, is_active: isLive(world, run), summary: run.summary, org: orgExecutionTree(run),
});

export const runHistoryHandlers = {
  ListWorkspaceRunHistory: (_variables, world) => ({ __typename: 'Query', listWorkspaceRunHistory: [workspaceHistory(world)] }),
  ListCollaborationRootHistory: (_variables, world) => ({
    __typename: 'Query',
    listCollaborationRootHistory: world.topLevelRuns.filter((run) => run.kind !== 'agent').sort(newestFirst).map((run): RootRow => (run.kind === 'org'
      ? orgRootRow(world, run)
      : { __typename: 'AgentTeamRootHistoryObject', root_subject_kind: 'agent_team', root_run_id: run.runId })),
  }),
  GetAgentOrgRootHistory: ({ orgRunId }, world) => {
    const run = world.run(orgRunId);
    return { __typename: 'Query', getAgentOrgRootHistory: run && run.kind === 'org' ? orgRootRow(world, run) : null };
  },
} satisfies Partial<DemoGraphqlHandlers>;
