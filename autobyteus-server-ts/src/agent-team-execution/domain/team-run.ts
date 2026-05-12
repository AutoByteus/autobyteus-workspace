import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "./inter-agent-message-delivery.js";
import type { TeamRunConfig } from "./team-run-config.js";
import type { TeamRunBackend } from "../backends/team-run-backend.js";
import {
  getRuntimeMemberContexts,
  type RuntimeTeamRunContext,
  type TeamRunContext,
} from "./team-run-context.js";
import {
  selectorFromMemberName,
  selectorFromMemberRouteKey,
  type TeamMemberSelector,
} from "./team-run-member-identity.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "./team-run-event.js";

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

  getStatus(): string | null {
    return this.backend.getStatus();
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

  async interrupt(): Promise<AgentOperationResult> {
    return this.backend.interrupt();
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

    const coordinatorMemberName =
      typeof this.context?.coordinatorMemberName === "string" &&
      this.context.coordinatorMemberName.trim().length > 0
        ? this.context.coordinatorMemberName.trim()
        : typeof this.configValue?.coordinatorMemberName === "string" &&
            this.configValue.coordinatorMemberName.trim().length > 0
          ? this.configValue.coordinatorMemberName.trim()
          : null;
    if (coordinatorMemberName) {
      return selectorFromMemberName(coordinatorMemberName);
    }

    const memberContexts = getRuntimeMemberContexts(this.context?.runtimeContext ?? null);
    if (memberContexts.length === 1) {
      const soleMemberName = memberContexts[0]?.memberName;
      return typeof soleMemberName === "string" && soleMemberName.trim().length > 0
        ? selectorFromMemberName(soleMemberName.trim())
        : null;
    }

    return null;
  }
}
