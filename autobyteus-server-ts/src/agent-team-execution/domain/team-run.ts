import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "./inter-agent-message-delivery.js";
import type { TeamRunConfig } from "./team-run-config.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import {
  getRuntimeMemberContexts,
  type RuntimeTeamRunContext,
  type TeamRunContext,
} from "./team-run-context.js";
import {
  selectorFromMemberRouteKey,
  type TeamMemberSelector,
} from "./team-run-member-identity.js";
import {
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
} from "./team-run-event.js";
import type { StartTaskAgentInstanceRequest } from "./task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "./task-team-instance.js";
import type { ConversationTargetAddress } from "./conversation-target-address.js";

type TeamRunOptions = {
  context?: TeamRunContext<RuntimeTeamRunContext>;
  runId?: string;
  config?: TeamRunConfig | null;
  backend: TeamRunBackend;
};

export class TeamRun {
  readonly context: TeamRunContext<RuntimeTeamRunContext> | null;
  private readonly backend: TeamRunBackend;
  private readonly configValue: TeamRunConfig | null;

  constructor(options: TeamRunOptions) {
    this.context = options.context ?? null;
    this.backend = options.backend;
    this.configValue = options.context?.config ?? options.config ?? null;
  }

  get runId(): string {
    return this.context?.runId ?? this.backend.runId;
  }

  get teamBackendKind(): TeamRunBackend["teamBackendKind"] {
    return this.context?.teamBackendKind ?? this.backend.teamBackendKind;
  }

  get config(): TeamRunConfig | null {
    return this.configValue;
  }

  isActive(): boolean {
    return this.backend.isActive();
  }

  getRuntimeContext() {
    return this.context?.runtimeContext ?? this.backend.getRuntimeContext();
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    return this.backend.subscribeToEvents(listener);
  }

  getLeafAgentStatusSnapshots() {
    return this.backend.getLeafAgentStatusSnapshots();
  }

  hasOpenExecutionWork(): boolean {
    return this.backend.hasOpenExecutionWork();
  }

  async postMessage(
    message: AgentInputUserMessage,
    target: TeamMemberSelector | null = null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    return this.backend.postMessage(
      message,
      this.resolvePostMessageTarget(target),
      targetMemberRunId,
    );
  }

  async postMessageToConversationTarget(
    message: AgentInputUserMessage,
    address: ConversationTargetAddress,
  ): Promise<AgentOperationResult> {
    return this.backend.postMessageToConversationTarget(message, address);
  }

  async deliverInterAgentMessage(
    intent: InterAgentMessageDeliveryIntent,
  ): Promise<AgentOperationResult> {
    return this.backend.deliverInterAgentMessage(intent);
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
    targetMemberRunId: string | null = null,
    taskTeamRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    return this.backend.approveToolInvocation(
      target,
      invocationId,
      approved,
      reason,
      targetMemberRunId,
      taskTeamRunId,
    );
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    const normalizedTargetMemberRouteKey = targetMemberRouteKey.trim();
    if (!normalizedTargetMemberRouteKey) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_REQUIRED",
        message: "targetMemberRouteKey is required.",
      };
    }
    return this.backend.interruptMember(
      normalizedTargetMemberRouteKey,
      targetMemberRunId,
    );
  }

  async settleMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const normalizedTargetMemberRouteKey = targetMemberRouteKey.trim();
    if (!normalizedTargetMemberRouteKey) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_REQUIRED",
        message: "targetMemberRouteKey is required.",
      };
    }
    return this.backend.settleMember(
      normalizedTargetMemberRouteKey,
      targetMemberRunId,
      reason,
    );
  }

  async startTaskAgentInstance(
    request: StartTaskAgentInstanceRequest,
  ): Promise<AgentOperationResult> {
    return this.backend.startTaskAgentInstance(request);
  }

  async settleTaskAgentInstance(
    logicalMemberRouteKey: string,
    taskAgentRunId: string,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const normalizedLogicalMemberRouteKey = logicalMemberRouteKey.trim();
    const normalizedTaskAgentRunId = taskAgentRunId.trim();
    if (!normalizedLogicalMemberRouteKey || !normalizedTaskAgentRunId) {
      return {
        accepted: false,
        code: "TASK_AGENT_TARGET_REQUIRED",
        message: "logicalMemberRouteKey and taskAgentRunId are required.",
      };
    }
    return this.backend.settleTaskAgentInstance(
      normalizedLogicalMemberRouteKey,
      normalizedTaskAgentRunId,
      reason,
    );
  }


  async startTaskTeamInstance(
    request: StartTaskTeamInstanceRequest,
  ): Promise<AgentOperationResult> {
    return this.backend.startTaskTeamInstance(request);
  }

  async postMessageToTaskTeamInstance(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    message: AgentInputUserMessage,
  ): Promise<AgentOperationResult> {
    const normalizedLogicalTeamRouteKey = logicalTeamRouteKey.trim();
    const normalizedTaskTeamRunId = taskTeamRunId.trim();
    if (!normalizedLogicalTeamRouteKey || !normalizedTaskTeamRunId) {
      return {
        accepted: false,
        code: "TASK_TEAM_TARGET_REQUIRED",
        message: "logicalTeamRouteKey and taskTeamRunId are required.",
      };
    }
    return this.backend.postMessageToTaskTeamInstance(
      normalizedLogicalTeamRouteKey,
      normalizedTaskTeamRunId,
      message,
    );
  }

  async settleTaskTeamInstance(
    logicalTeamRouteKey: string,
    taskTeamRunId: string,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    const normalizedLogicalTeamRouteKey = logicalTeamRouteKey.trim();
    const normalizedTaskTeamRunId = taskTeamRunId.trim();
    if (!normalizedLogicalTeamRouteKey || !normalizedTaskTeamRunId) {
      return {
        accepted: false,
        code: "TASK_TEAM_TARGET_REQUIRED",
        message: "logicalTeamRouteKey and taskTeamRunId are required.",
      };
    }
    return this.backend.settleTaskTeamInstance(
      normalizedLogicalTeamRouteKey,
      normalizedTaskTeamRunId,
      reason,
    );
  }

  publishEvent(event: TeamRunEvent): void {
    this.backend.publishEvent(event);
  }

  async terminate(): Promise<AgentOperationResult> {
    return this.backend.terminate();
  }

  private resolvePostMessageTarget(
    target: TeamMemberSelector | null,
  ): TeamMemberSelector | null {
    if (target) {
      return target;
    }

    const coordinatorMemberRouteKey =
      typeof this.context?.coordinatorMemberRouteKey === "string" &&
      this.context.coordinatorMemberRouteKey.trim().length > 0
        ? this.context.coordinatorMemberRouteKey.trim()
        : typeof this.configValue?.coordinatorMemberRouteKey === "string" &&
            this.configValue.coordinatorMemberRouteKey.trim().length > 0
          ? this.configValue.coordinatorMemberRouteKey.trim()
          : null;
    if (coordinatorMemberRouteKey) {
      return selectorFromMemberRouteKey(coordinatorMemberRouteKey);
    }

    const memberContexts = getRuntimeMemberContexts(this.context?.runtimeContext ?? null);
    if (memberContexts.length === 1) {
      const soleMemberRouteKey = memberContexts[0]?.memberRouteKey;
      return typeof soleMemberRouteKey === "string" && soleMemberRouteKey.trim().length > 0
        ? selectorFromMemberRouteKey(soleMemberRouteKey.trim())
        : null;
    }

    return null;
  }
}
