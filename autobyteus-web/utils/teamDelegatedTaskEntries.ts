import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  sameTeamExecutionAddress,
  serializeTeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { formatTeamCommunicationAddressLabel } from '~/stores/teamCommunicationStore';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';

export type DelegatedTaskEntryKind = 'task_agent' | 'task_team';
export interface DelegatedTaskEntry {
  kind: DelegatedTaskEntryKind;
  entryKey: string;
  node: TeamMemberNode | null;
  context: AgentContext | null;
  persistedRecord: TaskDelegationRecord | null;
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
const addressKey = (address?: TeamExecutionAddress | null): string | null => {
  if (!address) return null;
  try { return serializeTeamExecutionAddress(address); } catch { return null; }
};
const kindFor = (address: TeamExecutionAddress | null, fallback: 'agent' | 'agent_team'): DelegatedTaskEntryKind =>
  address?.taskAgentRunId || fallback === 'agent' ? 'task_agent' : 'task_team';
const runIdFor = (address: TeamExecutionAddress | null): string | null =>
  address?.taskAgentRunId ?? address?.taskTeamRunIds.at(-1) ?? null;
const collectLiveTaskNodes = (nodes: readonly TeamMemberNode[]): TeamMemberNode[] => nodes.flatMap((node) => [
  ...(node.isTaskExecution && node.taskId ? [node] : []),
  ...(node.kind === 'agent_team' ? collectLiveTaskNodes(node.children) : []),
]);
const recordVisible = (record: TaskDelegationRecord, focused?: TeamExecutionAddress | null): boolean => {
  if (focused === undefined) return true;
  const key = addressKey(focused);
  return Boolean(key && (addressKey(record.senderAddress) === key || addressKey(record.receiverAddress) === key));
};

const hasSameTaskTeamScope = (
  left: readonly string[],
  right: readonly string[],
): boolean => left.length === right.length && left.every((id, index) => id === right[index]);

const taskParentScope = (node: TeamMemberNode, address: TeamExecutionAddress): readonly string[] =>
  node.kind === 'agent_team' ? address.taskTeamRunIds.slice(0, -1) : address.taskTeamRunIds;

const hasExactTaskExecutionIdentity = (
  team: AgentTeamContext,
  node: TeamMemberNode,
): boolean => {
  const task = node.executionAddress;
  if (!node.isTaskExecution || !node.taskId || !task || task.rootTeamRunId !== team.teamRunId
    || node.address !== task.memberAddress
    || node.taskTargetKind !== node.kind || node.taskTargetAddress !== node.address
    || team.memberNodesByAddress.get(task.memberAddress)?.kind !== node.kind) return false;

  if (node.kind === 'agent') {
    return Boolean(task.taskAgentRunId)
      && node.agentRunId === task.taskAgentRunId;
  }

  return task.taskAgentRunId === null
    && task.taskTeamRunIds.length > 0
    && node.teamRunId === task.taskTeamRunIds.at(-1);
};

const exactSenderExecutionExists = (
  team: AgentTeamContext,
  sender: TeamExecutionAddress,
): boolean => {
  if (sender.rootTeamRunId !== team.teamRunId
    || team.memberNodesByAddress.get(sender.memberAddress)?.kind !== 'agent') return false;
  const senderNode = findTeamExecutionNode(team, sender);
  if (!senderNode || senderNode.kind !== 'agent') return false;
  if (sender.taskAgentRunId) {
    return Boolean(senderNode.isTaskExecution) && senderNode.agentRunId === sender.taskAgentRunId;
  }
  return sender.taskTeamRunIds.length === 0 || Boolean(senderNode.isTaskExecution);
};

const liveTaskBelongsToFocusedSender = (
  team: AgentTeamContext,
  node: TeamMemberNode,
  focused: TeamExecutionAddress,
): boolean => {
  const task = node.executionAddress;
  const sender = node.taskSenderAddress;
  if (!task || !sender || !sameTeamExecutionAddress(sender, focused)
    || !hasSameTaskTeamScope(sender.taskTeamRunIds, taskParentScope(node, task))) return false;
  return exactSenderExecutionExists(team, sender);
};

const liveTaskBelongsToFocusedTarget = (
  team: AgentTeamContext,
  node: TeamMemberNode,
  focused: TeamExecutionAddress,
): boolean => {
  const task = node.executionAddress;
  if (!task || focused.taskAgentRunId || focused.rootTeamRunId !== team.teamRunId
    || task.memberAddress !== focused.memberAddress
    || !hasSameTaskTeamScope(taskParentScope(node, task), focused.taskTeamRunIds)) return false;
  return team.memberNodesByAddress.get(focused.memberAddress)?.kind === node.kind;
};

const liveTaskBelongsToFocusedExecution = (
  team: AgentTeamContext,
  node: TeamMemberNode,
  focused: TeamExecutionAddress,
): boolean => hasExactTaskExecutionIdentity(team, node)
  && (liveTaskBelongsToFocusedSender(team, node, focused)
    || liveTaskBelongsToFocusedTarget(team, node, focused));

const taskArguments = (record: TaskDelegationRecord): Record<string, unknown> => ({
  target: { kind: record.receiverTargetKind, address: record.receiverAddress },
  description: record.content,
  reference_files: record.referenceFiles.map((reference) => reference.path),
});

const liveEntry = (
  team: AgentTeamContext,
  node: TeamMemberNode,
  record: TaskDelegationRecord | null,
): DelegatedTaskEntry => {
  const executionAddress = node.executionAddress ?? record?.taskRun?.address ?? null;
  const context = executionAddress
    ? team.agentExecutionsByKey.get(serializeTeamExecutionAddress(executionAddress)) ?? null
    : null;
  const taskId = record?.taskId ?? node.taskId ?? null;
  const targetName = record
    ? formatTeamCommunicationAddressLabel(record.receiverAddress)
    : node.taskTargetAddress ?? node.address;
  const status = context?.state.currentStatus ?? (node.kind === 'agent' ? node.currentStatus : null) ?? AgentStatus.Initializing;
  return {
    kind: kindFor(executionAddress, record?.receiverTargetKind ?? (node.kind === 'agent_team' ? 'agent_team' : 'agent')),
    entryKey: taskId ? `task:${taskId}` : `live:${addressKey(executionAddress) ?? node.address}`,
    node,
    context,
    persistedRecord: record,
    teamRunId: team.teamRunId,
    targetDisplayName: targetName,
    taskId,
    taskLabel: node.taskLabel ?? (taskId ? preview(taskId) : null),
    shortTaskDisambiguator: preview(taskId ?? runIdFor(executionAddress) ?? node.address),
    taskDescription: record?.content ?? node.taskDescription ?? null,
    taskReferenceFiles: record?.referenceFiles ?? node.taskReferenceFiles ?? [],
    taskArguments: record ? taskArguments(record) : node.taskArguments ?? null,
    taskTargetKind: record?.receiverTargetKind ?? node.taskTargetKind ?? null,
    taskTargetName: targetName,
    runId: runIdFor(executionAddress) ?? (node.kind === 'agent' ? node.agentRunId : node.teamRunId),
    status,
    statusLabel: formatStatus(node.taskExecutionStatus ?? context?.state.currentStatus ?? record?.status),
  };
};

const persistedEntry = (team: AgentTeamContext, record: TaskDelegationRecord): DelegatedTaskEntry => {
  const address = record.taskRun?.address ?? null;
  const targetName = formatTeamCommunicationAddressLabel(record.receiverAddress);
  return {
    kind: kindFor(address, record.receiverTargetKind),
    entryKey: `task:${record.taskId}`,
    node: null,
    context: null,
    persistedRecord: record,
    teamRunId: team.teamRunId,
    targetDisplayName: targetName,
    taskId: record.taskId,
    taskLabel: preview(record.taskId),
    shortTaskDisambiguator: preview(record.taskId),
    taskDescription: record.content,
    taskReferenceFiles: record.referenceFiles,
    taskArguments: taskArguments(record),
    taskTargetKind: record.receiverTargetKind,
    taskTargetName: targetName,
    runId: runIdFor(address),
    status: AgentStatus.Offline,
    statusLabel: `Persisted ${formatStatus(record.status)}`,
  };
};

export const deriveDelegatedTaskEntries = (
  team: AgentTeamContext,
  records: readonly TaskDelegationRecord[] = [],
  focusedAddress?: TeamExecutionAddress | null,
): DelegatedTaskEntry[] => {
  const liveNodes = collectLiveTaskNodes(team.rootTeam.children);
  const exactLiveNodeForRecord = (record: TaskDelegationRecord): TeamMemberNode | null => {
    const taskRunAddress = addressKey(record.taskRun?.address);
    if (!taskRunAddress) return null;
    return liveNodes.find((node) => node.taskId === record.taskId
      && addressKey(node.executionAddress) === taskRunAddress
      && (record.receiverTargetKind === 'agent_team') === (node.kind === 'agent_team')) ?? null;
  };
  const persistedTaskIds = new Set(records.map((record) => record.taskId));
  const persisted = records.filter((record) => recordVisible(record, focusedAddress)).map((record) => {
    const node = exactLiveNodeForRecord(record);
    return node ? liveEntry(team, node, record) : persistedEntry(team, record);
  });
  const live = liveNodes.filter((node) => !node.taskId || !persistedTaskIds.has(node.taskId)).filter((node) => {
    if (focusedAddress === undefined) return true;
    return Boolean(focusedAddress && liveTaskBelongsToFocusedExecution(team, node, focusedAddress));
  }).map((node) => liveEntry(team, node, null));
  return [...persisted, ...live];
};
