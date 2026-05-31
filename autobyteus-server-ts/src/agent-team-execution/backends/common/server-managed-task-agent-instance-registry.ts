import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import type { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import {
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../../agent-execution/domain/agent-run-event.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunEvent,
} from "../../domain/team-run-event.js";
import {
  cloneTaskAgentInstanceIdentity,
  type StartTaskAgentInstanceRequest,
  type TaskAgentInstanceIdentity,
} from "../../domain/task-agent-instance.js";

export type ServerManagedTaskAgentLogicalMember = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
};

type ActiveTaskAgentRun<TMember extends ServerManagedTaskAgentLogicalMember> = {
  logicalMember: TMember;
  identity: TaskAgentInstanceIdentity;
  run: AgentRun;
  unsubscribe: () => void;
};

export class ServerManagedTaskAgentInstanceRegistry<
  TMember extends ServerManagedTaskAgentLogicalMember,
> {
  private readonly activeByRunId = new Map<string, ActiveTaskAgentRun<TMember>>();

  constructor(private readonly options: {
    runtimeKind: RuntimeKind;
    agentRunManager: AgentRunManager;
    getTeamRunId: () => string | null;
    isTeamActive: () => boolean;
    findLogicalMemberByRouteKey: (memberRouteKey: string) => TMember | null;
    buildRunConfig: (
      logicalMember: TMember,
      identity: TaskAgentInstanceIdentity,
    ) => Promise<AgentRunConfig>;
    publish: (event: TeamRunEvent) => void;
    publishTeamStatusIfChanged: () => void;
  }) {}

  listStatusSnapshots(): AgentStatusPayload[] {
    return [...this.activeByRunId.values()].map(({ logicalMember, identity, run }) => ({
      ...run.getStatusSnapshot(),
      agent_name: logicalMember.memberName,
      agent_id: identity.taskAgentRunId,
      member_route_key: logicalMember.memberRouteKey,
      member_path: [...logicalMember.memberPath],
      source_route_key: logicalMember.memberRouteKey,
      source_path: [...logicalMember.memberPath],
      task_agent_instance_id: identity.taskAgentInstanceId,
      task_agent_run_id: identity.taskAgentRunId,
      task_id: identity.taskId,
    }));
  }

  async start(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    if (!this.options.isTeamActive()) {
      return this.runNotFound();
    }
    const teamRunId = this.options.getTeamRunId();
    if (!teamRunId || request.identity.teamRunId !== teamRunId) {
      return {
        accepted: false,
        code: "TEAM_RUN_MISMATCH",
        message: `Task-agent request is bound to team run '${request.identity.teamRunId}', not '${teamRunId ?? "unknown"}'.`,
      };
    }
    const existing = this.activeByRunId.get(request.identity.taskAgentRunId);
    if (existing?.run.isActive()) {
      return {
        accepted: false,
        code: "TASK_AGENT_ALREADY_ACTIVE",
        message: `Task-agent run '${request.identity.taskAgentRunId}' is already active.`,
      };
    }
    if (existing) {
      this.clear(request.identity.taskAgentRunId);
    }
    const logicalMember = this.options.findLogicalMemberByRouteKey(
      request.identity.logicalMember.memberRouteKey,
    );
    if (!logicalMember) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_NOT_FOUND",
        message: `Logical member '${request.identity.logicalMember.memberRouteKey}' was not found.`,
      };
    }
    const identity = cloneTaskAgentInstanceIdentity(request.identity);
    const runConfig = await this.options.buildRunConfig(logicalMember, identity);
    const run = await this.options.agentRunManager.createAgentRun(
      runConfig,
      identity.taskAgentRunId,
    );
    const unsubscribe = this.bindEvents(logicalMember, identity, run);
    this.activeByRunId.set(identity.taskAgentRunId, {
      logicalMember,
      identity,
      run,
      unsubscribe,
    });
    let result: AgentOperationResult;
    try {
      result = await run.postUserMessage(request.message);
    } catch (error) {
      await this.terminateAndClear(identity.taskAgentRunId);
      throw error;
    }
    if (!result.accepted) {
      await this.terminateAndClear(identity.taskAgentRunId);
    }
    this.options.publishTeamStatusIfChanged();
    return {
      ...result,
      memberRunId: identity.taskAgentRunId,
      memberName: logicalMember.memberName,
    };
  }

  async settle(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
  ): Promise<AgentOperationResult> {
    if (!this.options.isTeamActive()) {
      return this.runNotFound();
    }
    const active = this.activeByRunId.get(taskAgentRunId) ?? null;
    if (!active) {
      return {
        accepted: false,
        code: "TASK_AGENT_RUN_NOT_FOUND",
        message: `Task-agent run '${taskAgentRunId}' was not found.`,
      };
    }
    if (active.logicalMember.memberRouteKey !== logicalMemberRouteKey) {
      return {
        accepted: false,
        code: "TASK_AGENT_ROUTE_MISMATCH",
        message: `Task-agent run '${taskAgentRunId}' is not for logical member '${logicalMemberRouteKey}'.`,
      };
    }
    const result = await active.run.terminate();
    if (result.accepted) {
      this.clear(taskAgentRunId);
      this.options.publishTeamStatusIfChanged();
    }
    return result;
  }

  async approveToolInvocation(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.options.isTeamActive()) {
      return this.runNotFound();
    }
    const active = this.activeByRunId.get(taskAgentRunId) ?? null;
    if (!active) {
      return {
        accepted: false,
        code: "TASK_AGENT_RUN_NOT_FOUND",
        message: `Task-agent run '${taskAgentRunId}' was not found.`,
      };
    }
    if (active.logicalMember.memberRouteKey !== logicalMemberRouteKey) {
      return {
        accepted: false,
        code: "TASK_AGENT_ROUTE_MISMATCH",
        message: `Task-agent run '${taskAgentRunId}' is not for logical member '${logicalMemberRouteKey}'.`,
      };
    }
    return active.run.approveToolInvocation(invocationId, approved, reason ?? null);
  }

  resolveLogicalMemberForRunId(runId: string): TMember | null {
    for (const active of this.activeByRunId.values()) {
      if (
        active.identity.taskAgentRunId === runId ||
        active.run.runId === runId ||
        active.run.getPlatformAgentRunId() === runId
      ) {
        return active.logicalMember;
      }
    }
    return null;
  }

  async terminateAll(): Promise<AgentOperationResult> {
    for (const runId of [...this.activeByRunId.keys()]) {
      const result = await this.activeByRunId.get(runId)!.run.terminate();
      if (!result.accepted) {
        return result;
      }
      this.clear(runId);
    }
    return { accepted: true };
  }

  dispose(): void {
    for (const runId of [...this.activeByRunId.keys()]) {
      this.clear(runId);
    }
  }

  private bindEvents(
    logicalMember: TMember,
    identity: TaskAgentInstanceIdentity,
    run: AgentRun,
  ): () => void {
    return run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      this.options.publish(this.buildTeamEvent(logicalMember, identity, event));
      this.options.publishTeamStatusIfChanged();
    });
  }

  private buildTeamEvent(
    logicalMember: TMember,
    identity: TaskAgentInstanceIdentity,
    agentEvent: AgentRunEvent,
  ): TeamRunEvent {
    return {
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: this.options.getTeamRunId() ?? identity.teamRunId,
      sourcePath: [...logicalMember.memberPath],
      data: {
        runtimeKind: this.options.runtimeKind,
        memberName: logicalMember.memberName,
        memberRunId: identity.taskAgentRunId,
        memberPath: [...logicalMember.memberPath],
        memberRouteKey: logicalMember.memberRouteKey,
        agentEvent,
        taskAgentInstance: cloneTaskAgentInstanceIdentity(identity),
      } satisfies TeamRunAgentEventPayload,
    };
  }

  private async terminateAndClear(taskAgentRunId: string): Promise<void> {
    const active = this.activeByRunId.get(taskAgentRunId) ?? null;
    if (active?.run.isActive()) {
      await active.run.terminate();
    }
    this.clear(taskAgentRunId);
  }

  private clear(taskAgentRunId: string): void {
    const active = this.activeByRunId.get(taskAgentRunId) ?? null;
    active?.unsubscribe();
    this.activeByRunId.delete(taskAgentRunId);
  }

  private runNotFound(): AgentOperationResult {
    return {
      accepted: false,
      code: "RUN_NOT_FOUND",
      message: `Run '${this.options.getTeamRunId() ?? "unknown"}' is not active.`,
    };
  }
}
