import type { ToolApprovalTarget } from '~/types/segments';
import type { ServerMessage, TeamClientMessage } from './protocol';

type ToolActionSelectorPayload = Partial<
  NonNullable<Extract<TeamClientMessage, { type: 'APPROVE_TOOL' }>['payload']>
>;

export class TeamToolApprovalTracker {
  private readonly tokenByInvocationId = new Map<string, unknown>();
  private readonly targetByInvocationId = new Map<string, ToolApprovalTarget>();

  track(message: ServerMessage): void {
    if (message.type !== 'TOOL_APPROVAL_REQUESTED') return;
    const payload = message.payload as typeof message.payload & {
      taskAgentRunId?: string;
      taskTeamRunId?: string;
      teamRouteKey?: string;
      teamPath?: string[];
      taskTeamRelativeMemberRouteKey?: string;
      taskTeamRelativeMemberPath?: string[];
    };
    if (!payload.invocation_id) return;
    if (payload.approval_token) {
      this.tokenByInvocationId.set(payload.invocation_id, payload.approval_token);
    }
    const target = this.normalizeTarget({
      memberRouteKey: payload.member_route_key,
      memberPath: payload.member_path,
      sourceRouteKey: payload.source_route_key,
      sourcePath: payload.source_path,
      taskAgentRunId: payload.task_agent_run_id ?? payload.taskAgentRunId,
      taskTeamRunId: payload.task_team_run_id ?? payload.taskTeamRunId,
      teamRouteKey: payload.team_route_key ?? payload.teamRouteKey,
      teamPath: payload.team_path ?? payload.teamPath,
      taskTeamRelativeMemberRouteKey:
        payload.task_team_relative_member_route_key ?? payload.taskTeamRelativeMemberRouteKey,
      taskTeamRelativeMemberPath:
        payload.task_team_relative_member_path ?? payload.taskTeamRelativeMemberPath,
    });
    if (target) this.targetByInvocationId.set(payload.invocation_id, target);
  }

  getToken(invocationId: string): unknown {
    return this.tokenByInvocationId.get(invocationId);
  }

  resolveTarget(invocationId: string, target?: ToolApprovalTarget | null): ToolApprovalTarget | null {
    return this.normalizeTarget(target ?? null) ?? this.targetByInvocationId.get(invocationId) ?? null;
  }

  toSelectorPayload(target: ToolApprovalTarget | null): ToolActionSelectorPayload {
    if (!target) return {};
    return {
      member_route_key: target.memberRouteKey || undefined,
      member_path: target.memberPath || undefined,
      source_route_key: target.sourceRouteKey || undefined,
      source_path: target.sourcePath || undefined,
      task_agent_run_id: target.taskAgentRunId || undefined,
      task_team_run_id: target.taskTeamRunId || undefined,
      team_route_key: target.teamRouteKey || undefined,
      team_path: target.teamPath || undefined,
      task_team_relative_member_route_key: target.taskTeamRelativeMemberRouteKey || undefined,
      task_team_relative_member_path: target.taskTeamRelativeMemberPath || undefined,
    };
  }

  complete(invocationId: string): void {
    this.tokenByInvocationId.delete(invocationId);
    this.targetByInvocationId.delete(invocationId);
  }

  clear(): void {
    this.tokenByInvocationId.clear();
    this.targetByInvocationId.clear();
  }

  private normalizeTarget(target: ToolApprovalTarget | null): ToolApprovalTarget | null {
    if (!target) return null;
    const normalizePath = (value?: string[] | null): string[] | null =>
      Array.isArray(value) ? value.map((part) => String(part).trim()).filter(Boolean) : null;
    const memberPath = normalizePath(target.memberPath);
    const sourcePath = normalizePath(target.sourcePath);
    const teamPath = normalizePath(target.teamPath);
    const relativePath = normalizePath(target.taskTeamRelativeMemberPath);
    const normalized = {
      memberRouteKey: target.memberRouteKey?.trim() || memberPath?.join('/') || null,
      memberPath: memberPath?.length ? memberPath : null,
      sourceRouteKey: target.sourceRouteKey?.trim() || sourcePath?.join('/') || null,
      sourcePath: sourcePath?.length ? sourcePath : null,
      taskAgentRunId: target.taskAgentRunId?.trim() || null,
      taskTeamRunId: target.taskTeamRunId?.trim() || null,
      teamRouteKey: target.teamRouteKey?.trim() || teamPath?.join('/') || null,
      teamPath: teamPath?.length ? teamPath : null,
      taskTeamRelativeMemberRouteKey:
        target.taskTeamRelativeMemberRouteKey?.trim() || relativePath?.join('/') || null,
      taskTeamRelativeMemberPath: relativePath?.length ? relativePath : null,
    };
    return Object.values(normalized).some((value) => Array.isArray(value) ? value.length > 0 : !!value)
      ? normalized
      : null;
  }
}
