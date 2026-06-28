import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';

export type ActiveTaskEntryKind = 'task_agent' | 'task_team';

export interface ActiveTaskMemberTarget {
  node: TeamMemberNode;
  depth: number;
  displayName: string;
}

export interface ActiveTaskEntry {
  kind: ActiveTaskEntryKind;
  node: TeamMemberNode;
  context: AgentContext | null;
  targetDisplayName: string;
  taskId: string | null;
  taskLabel: string | null;
  shortTaskDisambiguator: string;
  taskDescription: string | null;
  taskTargetKind: string | null;
  taskTargetName: string | null;
  runId: string | null;
  status: AgentStatus;
  statusLabel: string;
  members: ActiveTaskMemberTarget[];
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

const flattenMembers = (
  nodes: readonly TeamMemberNode[],
  depth = 0,
): ActiveTaskMemberTarget[] => nodes.flatMap((node) => {
  if (node.isTaskAgentInstance) {
    return [];
  }
  return [
    {
      node,
      depth,
      displayName: node.displayName || node.memberName || node.memberRouteKey,
    },
    ...(node.memberKind === 'agent_team' ? flattenMembers(node.children, depth + 1) : []),
  ];
});

export const deriveActiveTaskEntries = (
  teamContext: AgentTeamContext,
): ActiveTaskEntry[] => collectTaskNodes(teamContext.memberTree)
  .map((node): ActiveTaskEntry => {
    const isTaskTeam = Boolean(node.isTaskTeamInstance);
    const context = isTaskTeam ? null : getContext(teamContext, node.memberRouteKey);
    const runId = isTaskTeam
      ? node.taskTeamRunId || node.memberRunId || node.memberRouteKey
      : node.taskAgentRunId || node.memberRunId || node.memberRouteKey;
    const taskId = node.taskId?.trim() || null;
    const taskLabel = node.taskLabel?.trim() || null;
    const disambiguator = taskId || taskLabel || runId || node.memberRouteKey;
    const taskTargetKind = node.taskTargetKind?.trim() || (isTaskTeam ? 'team' : 'member');
    const taskTargetName = resolveTargetName(teamContext, node);
    const taskExecutionStatus = node.taskExecutionStatus ?? null;

    return {
      kind: isTaskTeam ? 'task_team' : 'task_agent',
      node,
      context,
      targetDisplayName: taskTargetName,
      taskId,
      taskLabel,
      shortTaskDisambiguator: idPreview(disambiguator),
      taskDescription: node.taskDescription?.trim() || null,
      taskTargetKind,
      taskTargetName,
      runId,
      status: context?.state.currentStatus ?? node.currentStatus ?? AgentStatus.Initializing,
      statusLabel: formatStatus(taskExecutionStatus ?? context?.state.currentStatus ?? node.currentStatus),
      members: isTaskTeam && node.memberKind === 'agent_team' ? flattenMembers(node.children) : [],
    };
  });
