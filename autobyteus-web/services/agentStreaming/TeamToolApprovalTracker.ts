import type { ToolApprovalTarget } from '~/types/segments';
import type { ServerMessage, TeamClientMessage } from './protocol';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

type ToolActionSelectorPayload = Partial<NonNullable<Extract<TeamClientMessage, { type: 'APPROVE_TOOL' }>['payload']>>;
export class TeamToolApprovalTracker {
  private readonly tokenByInvocationId = new Map<string, unknown>();
  private readonly targetByInvocationId = new Map<string, ToolApprovalTarget>();
  track(message: ServerMessage): void {
    if (message.type !== 'TOOL_APPROVAL_REQUESTED' || !message.payload.invocation_id) return;
    if (message.payload.approval_token) this.tokenByInvocationId.set(message.payload.invocation_id, message.payload.approval_token);
    if (message.payload.execution_address) this.targetByInvocationId.set(message.payload.invocation_id, {
      executionAddress: createTeamExecutionAddress(message.payload.execution_address),
    });
  }
  getToken(invocationId: string): unknown { return this.tokenByInvocationId.get(invocationId); }
  resolveTarget(invocationId: string, target?: ToolApprovalTarget | null): ToolApprovalTarget | null {
    return target ?? this.targetByInvocationId.get(invocationId) ?? null;
  }
  toSelectorPayload(target: ToolApprovalTarget | null): ToolActionSelectorPayload {
    return target ? { execution_address: createTeamExecutionAddress(target.executionAddress) } : {};
  }
  complete(invocationId: string): void { this.tokenByInvocationId.delete(invocationId); this.targetByInvocationId.delete(invocationId); }
  clear(): void { this.tokenByInvocationId.clear(); this.targetByInvocationId.clear(); }
}
