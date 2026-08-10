import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { formatTeamCommunicationAddressLabel } from '~/stores/teamCommunicationStore';

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
  const byTaskId = new Map(liveNodes.flatMap((node) => node.taskId ? [[node.taskId, node] as const] : []));
  const consumed = new Set<TeamMemberNode>();
  const persisted = records.filter((record) => recordVisible(record, focusedAddress)).map((record) => {
    const node = byTaskId.get(record.taskId) ?? null;
    if (node) consumed.add(node);
    return node ? liveEntry(team, node, record) : persistedEntry(team, record);
  });
  const live = liveNodes.filter((node) => !consumed.has(node)).filter((node) => {
    if (focusedAddress === undefined) return true;
    return addressKey(node.executionAddress) === addressKey(focusedAddress);
  }).map((node) => liveEntry(team, node, null));
  return [...persisted, ...live];
};
