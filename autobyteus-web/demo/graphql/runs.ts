/**
 * An opened run's answers (autobyteus-279): its tree, its agents' projections (conversation and Activity), the files it
 * wrote, and its saved settings. A run or agent the world does not have is an error, as on the node.
 */
import type { GetAgentRunResumeConfigQuery, GetRunFileChangesQuery } from '~/generated/graphql';
import { DEMO_FILES } from '../world/content/files';
import { activitiesOf, conversationOf } from '../world/conversations';
import type { DemoAgent, DemoRun, DemoWorld } from '../world/DemoWorld';
import { addressOf, isLive, orgExecutionTree, teamExecutionTree } from '../world/projections';
import { runTreeOf } from '../world/runTree';
import type { DemoGraphqlHandlers } from './operations';

type FileChange = GetRunFileChangesQuery['getRunFileChanges'][number];

const runOf = (world: DemoWorld, runId: string, kind?: DemoRun['kind']): DemoRun => {
  const run = world.run(runId);
  if (!run || (kind && run.kind !== kind)) throw new Error(`Run '${runId}' was not found.`);
  return run;
};

const agentOf = (world: DemoWorld, agentRunId: string, holder?: DemoRun): DemoAgent => {
  const agent = world.agent(agentRunId);
  if (!agent || (holder && agent.run !== holder)) throw new Error(`Agent run '${agentRunId}' was not found.`);
  return agent;
};

const projectionOf = (world: DemoWorld, agent: DemoAgent) => ({
  summary: agent.run.summary,
  lastActivityAt: agent.lastActivityAt,
  conversation: conversationOf(world, agent),
  activities: activitiesOf(world, agent),
  hasEarlierActiveTraceEvents: false,
});

/** The files a run's agent wrote or edited (Artifacts). In the demo, the showcase's. */
export const fileChangesOf = (world: DemoWorld, agent: DemoAgent): FileChange[] => {
  if (agent.run !== world.showcaseRun) return [];
  const at = Date.parse(agent.lastActivityAt) - 90_000;
  const change = (n: number, path: string, type: string, sourceTool: string): FileChange => ({
    __typename: 'RunFileChangeEntryObject', id: `${agent.agentRunId}:${path}`, runId: agent.agentRunId, path, type, status: 'available', sourceTool,
    sourceInvocationId: `demo-rich-t${n}`, content: type === 'image' ? null : (DEMO_FILES[path] ?? null),
    createdAt: new Date(at + n * 5_000).toISOString(), updatedAt: new Date(at + n * 5_000).toISOString(),
  });
  return [
    change(5, 'docs/pilot-summary.md', 'file', 'write_file'),
    change(4, 'docs/release-notes-1.6.md', 'file', 'edit_file'),
    change(7, 'docs/dashboard-after.png', 'image', 'generated_output'),
  ];
};

/** Settings change a stopped run only (the node's rule): a live run's answer is `RUN_ACTIVE`. */
const editability = (world: DemoWorld, run: DemoRun) => (isLive(world, run)
  ? { __typename: 'RunModelConfigEditabilityObject' as const, editable: false, reason: 'RUN_ACTIVE' }
  : { __typename: 'RunModelConfigEditabilityObject' as const, editable: true, reason: null });

const agentResumeConfig = (world: DemoWorld, run: DemoRun): GetAgentRunResumeConfigQuery['getAgentRunResumeConfig'] => {
  const agent = run.coordinator;
  return {
    __typename: 'RunResumeConfigPayload', runId: run.runId, displayName: null, isActive: isLive(world, run),
    metadataConfig: {
      __typename: 'RunMetadataConfigObject', agentDefinitionId: agent.definitionId, workspaceRootPath: agent.launch.workspaceRootPath,
      llmModelIdentifier: agent.launch.llmModelIdentifier, llmConfig: agent.launch.llmConfig, autoExecuteTools: agent.launch.autoExecuteTools,
      runtimeKind: agent.launch.runtimeKind,
      runtimeReference: { __typename: 'RunRuntimeReferenceObject', runtimeKind: agent.launch.runtimeKind, sessionId: null, threadId: null, metadata: null },
    },
    modelConfigEditability: editability(world, run),
  };
};

const runKindFromTreeKind = (kind: string): DemoRun['kind'] | undefined =>
  (kind === 'agent' ? 'agent' : kind === 'agent_team' ? 'team' : kind === 'agent_org' ? 'org' : undefined);

export const runHandlers = {
  GetRunTree: ({ kind, runId }, world) => ({ __typename: 'Query', runTree: runTreeOf(runOf(world, runId, runKindFromTreeKind(kind))) }),

  GetRunProjection: ({ runId }, world) => {
    const run = runOf(world, runId, 'agent');
    return { __typename: 'Query', getRunProjection: { __typename: 'RunProjectionPayload', runId, ...projectionOf(world, run.coordinator) } };
  },
  GetTeamMemberRunProjection: ({ teamRunId, agentRunId }, world) => {
    const agent = agentOf(world, agentRunId, runOf(world, teamRunId, 'team'));
    return { __typename: 'Query', getTeamMemberRunProjection: { __typename: 'TeamMemberRunProjectionPayload', agentRunId, ...projectionOf(world, agent) } };
  },
  GetAgentOrgMemberRunProjection: ({ orgRunId, agentRunId }, world) => {
    const agent = agentOf(world, agentRunId, runOf(world, orgRunId, 'org'));
    return { __typename: 'Query', getAgentOrgMemberRunProjection: { __typename: 'AgentOrgMemberRunProjectionPayload', agentRunId, memberAddress: addressOf(agent), ...projectionOf(world, agent) } };
  },

  GetRunFileChanges: ({ runId }, world) => ({ __typename: 'Query', getRunFileChanges: fileChangesOf(world, runOf(world, runId, 'agent').coordinator) }),
  GetTeamMemberFileChanges: ({ teamRunId, agentRunId }, world) => ({ __typename: 'Query', getTeamMemberFileChanges: fileChangesOf(world, agentOf(world, agentRunId, runOf(world, teamRunId, 'team'))) }),
  GetAgentOrgMemberFileChanges: ({ orgRunId, agentRunId }, world) => ({ __typename: 'Query', getAgentOrgMemberFileChanges: fileChangesOf(world, agentOf(world, agentRunId, runOf(world, orgRunId, 'org'))) }),

  GetAgentRunResumeConfig: ({ runId }, world) => ({ __typename: 'Query', getAgentRunResumeConfig: agentResumeConfig(world, runOf(world, runId, 'agent')) }),
  GetTeamRunResumeConfig: ({ teamRunId }, world) => {
    const run = runOf(world, teamRunId, 'team');
    return {
      __typename: 'Query',
      getTeamRunResumeConfig: {
        __typename: 'TeamRunResumeConfigPayload', teamRunId, displayName: null, isActive: isLive(world, run), executionTree: teamExecutionTree(run),
        liveSequenceId: null, baseChangeSequence: 0, lastMessageChangeSequence: null, modelConfigEditability: editability(world, run),
      },
    };
  },
  AgentOrgRunConfig: ({ orgRunId }, world) => {
    const run = runOf(world, orgRunId, 'org');
    return {
      __typename: 'Query',
      getAgentOrgRunConfig: { __typename: 'AgentOrgRunConfigObject', orgRunId, executionTree: orgExecutionTree(run), isActive: isLive(world, run), editability: editability(world, run) },
    };
  },
} satisfies Partial<DemoGraphqlHandlers>;
