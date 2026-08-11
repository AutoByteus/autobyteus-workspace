import type { TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import type { ToolApprovalTarget } from '~/types/segments';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export class TeamToolApprovalTargetTracker {
  private readonly targetByInvocationId = new Map<string, ToolApprovalTarget>();

  track(message: TeamStreamServerMessage): void {
    if (message.type !== 'TOOL_APPROVAL_REQUESTED') return;
    this.targetByInvocationId.set(message.payload.invocation_id, {
      executionAddress: createTeamExecutionAddress({
        rootTeamRunId: message.payload.agent_execution.execution_address.root_team_run_id,
        taskTeamRunIds: message.payload.agent_execution.execution_address.task_team_run_ids,
        memberAddress: message.payload.agent_execution.execution_address.member_address,
        taskAgentRunId: message.payload.agent_execution.execution_address.task_agent_run_id,
      }),
    });
  }

  resolveTarget(invocationId: string, target?: ToolApprovalTarget | null): ToolApprovalTarget | null {
    return target ?? this.targetByInvocationId.get(invocationId) ?? null;
  }

  complete(invocationId: string): void { this.targetByInvocationId.delete(invocationId); }
  clear(): void { this.targetByInvocationId.clear(); }
}
