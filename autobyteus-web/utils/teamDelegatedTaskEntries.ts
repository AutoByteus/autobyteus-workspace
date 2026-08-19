import type {
  TaskTeamMemberExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';
import type { TeamTaskHistoryRow } from '~/services/teamExecution/teamExecutionViewModels';

export type DelegatedTaskEntryKind = 'task_agent' | 'task_team';
export interface DelegatedTaskEntry {
  kind: DelegatedTaskEntryKind;
  entryKey: string;
  context: AgentContext | null;
  teamRunId: string;
  targetDisplayName: string;
  taskId: string;
  taskLabel: string;
  taskDescription: string;
  taskReferenceFiles: TeamReferenceFile[];
  taskArguments: Record<string, unknown>;
  taskTargetKind: 'agent' | 'agent_team';
  taskTargetName: string;
  runId: string;
  status: AgentStatus;
  statusLabel: string;
}

const formatStatus = (value: string): string => value
  .replace(/[-_]+/g, ' ')
  .replace(/^./, (letter) => letter.toUpperCase());

const agentIdsInTaskTeam = (
  tree: TeamRunExecutionTreeDto,
  teamRunId: string,
): ReadonlySet<string> => {
  const ids = new Set<string>();
  const collectMembers = (members: readonly TaskTeamMemberExecutionDto[]): void => {
    for (const member of members) {
      if (member.kind === 'task_team_agent') ids.add(member.agent_run_id);
      else collectMembers(member.members);
    }
  };
  const visitTasks = (tasks: TeamRunExecutionTreeDto['root_team']['task_executions']): boolean => {
    for (const task of tasks) {
      if (task.kind !== 'task_team') continue;
      if (task.team_run_id === teamRunId) {
        collectMembers(task.members);
        return true;
      }
      if (visitTaskMembers(task.members) || visitTasks(task.task_executions)) return true;
    }
    return false;
  };
  const visitTaskMembers = (members: readonly TaskTeamMemberExecutionDto[]): boolean => {
    for (const member of members) {
      if (member.kind === 'task_team_member'
        && (member.team_run_id === teamRunId || visitTaskMembers(member.members) || visitTasks(member.task_executions))) {
        if (member.team_run_id === teamRunId) collectMembers(member.members);
        return true;
      }
    }
    return false;
  };
  const visitConfigured = (members: TeamRunExecutionTreeDto['root_team']['members']): boolean => {
    for (const member of members) {
      if (member.kind === 'configured_team'
        && (visitConfigured(member.members) || visitTasks(member.task_executions))) return true;
    }
    return false;
  };
  visitTasks(tree.root_team.task_executions) || visitConfigured(tree.root_team.members);
  return ids;
};

const visibleForAgent = (
  team: AgentTeamContext,
  task: TeamTaskHistoryRow,
  focusedAgentRunId?: string | null,
): boolean => {
  if (focusedAgentRunId === undefined) return true;
  if (!focusedAgentRunId || !team.view.hasAgentRun(focusedAgentRunId)) return false;
  if (task.delegatorAgentRunId === focusedAgentRunId || task.targetAgentRunId === focusedAgentRunId) return true;
  return task.targetTeamRunId
    ? agentIdsInTaskTeam(team.view.getExecutionTree(), task.targetTeamRunId).has(focusedAgentRunId)
    : false;
};

const referenceFiles = (task: TeamTaskHistoryRow): TeamReferenceFile[] => task.task.reference_files.map((reference) => ({
  referenceId: reference.reference_id,
  path: reference.path,
  type: reference.type,
  createdAt: reference.created_at,
  updatedAt: reference.updated_at,
}));

const toEntry = (team: AgentTeamContext, task: TeamTaskHistoryRow): DelegatedTaskEntry => {
  const kind: DelegatedTaskEntryKind = task.targetAgentRunId ? 'task_agent' : 'task_team';
  const runId = task.targetAgentRunId ?? task.targetTeamRunId;
  if (!runId) throw new Error(`Task '${task.task.task_id}' has no exact execution identity.`);
  const context = task.targetAgentRunId ? team.view.getAgentContext(task.targetAgentRunId) : null;
  const targetDisplayName = memberAddressBasename(task.targetAddress);
  return {
    kind,
    entryKey: `task:${task.task.task_id}`,
    context,
    teamRunId: team.view.getRootTeamRunId(),
    targetDisplayName,
    taskId: task.task.task_id,
    taskLabel: task.label,
    taskDescription: task.task.description,
    taskReferenceFiles: referenceFiles(task),
    taskArguments: {
      recipient_address: task.task.recipient_address,
      description: task.task.description,
      reference_files: task.task.reference_files.map((reference) => reference.path),
    },
    taskTargetKind: kind === 'task_team' ? 'agent_team' : 'agent',
    taskTargetName: targetDisplayName,
    runId,
    status: context?.state.currentStatus ?? (task.task.status === 'active' ? AgentStatus.Running : AgentStatus.Offline),
    statusLabel: formatStatus(task.task.status),
  };
};

export const deriveDelegatedTaskEntries = (
  team: AgentTeamContext,
  focusedAgentRunId?: string | null,
): DelegatedTaskEntry[] => team.view.listTaskHistoryRows()
  .filter((task) => visibleForAgent(team, task, focusedAgentRunId))
  .map((task) => toEntry(team, task));
