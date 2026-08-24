import type { TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import type { ToolApprovalTarget } from '~/types/segments';

export class TeamToolApprovalTargetTracker {
  private readonly targetByInvocationId = new Map<string, ToolApprovalTarget>();

  track(message: TeamStreamServerMessage): void {
    if (message.type !== 'TOOL_APPROVAL_REQUESTED') return;
    this.targetByInvocationId.set(message.payload.invocation_id, { agentRunId: message.payload.agent_run_id });
  }

  resolveTarget(invocationId: string, target?: ToolApprovalTarget | null): ToolApprovalTarget | null {
    return target ?? this.targetByInvocationId.get(invocationId) ?? null;
  }

  complete(invocationId: string): void { this.targetByInvocationId.delete(invocationId); }
  clear(): void { this.targetByInvocationId.clear(); }
}
