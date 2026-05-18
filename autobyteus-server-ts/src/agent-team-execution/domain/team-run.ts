import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { normalizeAgentApiStatus, type AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { InterAgentMessageDeliveryRequest } from "./inter-agent-message-delivery.js";
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
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunStatusUpdateData,
} from "./team-run-event.js";
import type { TeamStatusPayload } from "./team-status-payload.js";

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
  private statusOverride: TeamStatusPayload | null = null;

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
    const wrappedListener: TeamRunEventListener = (event) => {
      this.observeBackendEvent(event);
      listener(event);
    };
    const unsubscribeBackend = this.backend.subscribeToEvents(wrappedListener);
    return () => {
      unsubscribeBackend();
    };
  }

  getStatusSnapshot() {
    return this.statusOverride ?? this.backend.getStatusSnapshot();
  }

  getMemberStatusSnapshots() {
    return this.backend.getMemberStatusSnapshots();
  }

  async postMessage(
    message: AgentInputUserMessage,
    target: TeamMemberSelector | null = null,
  ): Promise<AgentOperationResult> {
    return this.backend.postMessage(
      message,
      this.resolvePostMessageTarget(target),
    );
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    return this.backend.deliverInterAgentMessage(request);
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    return this.backend.approveToolInvocation(
      target,
      invocationId,
      approved,
      reason,
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

  async terminate(): Promise<AgentOperationResult> {
    return this.backend.terminate();
  }

  private observeBackendEvent(event: TeamRunEvent): void {
    if (event.eventSourceType !== TeamRunEventSourceType.TEAM || event.sourcePath.length > 0) {
      return;
    }
    const data = event.data as TeamRunStatusUpdateData;
    const status: AgentApiStatus = normalizeAgentApiStatus(data.status);
    this.statusOverride = {
      status,
      source_path: event.sourcePath,
    };
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
