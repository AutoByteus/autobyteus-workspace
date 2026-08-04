import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ConversationTargetAddress } from '~/types/agent/ConversationTargetAddress';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { formatTeamCommunicationAddressLabel } from '~/stores/teamCommunicationStore';
import {
  buildConversationTargetAddressForNode,
  buildConversationTargetKey,
  normalizeConversationRouteKey,
} from '~/utils/teamConversationTargetSegments';

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

const idPreview = (value: string | null | undefined): string => {
  const id = value?.trim() ?? '';
  if (!id) return '';
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
};

const formatStatus = (value: string | null | undefined): string => {
  const status = value?.trim();
  if (!status) return 'Unknown';
  return status
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
};

const baseDisplayName = (value: string | null | undefined): string | null => {
  const displayName = value?.trim() ?? '';
  if (!displayName) return null;
  return displayName.split(' · ')[0]?.trim() || displayName;
};

const getContext = (
  teamContext: AgentTeamContext,
  routeKey: string | null | undefined,
): AgentContext | null => (routeKey ? teamContext.leafAgentContextsByRouteKey.get(routeKey) ?? null : null);

const resolveTargetName = (teamContext: AgentTeamContext, node: TeamMemberNode): string => {
  if (node.taskTargetName?.trim()) return node.taskTargetName.trim();

  const logicalRouteKey = node.isTaskTeamInstance
    ? node.logicalTeamRouteKey
    : node.logicalMemberRouteKey;
  const logicalNode = logicalRouteKey ? teamContext.memberNodesByRouteKey.get(logicalRouteKey) ?? null : null;
  return logicalNode?.displayName
    || logicalNode?.memberName
    || baseDisplayName(node.displayName)
    || baseDisplayName(node.memberName)
    || 'Unknown target';
};

const collectTaskNodes = (nodes: readonly TeamMemberNode[]): TeamMemberNode[] => (
  nodes.flatMap((node) => [
    ...(node.isTaskAgentInstance || node.isTaskTeamInstance ? [node] : []),
    ...(node.memberKind === 'agent_team' ? collectTaskNodes(node.children) : []),
  ])
);

const addressKey = (address: ConversationTargetAddress | null | undefined): string | null => {
  if (!address?.segments?.length) return null;
  return buildConversationTargetKey(address);
};

const memberAddressKey = (routeKey: string | null | undefined): string | null => {
  const normalizedRouteKey = normalizeConversationRouteKey(routeKey);
  return normalizedRouteKey
    ? buildConversationTargetKey({ segments: [{ kind: 'member', memberRouteKey: normalizedRouteKey }] })
    : null;
};

const recordMatchesFocusedAddress = (
  record: TaskDelegationRecord,
  focusedAddress: ConversationTargetAddress | null | undefined,
): boolean => {
  if (focusedAddress === undefined) return true;
  const focusedKey = addressKey(focusedAddress);
  if (!focusedKey) return false;
  return addressKey(record.senderAddress) === focusedKey
    || addressKey(record.receiverAddress) === focusedKey;
};

const liveNodeMatchesFocusedAddress = (
  node: TeamMemberNode,
  focusedAddress: ConversationTargetAddress | null | undefined,
): boolean => {
  if (focusedAddress === undefined) return true;
  const focusedKey = addressKey(focusedAddress);
  if (!focusedKey) return false;

  const exactNodeAddress = buildConversationTargetAddressForNode(node)?.address ?? null;
  if (addressKey(exactNodeAddress) === focusedKey) return true;

  const logicalRouteKey = node.isTaskTeamInstance
    ? node.logicalTeamRouteKey
    : node.logicalMemberRouteKey;
  return memberAddressKey(logicalRouteKey) === focusedKey;
};

const taskRunIdFromRecord = (record: TaskDelegationRecord): string | null => {
  const segments = record.taskRun?.address.segments ?? [];
  const lastTaskSegment = [...segments].reverse().find((segment) => segment.kind === 'task_agent' || segment.kind === 'task_team');
  if (!lastTaskSegment) return null;
  return lastTaskSegment.kind === 'task_agent' ? lastTaskSegment.taskAgentRunId : lastTaskSegment.taskTeamRunId;
};

const taskKindFromRecord = (record: TaskDelegationRecord): DelegatedTaskEntryKind => {
  const segments = record.taskRun?.address.segments ?? [];
  const lastTaskSegment = [...segments]
    .reverse()
    .find((segment) => segment.kind === 'task_agent' || segment.kind === 'task_team');
  if (lastTaskSegment?.kind === 'task_agent') return 'task_agent';
  if (lastTaskSegment?.kind === 'task_team') return 'task_team';
  return record.receiverTargetKind === 'team' ? 'task_team' : 'task_agent';
};

const taskArgumentsFromRecord = (record: TaskDelegationRecord): Record<string, unknown> => ({
  target: {
    kind: record.receiverTargetKind,
    address: record.receiverAddress,
  },
  description: record.content,
  reference_files: record.referenceFiles.map((reference) => reference.path),
});

const liveEntryFromNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
  persistedRecord: TaskDelegationRecord | null = null,
): DelegatedTaskEntry => {
  const isTaskTeam = Boolean(node.isTaskTeamInstance);
  const context = isTaskTeam ? null : getContext(teamContext, node.memberRouteKey);
  const runId = isTaskTeam
    ? node.taskTeamRunId || node.memberRunId || node.memberRouteKey
    : node.taskAgentRunId || node.memberRunId || node.memberRouteKey;
  const taskId = (persistedRecord?.taskId ?? node.taskId)?.trim() || null;
  const taskLabel = node.taskLabel?.trim() || (taskId ? idPreview(taskId) : null);
  const disambiguator = taskId || taskLabel || runId || node.memberRouteKey;
  const taskTargetKind = persistedRecord?.receiverTargetKind ?? node.taskTargetKind?.trim() ?? (isTaskTeam ? 'team' : 'member');
  const taskTargetName = persistedRecord
    ? formatTeamCommunicationAddressLabel(persistedRecord.receiverAddress)
    : resolveTargetName(teamContext, node);
  const taskExecutionStatus = node.taskExecutionStatus ?? null;
  const agentStatus = node.memberKind === 'agent' ? node.currentStatus : null;

  return {
    kind: isTaskTeam ? 'task_team' : 'task_agent',
    entryKey: taskId ? `task:${taskId}` : `live:${node.memberRouteKey}`,
    node,
    context,
    persistedRecord,
    teamRunId: teamContext.teamRunId,
    targetDisplayName: taskTargetName,
    taskId,
    taskLabel,
    shortTaskDisambiguator: idPreview(disambiguator),
    taskDescription: persistedRecord?.content ?? node.taskDescription?.trim() ?? null,
    taskReferenceFiles: persistedRecord?.referenceFiles.map((reference) => ({ ...reference }))
      ?? (node.taskReferenceFiles ? node.taskReferenceFiles.map((reference) => ({ ...reference })) : []),
    taskArguments: persistedRecord ? taskArgumentsFromRecord(persistedRecord) : node.taskArguments ?? null,
    taskTargetKind,
    taskTargetName,
    runId,
    status: context?.state.currentStatus ?? agentStatus ?? AgentStatus.Initializing,
    statusLabel: formatStatus(taskExecutionStatus ?? context?.state.currentStatus ?? agentStatus ?? persistedRecord?.status),
  };
};

const persistedEntry = (
  teamContext: AgentTeamContext,
  record: TaskDelegationRecord,
  liveNode: TeamMemberNode | null,
): DelegatedTaskEntry => {
  if (liveNode) return liveEntryFromNode(teamContext, liveNode, record);
  const runId = taskRunIdFromRecord(record);
  return {
    kind: taskKindFromRecord(record),
    entryKey: `task:${record.taskId}`,
    node: null,
    context: null,
    persistedRecord: record,
    teamRunId: teamContext.teamRunId,
    targetDisplayName: formatTeamCommunicationAddressLabel(record.receiverAddress),
    taskId: record.taskId,
    taskLabel: idPreview(record.taskId),
    shortTaskDisambiguator: idPreview(record.taskId),
    taskDescription: record.content,
    taskReferenceFiles: record.referenceFiles.map((reference) => ({ ...reference })),
    taskArguments: taskArgumentsFromRecord(record),
    taskTargetKind: record.receiverTargetKind,
    taskTargetName: formatTeamCommunicationAddressLabel(record.receiverAddress),
    runId,
    status: AgentStatus.Offline,
    statusLabel: `Persisted ${formatStatus(record.status)}`,
  };
};

export const deriveDelegatedTaskEntries = (
  teamContext: AgentTeamContext,
  persistedRecords: readonly TaskDelegationRecord[] = [],
  focusedAddress?: ConversationTargetAddress | null,
): DelegatedTaskEntry[] => {
  const liveNodes = collectTaskNodes(teamContext.memberTree);
  const liveNodesByTaskId = new Map<string, TeamMemberNode>();
  liveNodes.forEach((node) => {
    const taskId = node.taskId?.trim();
    if (taskId && !liveNodesByTaskId.has(taskId)) liveNodesByTaskId.set(taskId, node);
  });

  const consumedLiveNodes = new Set<TeamMemberNode>();
  persistedRecords.forEach((record) => {
    const liveNode = liveNodesByTaskId.get(record.taskId);
    if (liveNode) consumedLiveNodes.add(liveNode);
  });
  const persistedEntries = persistedRecords
    .filter((record) => recordMatchesFocusedAddress(record, focusedAddress))
    .map((record) => {
      const liveNode = liveNodesByTaskId.get(record.taskId) ?? null;
      return persistedEntry(teamContext, record, liveNode);
    });
  const provisionalLiveEntries = liveNodes
    .filter((node) => !consumedLiveNodes.has(node))
    .filter((node) => liveNodeMatchesFocusedAddress(node, focusedAddress))
    .map((node) => liveEntryFromNode(teamContext, node));

  return [...persistedEntries, ...provisionalLiveEntries];
};
