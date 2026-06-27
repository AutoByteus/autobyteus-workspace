import type { AgentContext } from '~/types/agent/AgentContext';
import type { AIResponseSegment, ToolApprovalTarget, ToolInvocationLifecycle } from '~/types/segments';
import type { ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';

export interface PendingTaskApproval {
  invocationId: string;
  toolName: string;
  approvalTarget: ToolApprovalTarget | null;
}

const isToolLifecycleSegment = (segment: AIResponseSegment): segment is AIResponseSegment & ToolInvocationLifecycle => (
  'invocationId' in segment &&
  typeof segment.invocationId === 'string' &&
  'status' in segment &&
  segment.status === 'awaiting-approval'
);

export const findPendingTaskApprovals = (context: AgentContext | null): PendingTaskApproval[] => {
  if (!context) return [];
  return context.state.conversation.messages.flatMap((message) => {
    if (message.type !== 'ai') return [];
    return message.segments
      .filter(isToolLifecycleSegment)
      .map((segment) => ({
        invocationId: segment.invocationId,
        toolName: segment.toolName,
        approvalTarget: segment.approvalTarget ?? null,
      }));
  });
};

export const getActiveTaskApprovals = (entry: ActiveTaskEntry): PendingTaskApproval[] => (
  entry.kind === 'task_agent' ? findPendingTaskApprovals(entry.context) : []
);

export const buildActiveTaskApprovalTarget = (
  entry: ActiveTaskEntry,
  approval: PendingTaskApproval,
): ToolApprovalTarget => ({
  memberRouteKey: entry.node.logicalMemberRouteKey ?? approval.approvalTarget?.memberRouteKey ?? null,
  memberPath: approval.approvalTarget?.memberPath ?? null,
  sourceRouteKey: entry.node.logicalMemberRouteKey ?? approval.approvalTarget?.sourceRouteKey ?? null,
  sourcePath: approval.approvalTarget?.sourcePath ?? null,
  taskAgentRunId: entry.node.taskAgentRunId ?? entry.node.memberRunId ?? entry.node.memberRouteKey,
  taskTeamRunId: entry.node.parentTaskTeamRunId ?? approval.approvalTarget?.taskTeamRunId ?? null,
  teamRouteKey: approval.approvalTarget?.teamRouteKey ?? null,
  teamPath: approval.approvalTarget?.teamPath ?? null,
  taskTeamRelativeMemberRouteKey: entry.node.taskTeamRelativeMemberRouteKey ?? approval.approvalTarget?.taskTeamRelativeMemberRouteKey ?? null,
  taskTeamRelativeMemberPath: entry.node.taskTeamRelativeMemberPath ?? approval.approvalTarget?.taskTeamRelativeMemberPath ?? null,
});
