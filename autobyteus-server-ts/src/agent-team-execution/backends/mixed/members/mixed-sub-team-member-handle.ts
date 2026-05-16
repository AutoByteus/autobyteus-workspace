import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import { buildAgentStatusPayload } from "../../../../agent-execution/domain/agent-status-payload.js";
import type { TeamRun } from "../../../domain/team-run.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import {
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryHandler,
  type InterAgentMessageDeliveryRequest,
} from "../../../domain/inter-agent-message-delivery.js";
import type { AgentMemberTeamDescriptor } from "../../../domain/member-team-context.js";
import {
  selectorFromMemberRouteKey,
  selectorToRouteKey,
  stripSelectorTopLevel,
  type TeamMemberSelector,
} from "../../../domain/team-run-member-identity.js";
import { TeamRunEventSourceType, type TeamRunStatusUpdateData } from "../../../domain/team-run-event.js";
import type { TeamSubTeamMemberRunConfig } from "../../../domain/team-run-config.js";
import type { MixedTeamRunContext, MixedSubTeamMemberContext } from "../mixed-team-run-context.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { buildInterAgentDeliveryInputMessage } from "../../../services/inter-agent-message-runtime-builders.js";
import { prefixMixedSubTeamEvent } from "../events/mixed-team-event-bridge.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";

const unsupportedSubteamApproval = (memberName: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_AGENT",
  message: `Team member '${memberName}' is a subteam; approve a nested agent by memberPath or memberRouteKey.`,
});

const buildTargetMemberRunInactiveResult = (
  targetMemberRouteKey: string,
): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Team member route key '${targetMemberRouteKey}' is not active.`,
});

export class MixedSubTeamMemberHandle implements MixedTeamMemberHandle {
  readonly context: MixedSubTeamMemberContext;
  private childRun: TeamRun | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly options: {
    parentContext: TeamRunContext<MixedTeamRunContext>;
    context: MixedSubTeamMemberContext;
    config: TeamSubTeamMemberRunConfig;
    subTeamRunFactory: MixedSubTeamRunFactory;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
  }) {
    this.context = options.context;
  }

  isActive(): boolean {
    return this.childRun?.isActive() ?? false;
  }

  getStatusSnapshot() {
    return buildAgentStatusPayload({
      status: this.childRun?.getStatusSnapshot().status ?? "offline",
      canInterrupt: false,
      agentId: this.context.memberRunId,
      agentName: this.context.memberName,
    });
  }

  async postMessage(message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const childRun = await this.ensureReady();
    const result = await childRun.postMessage(message, null);
    this.options.notifyStatusChange();
    return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
  }

  async deliverInterMemberMessage(request: InterAgentMessageDeliveryRequest): Promise<AgentOperationResult> {
    const childRun = await this.ensureReady();
    const childSelector = stripSelectorTopLevel(request.recipient.selector);
    const result = await childRun.postMessage(buildInterAgentDeliveryInputMessage(request), childSelector);
    this.options.notifyStatusChange();
    return { ...result, memberRunId: this.context.memberRunId, memberName: this.context.memberName };
  }

  async approveToolInvocation(
    target: TeamMemberSelector | null,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!target) {
      return unsupportedSubteamApproval(this.context.memberName);
    }
    const childSelector = stripSelectorTopLevel(target) ?? target;
    const childRun = await this.ensureReady();
    return childRun.approveToolInvocation(childSelector, invocationId, approved, reason ?? null);
  }

  async interrupt(
    target: TeamMemberSelector | null,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.childRun?.isActive()) {
      const targetRouteKey = target ? selectorToRouteKey(target) : this.context.memberRouteKey;
      return buildTargetMemberRunInactiveResult(targetRouteKey);
    }

    const childSelector = target ? stripSelectorTopLevel(target) : null;
    if (childSelector) {
      return this.childRun.interruptMember(
        selectorToRouteKey(childSelector),
        targetMemberRunId,
      );
    }

    const defaultChildRouteKey = this.resolveDefaultChildRouteKey();
    if (!defaultChildRouteKey) {
      return {
        accepted: false,
        code: "TARGET_MEMBER_REQUIRED",
        message: "target member selector is required.",
      };
    }

    return this.childRun.interruptMember(defaultChildRouteKey, null);
  }

  async terminate(): Promise<AgentOperationResult> {
    const result = this.childRun ? await this.childRun.terminate() : { accepted: true };
    this.dispose();
    return result;
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.childRun = null;
    this.context.childRuntimeContext = null;
  }

  private async ensureReady(): Promise<TeamRun> {
    if (this.childRun?.isActive()) {
      return this.childRun;
    }
    const restoreRuntimeContext = this.context.childRuntimeContext;
    this.dispose();
    this.childRun = await this.options.subTeamRunFactory.createOrRestore({
      parentTeamRunId: this.options.parentContext.runId,
      subTeamConfig: this.options.config,
      childTeamRunId: this.context.childTeamRunId ?? this.options.config.childTeamRunId ?? null,
      restoreRuntimeContext,
      parentBoundary: {
        parentTeamRunId: this.options.parentContext.runId,
        parentTeamDefinitionId: this.options.parentContext.config?.teamDefinitionId ?? null,
        representedSubTeam: {
          memberKind: "agent_team",
          memberName: this.context.memberName,
          memberPath: [...this.context.memberPath],
          memberRouteKey: this.context.memberRouteKey,
          memberRunId: this.context.memberRunId,
          teamDefinitionId: this.context.teamDefinitionId,
          childTeamRunId: this.context.childTeamRunId ?? this.options.config.childTeamRunId ?? null,
          address: buildTeamMemberAddress({
            teamRunId: this.options.parentContext.runId,
            memberPath: this.context.memberPath,
            memberRouteKey: this.context.memberRouteKey,
          }),
        },
        parentMembers: this.buildParentBoundaryMembers(),
        deliverInterAgentMessage: this.options.deliverInterAgentMessage,
      },
    });
    this.context.childTeamRunId = this.childRun.runId;
    this.context.childRuntimeContext = this.childRun.getRuntimeContext() as MixedTeamRunContext;
    this.bindEvents(this.childRun);
    this.publishStatus("IDLE");
    return this.childRun;
  }

  private buildParentBoundaryMembers(): AgentMemberTeamDescriptor[] {
    return this.options.parentContext.runtimeContext.memberContexts
      .filter((memberContext) => memberContext.memberKind === "agent")
      .map((memberContext) => ({
        memberKind: "agent" as const,
        memberName: memberContext.memberName,
        memberPath: [...memberContext.memberPath],
        memberRouteKey: memberContext.memberRouteKey,
        memberRunId: memberContext.memberRunId,
        runtimeKind: memberContext.runtimeKind,
        role: null,
        description: null,
        address: buildTeamMemberAddress({
          teamRunId: this.options.parentContext.runId,
          memberPath: memberContext.memberPath,
          memberRouteKey: memberContext.memberRouteKey,
        }),
      }));
  }

  private resolveDefaultChildRouteKey(): string | null {
    const configuredRouteKey = this.options.config.coordinatorMemberRouteKey?.trim();
    if (configuredRouteKey) {
      return selectorToRouteKey(selectorFromMemberRouteKey(configuredRouteKey));
    }
    const runtimeContext = this.childRun?.getRuntimeContext();
    const coordinatorRouteKey =
      typeof runtimeContext?.coordinatorMemberRouteKey === "string" &&
      runtimeContext.coordinatorMemberRouteKey.trim().length > 0
        ? runtimeContext.coordinatorMemberRouteKey.trim()
        : null;
    if (coordinatorRouteKey) {
      return selectorToRouteKey(selectorFromMemberRouteKey(coordinatorRouteKey));
    }
    const memberContexts = Array.isArray((runtimeContext as MixedTeamRunContext | null)?.memberContexts)
      ? (runtimeContext as MixedTeamRunContext).memberContexts
      : [];
    if (memberContexts.length === 1) {
      return selectorToRouteKey(selectorFromMemberRouteKey(memberContexts[0].memberRouteKey));
    }
    return null;
  }

  private bindEvents(childRun: TeamRun): void {
    this.unsubscribe?.();
    this.unsubscribe = childRun.subscribeToEvents((event) => {
      this.options.publish(prefixMixedSubTeamEvent({
        parentTeamRunId: this.options.parentContext.runId,
        sourcePrefix: this.context.memberPath,
        event,
      }));
      this.options.notifyStatusChange();
    });
  }

  private publishStatus(status: string): void {
    this.options.publish({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: this.options.parentContext.runId,
      sourcePath: this.context.memberPath,
      data: { status: status === "ERROR" ? "error" : "idle" } satisfies TeamRunStatusUpdateData,
    });
    this.options.notifyStatusChange();
  }
}
