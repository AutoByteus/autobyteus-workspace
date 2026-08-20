import type {
  TaskTeamMemberExecutionDto,
  TeamReferenceFileDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';
import type { TeamTaskHistoryRow } from '~/services/teamExecution/teamExecutionViewModels';

export type DelegatedTaskEntryKind = 'task_agent' | 'task_team';
export type DelegatedTaskDisplayStatus =
  | 'in_progress'
  | 'awaiting_review'
  | 'revision_requested'
  | 'accepted'
  | 'interrupted';

export type DelegatedTaskParticipant =
  | Readonly<{ kind: 'named'; label: string }>
  | Readonly<{ kind: 'delegator_fallback' }>
  | Readonly<{ kind: 'assignee_fallback' }>;

export type DelegatedTaskDirection =
  | Readonly<{
    kind: 'directed';
    from: DelegatedTaskParticipant;
    to: DelegatedTaskParticipant;
  }>
  | Readonly<{ kind: 'system' }>;

interface DelegatedTaskLifecycleItemBase<TContent extends string | null = string> {
  readonly itemKey: string;
  readonly createdAt: string;
  readonly content: TContent;
  readonly direction: DelegatedTaskDirection;
  readonly referenceFiles: readonly TeamReferenceFile[];
}

export type DelegatedTaskLifecycleItem =
  | (DelegatedTaskLifecycleItemBase & Readonly<{ kind: 'assignment' }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
    kind: 'submission';
    resultOrdinal: number;
    revised: boolean;
  }>)
  | (DelegatedTaskLifecycleItemBase<string | null> & Readonly<{
    kind: 'review';
    decision: 'accept';
    reviewedResultOrdinal: number;
  }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
    kind: 'review';
    decision: 'request_revision';
    reviewedResultOrdinal: number;
  }>)
  | (DelegatedTaskLifecycleItemBase & Readonly<{
    kind: 'interruption';
    referenceFiles: readonly [];
  }>);

export interface DelegatedTaskEntry {
  readonly kind: DelegatedTaskEntryKind;
  readonly entryKey: string;
  readonly teamRunId: string;
  readonly taskId: string;
  readonly runId: string;
  readonly displayStatus: DelegatedTaskDisplayStatus;
  readonly lastActivityAt: string;
  readonly lifecycleItems: readonly [DelegatedTaskLifecycleItem, ...DelegatedTaskLifecycleItem[]];
}

export type DelegatedTaskItemLocator = Readonly<{
  entryKey: string;
  itemKey: string;
}>;

export type DelegatedTaskReferenceLocator = Readonly<{
  entryKey: string;
  itemKey: string;
  referenceId: string;
}>;

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

const referenceFiles = (references: readonly TeamReferenceFileDto[]): TeamReferenceFile[] => references.map((reference) => ({
  referenceId: reference.reference_id,
  path: reference.path,
  type: reference.type,
  createdAt: reference.created_at,
  updatedAt: reference.updated_at,
}));

const namedParticipant = (label: string): DelegatedTaskParticipant => ({ kind: 'named', label });

const delegatorParticipant = (
  team: AgentTeamContext,
  task: TeamTaskHistoryRow,
): DelegatedTaskParticipant => {
  const address = team.view.getMemberAddress(task.delegatorAgentRunId);
  return address ? namedParticipant(memberAddressBasename(address)) : { kind: 'delegator_fallback' };
};

const assigneeParticipant = (task: TeamTaskHistoryRow): DelegatedTaskParticipant => {
  const label = memberAddressBasename(task.targetAddress);
  return label ? namedParticipant(label) : { kind: 'assignee_fallback' };
};

const displayStatus = (task: TeamTaskHistoryRow): DelegatedTaskDisplayStatus => {
  if (task.task.status !== 'active') return task.task.status;
  const latestUpdate = task.task.updates.at(-1);
  return latestUpdate?.kind === 'review' && latestUpdate.decision === 'request_revision'
    ? 'revision_requested'
    : 'in_progress';
};

const toEntry = (team: AgentTeamContext, task: TeamTaskHistoryRow): DelegatedTaskEntry => {
  const kind: DelegatedTaskEntryKind = task.targetAgentRunId ? 'task_agent' : 'task_team';
  const runId = task.targetAgentRunId ?? task.targetTeamRunId;
  if (!runId) throw new Error(`Task '${task.task.task_id}' has no exact execution identity.`);

  const taskId = task.task.task_id;
  const delegator = delegatorParticipant(team, task);
  const assignee = assigneeParticipant(task);
  const assignmentDirection: DelegatedTaskDirection = { kind: 'directed', from: delegator, to: assignee };
  const submissionDirection: DelegatedTaskDirection = { kind: 'directed', from: assignee, to: delegator };
  const lifecycleItems: DelegatedTaskLifecycleItem[] = [{
    kind: 'assignment',
    itemKey: `task:${taskId}:assignment`,
    createdAt: task.task.created_at,
    content: task.task.description,
    direction: assignmentDirection,
    referenceFiles: referenceFiles(task.task.reference_files),
  }];
  const resultOrdinals = new Map<string, number>();
  let resultOrdinal = 0;
  let revisionPending = false;

  for (const update of task.task.updates) {
    if (update.kind === 'submission') {
      resultOrdinal += 1;
      resultOrdinals.set(update.submission_id, resultOrdinal);
      lifecycleItems.push({
        kind: 'submission',
        itemKey: `task:${taskId}:submission:${update.submission_id}`,
        createdAt: update.created_at,
        content: update.message,
        direction: submissionDirection,
        referenceFiles: referenceFiles(update.reference_files),
        resultOrdinal,
        revised: revisionPending,
      });
      revisionPending = false;
      continue;
    }

    if (update.kind === 'review') {
      const reviewedResultOrdinal = resultOrdinals.get(update.reviewed_submission_id);
      if (reviewedResultOrdinal === undefined) {
        throw new Error(`Task '${taskId}' review '${update.review_id}' references an unknown submission.`);
      }
      if (update.decision === 'request_revision') {
        if (update.comment === null) {
          throw new Error(`Task '${taskId}' revision review '${update.review_id}' has no comment.`);
        }
        lifecycleItems.push({
          kind: 'review',
          decision: 'request_revision',
          itemKey: `task:${taskId}:review:${update.review_id}`,
          createdAt: update.created_at,
          content: update.comment,
          direction: assignmentDirection,
          referenceFiles: referenceFiles(update.reference_files),
          reviewedResultOrdinal,
        });
        revisionPending = true;
      } else {
        lifecycleItems.push({
          kind: 'review',
          decision: 'accept',
          itemKey: `task:${taskId}:review:${update.review_id}`,
          createdAt: update.created_at,
          content: update.comment,
          direction: assignmentDirection,
          referenceFiles: referenceFiles(update.reference_files),
          reviewedResultOrdinal,
        });
        revisionPending = false;
      }
      continue;
    }

    lifecycleItems.push({
      kind: 'interruption',
      itemKey: `task:${taskId}:interruption:${update.interruption_id}`,
      createdAt: update.created_at,
      content: update.reason,
      direction: { kind: 'system' },
      referenceFiles: [],
    });
  }

  return {
    kind,
    entryKey: `task:${taskId}`,
    teamRunId: team.view.getRootTeamRunId(),
    taskId,
    runId,
    displayStatus: displayStatus(task),
    lastActivityAt: task.task.updates.at(-1)?.created_at ?? task.task.created_at,
    lifecycleItems: lifecycleItems as [DelegatedTaskLifecycleItem, ...DelegatedTaskLifecycleItem[]],
  };
};

export const deriveDelegatedTaskEntries = (
  team: AgentTeamContext,
  focusedAgentRunId?: string | null,
): DelegatedTaskEntry[] => team.view.listTaskHistoryRows()
  .filter((task) => visibleForAgent(team, task, focusedAgentRunId))
  .map((task) => toEntry(team, task));
