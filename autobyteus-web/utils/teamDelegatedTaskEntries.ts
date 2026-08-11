import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { sameTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TeamTaskHistoryRow } from '~/services/teamExecution/teamExecutionModels';

export type DelegatedTaskEntryKind = 'task_agent' | 'task_team';
export interface DelegatedTaskEntry {
  kind: DelegatedTaskEntryKind;
  entryKey: string;
  node: TeamMemberNode | null;
  context: AgentContext | null;
  teamRunId: string;
  targetDisplayName: string;
  taskId: string | null;
  taskLabel: string | null;
  shortTaskDisambiguator: string;
  taskDescription: string | null;
  taskReferenceFiles: TeamReferenceFile[];
  taskArguments: Record<string, unknown> | null;
  taskTargetKind: string | null;
  taskTargetName: string | null;
  runId: string | null;
  status: AgentStatus;
  statusLabel: string;
}

const preview = (value?: string | null): string => {
  const id = value?.trim() ?? '';
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
};
const formatStatus = (value?: string | null): string => (value || 'Unknown')
  .replace(/[-_]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
const sameChain = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);
const taskKind = (task: TeamTaskHistoryRow): DelegatedTaskEntryKind =>
  task.executionAddress.taskAgentRunId ? 'task_agent' : 'task_team';
const taskParentScope = (task: TeamTaskHistoryRow): readonly string[] =>
  taskKind(task) === 'task_team' ? task.executionAddress.taskTeamRunIds.slice(0, -1) : task.executionAddress.taskTeamRunIds;

const visibleForFocus = (team: AgentTeamContext, task: TeamTaskHistoryRow, focused?: TeamExecutionAddress | null): boolean => {
  if (focused === undefined) return true;
  if (!focused || focused.rootTeamRunId !== team.executions.getRootTeamRunId()) return false;
  if (sameTeamExecutionAddress(task.senderAddress, focused)) return true;
  if (focused.taskAgentRunId !== null || task.executionAddress.memberAddress !== focused.memberAddress) return false;
  return sameChain(taskParentScope(task), focused.taskTeamRunIds)
    && team.topology.getNode(focused.memberAddress)?.kind === (taskKind(task) === 'task_team' ? 'agent_team' : 'agent');
};

const taskArguments = (task: TeamTaskHistoryRow): Record<string, unknown> => ({
  recipient_address: task.executionAddress.memberAddress,
  description: task.content,
  reference_files: task.referenceFiles.map((reference) => reference.path),
});

const toEntry = (
  team: AgentTeamContext,
  task: TeamTaskHistoryRow,
): DelegatedTaskEntry => {
  const kind = taskKind(task);
  const node = team.topology.getNode(task.executionAddress.memberAddress);
  const context = team.executions.getAgentContext(task.executionAddress);
  const targetName = node?.displayName || task.executionAddress.memberAddress;
  const runId = task.executionAddress.taskAgentRunId ?? task.executionAddress.taskTeamRunIds.at(-1) ?? null;
  const status = context?.state.currentStatus ?? (task.status === 'active' ? AgentStatus.Running : AgentStatus.Offline);
  return {
    kind,
    entryKey: `task:${task.taskId}`,
    node,
    context,
    teamRunId: team.executions.getRootTeamRunId(),
    targetDisplayName: targetName,
    taskId: task.taskId,
    taskLabel: task.label,
    shortTaskDisambiguator: preview(task.taskId),
    taskDescription: task.content,
    taskReferenceFiles: [...task.referenceFiles],
    taskArguments: taskArguments(task),
    taskTargetKind: kind === 'task_team' ? 'agent_team' : 'agent',
    taskTargetName: targetName,
    runId,
    status,
    statusLabel: formatStatus(task.status),
  };
};

export const deriveDelegatedTaskEntries = (
  team: AgentTeamContext,
  focusedAddress?: TeamExecutionAddress | null,
): DelegatedTaskEntry[] => {
  return team.executions.listTaskHistoryRows()
    .filter((task) => visibleForFocus(team, task, focusedAddress))
    .map((task) => toEntry(team, task));
};
