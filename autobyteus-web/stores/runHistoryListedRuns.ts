import type { ListedRunRefDto } from '@autobyteus/collaboration-stream-contracts';
export type { ListedRunRefDto };
import type { AgentOrgRunHistoryItem, RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';

/**
 * The listed runs of every kind, active or stopped, that the history poll asks children for (autobyteus-461 SR-055;
 * autobyteus-426 D-09, -435): every standalone Agent run and Team run of every listed folder, and every Org run.
 */
export const listedRunsOf = (state: Readonly<{
  workspaceGroups: readonly RunHistoryWorkspaceGroup[];
  agentOrgHistory: readonly AgentOrgRunHistoryItem[];
}>): ListedRunRefDto[] => [
  ...state.workspaceGroups.flatMap((group) => [
    ...group.agentDefinitions.flatMap((agent) => agent.runs.map((run) => ({ kind: 'agent' as const, runId: run.runId }))),
    ...group.teamDefinitions.flatMap((team) => team.runs.map((run) => ({ kind: 'agent_team' as const, runId: run.teamRunId }))),
  ]),
  ...state.agentOrgHistory.map((run) => ({ kind: 'agent_org' as const, runId: run.rootRunId })),
];
