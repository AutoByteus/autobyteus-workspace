import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentTeamEventStream } from "autobyteus-ts";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../agent-execution/domain/agent-run-event.js";
import { projectAutoByteusAgentStatus } from "../../../agent-execution/backends/autobyteus/events/autobyteus-status-projector.js";
import {
  buildAgentStatusPayload,
  type AgentStatusPayload,
} from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import type { RuntimeTeamRunContext } from "../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import {
  resolveTeamMemberSelector,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";
import type {
  TeamRunEvent,
  TeamRunAgentEventPayload,
  TeamRunEventListener,
  TeamRunEventUnsubscribe,
  TeamRunStatusUpdateData,
} from "../../domain/team-run-event.js";
import { TeamRunEventSourceType } from "../../domain/team-run-event.js";
import { buildInterAgentDeliveryInputMessage } from "../../services/inter-agent-message-runtime-builders.js";
import { AutoByteusTeamRunEventProcessor } from "./autobyteus-team-run-event-processor.js";
import {
  autoByteusTeamRunBackendLogger as logger,
  buildCommandFailure,
  buildRunNotFoundResult,
  buildTargetMemberNotFoundResult,
  buildTargetMemberRequiredResult,
  buildTargetMemberRunMismatchResult,
  buildTargetResolutionFailure,
  type AutoByteusTeamLike,
  type AutoByteusTeamRunBackendOptions,
} from "./autobyteus-team-run-backend-contracts.js";

export class AutoByteusTeamRunBackend implements TeamRunBackend {
  readonly runId: string;
  readonly teamBackendKind = TeamBackendKind.AUTOBYTEUS;
  private readonly listeners = new Set<TeamRunEventListener>();
  private readonly eventProcessor: AutoByteusTeamRunEventProcessor;
  private nativeEventStream: AgentTeamEventStream | null = null;
  private lastTeamStatus: AgentStatusPayload["status"] | null = null;

  constructor(
    private readonly team: AutoByteusTeamLike,
    private readonly options: AutoByteusTeamRunBackendOptions,
  ) {
    this.runId = team.teamId;
    this.eventProcessor = new AutoByteusTeamRunEventProcessor(this.runId, {
      memberRunIdsByName: options.memberRunIdsByName,
      runtimeContext: options.runtimeContext ?? null,
      teamRunConfig: options.teamRunConfig ?? null,
      getMemberStatusSnapshot: (memberRunId, memberName) =>
        this.getMemberStatusSnapshotFor(memberRunId, memberName),
      getTeamStatusSnapshot: () => this.getStatusSnapshot(),
    });
  }

  isActive(): boolean {
    return this.options.isActive();
  }

  getRuntimeContext(): RuntimeTeamRunContext {
    return this.options.runtimeContext ?? null;
  }

  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    this.ensureNativeEventBridge();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.closeNativeEventBridge();
      }
    };
  }

  getStatusSnapshot() {
    if (!this.isActive()) {
      return { status: "offline" as const };
    }
    return {
      status: deriveTeamApiStatus({
        memberStatuses: this.getMemberStatusSnapshots(),
        nativeTeamStatus: this.team.currentStatus,
      }),
    };
  }

  getMemberStatusSnapshots() {
    const members = this.team.context?.agents ?? [];
    return members.flatMap((member) => {
      const memberName = member.context?.config?.name?.trim() ?? "";
      if (!memberName) {
        return [];
      }
      return [projectAutoByteusAgentStatus({
        currentStatus: member.currentStatus,
        context: member.context ?? null,
        isActive: this.isActive(),
        agentId: member.agentId ?? null,
        agentName: memberName,
      })];
    });
  }

  private getMemberStatusSnapshotFor(
    memberRunId: string,
    memberName: string | null,
  ): AgentStatusPayload {
    const normalizedMemberName = memberName?.trim() ?? "";
    const runtimeMemberContext = this.options.runtimeContext?.memberContexts.find(
      (context) =>
        context.memberRunId === memberRunId ||
        context.memberName === normalizedMemberName ||
        context.nativeAgentId === memberRunId,
    ) ?? null;
    const nativeAgentId = runtimeMemberContext?.nativeAgentId ?? null;
    const nativeMember = (this.team.context?.agents ?? []).find((member) => {
      const nativeMemberName = member.context?.config?.name?.trim() ?? "";
      return (
        member.agentId === memberRunId ||
        (nativeAgentId !== null && member.agentId === nativeAgentId) ||
        (normalizedMemberName.length > 0 && nativeMemberName === normalizedMemberName)
      );
    }) ?? null;

    if (!nativeMember) {
      return {
        status: "offline",
        can_interrupt: false,
        agent_id: memberRunId,
        ...(normalizedMemberName ? { agent_name: normalizedMemberName } : {}),
      };
    }

    return projectAutoByteusAgentStatus({
      currentStatus: nativeMember.currentStatus,
      context: nativeMember.context ?? null,
      isActive: this.isActive(),
      agentId: nativeMember.agentId ?? memberRunId,
      agentName: normalizedMemberName || nativeMember.context?.config?.name || null,
    });
  }

  async postMessage(
    message: AgentInputUserMessage,
    target: TeamMemberSelector | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.team.postMessage || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    const memberContext = target ? this.resolveTargetMemberContext(target) : null;
    if (memberContext && "accepted" in memberContext) {
      return memberContext;
    }
    const targetMemberName = memberContext?.memberName ?? null;
    try {
      await this.team.postMessage(message, targetMemberName);
      const memberName = this.eventProcessor.normalizeMemberName(targetMemberName ?? null);
      return {
        accepted: true,
        memberName,
        memberRunId: this.eventProcessor.extractMemberRunId(null, memberName),
      };
    } catch (error) {
      return buildCommandFailure("post team message", error);
    }
  }

  async approveToolInvocation(
    target: TeamMemberSelector,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.team.postToolExecutionApproval || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    const memberContext = this.resolveTargetMemberContext(target);
    if ("accepted" in memberContext) {
      return memberContext;
    }
    try {
      await this.team.postToolExecutionApproval(
        memberContext.memberName,
        invocationId,
        approved,
        reason,
      );
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("approve team tool", error);
    }
  }

  async deliverInterAgentMessage(
    request: InterAgentMessageDeliveryRequest,
  ): Promise<AgentOperationResult> {
    if (!this.team.postMessage || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }

    try {
      const recipientContext = this.resolveTargetMemberContext(request.recipient.selector);
      if ("accepted" in recipientContext) {
        return recipientContext;
      }
      await this.team.postMessage(
        buildInterAgentDeliveryInputMessage(request),
        recipientContext.memberName,
      );
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("deliver inter-agent message", error);
    }
  }

  async interrupt(): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (!this.team.interrupt) {
      return {
        accepted: false,
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "Native Autobyteus team does not expose interrupt().",
      };
    }
    try {
      const result = await this.team.interrupt({ reason: "user_interrupt" });
      return {
        accepted: result.accepted,
        code: result.accepted ? result.status : (result.status ?? "INTERRUPT_REJECTED"),
        message: result.message,
      };
    } catch (error) {
      return buildCommandFailure("interrupt team run", error);
    }
  }

  async interruptMember(
    targetMemberRouteKey: string,
    targetMemberRunId: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    if (!this.team.interrupt) {
      return {
        accepted: false,
        code: "UNSUPPORTED_RUNTIME_COMMAND",
        message: "Native Autobyteus team does not expose interrupt().",
      };
    }
    const normalizedTargetMemberRouteKey = targetMemberRouteKey.trim();
    if (!normalizedTargetMemberRouteKey) {
      return buildTargetMemberRequiredResult();
    }
    const targetMemberContext = this.options.runtimeContext?.memberContexts.find(
      (memberContext) => memberContext.memberRouteKey === normalizedTargetMemberRouteKey,
    ) ?? null;
    if (!targetMemberContext) {
      return buildTargetMemberNotFoundResult(normalizedTargetMemberRouteKey);
    }
    const normalizedTargetMemberRunId = targetMemberRunId?.trim();
    if (
      normalizedTargetMemberRunId &&
      normalizedTargetMemberRunId !== targetMemberContext.memberRunId
    ) {
      return buildTargetMemberRunMismatchResult(
        normalizedTargetMemberRouteKey,
        normalizedTargetMemberRunId,
      );
    }

    try {
      const result = await this.team.interrupt({
        reason: "user_interrupt",
        targetMemberName: targetMemberContext.memberName,
      });
      return {
        accepted: result.accepted,
        code: result.accepted ? result.status : (result.status ?? "INTERRUPT_REJECTED"),
        message: result.message,
      };
    } catch (error) {
      return buildCommandFailure("interrupt team member", error);
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      const removed = await this.options.removeTeamRun(this.runId);
      return removed ? { accepted: true } : buildRunNotFoundResult(this.runId);
    } catch (error) {
      return buildCommandFailure("terminate team run", error);
    }
  }

  private ensureNativeEventBridge(): void {
    if (this.nativeEventStream) {
      return;
    }

    const stream = new AgentTeamEventStream(this.team as any);
    this.nativeEventStream = stream;
    void (async () => {
      try {
        for await (const nativeEvent of stream.allEvents()) {
          if (this.nativeEventStream !== stream) {
            break;
          }
          const processedEvents = await this.eventProcessor.buildProcessedTeamEvents(nativeEvent, null);
          this.fanOutProcessedEvents(processedEvents);
        }
      } catch {
        // Ignore native stream shutdown races.
      } finally {
        await stream.close().catch(() => {});
        if (this.nativeEventStream === stream) {
          this.nativeEventStream = null;
        }
      }
    })();
  }

  private closeNativeEventBridge(): void {
    const stream = this.nativeEventStream;
    if (!stream) {
      return;
    }
    this.nativeEventStream = null;
    void stream.close().catch(() => {});
  }

  private fanOutProcessedEvents(events: TeamRunEvent[]): void {
    if (events.length === 0 || this.listeners.size === 0) {
      return;
    }

    const eventsToPublish = this.withTeamStatusUpdate(events);
    const listeners = Array.from(this.listeners);
    for (const event of eventsToPublish) {
      for (const listener of listeners) {
        if (!this.listeners.has(listener)) {
          continue;
        }
        try {
          listener(event);
        } catch (error) {
          logger.warn(
            `AutoByteusTeamRunBackend: team event listener failed for '${this.runId}': ${String(error)}`,
          );
        }
      }
    }
  }

  private resolveTargetMemberContext(selector: TeamMemberSelector) {
    const memberContexts = this.options.runtimeContext?.memberContexts ?? [];
    const resolution = resolveTeamMemberSelector(selector, memberContexts);
    if (!resolution.ok) {
      return buildTargetResolutionFailure(selector, resolution.message, resolution.code);
    }
    return resolution.member;
  }

  private withTeamStatusUpdate(events: TeamRunEvent[]): TeamRunEvent[] {
    let observedTeamStatus: AgentStatusPayload["status"] | null = null;
    for (const event of events) {
      if (event.eventSourceType !== TeamRunEventSourceType.TEAM) {
        continue;
      }
      const status = (event.data as TeamRunStatusUpdateData).status;
      observedTeamStatus = status;
    }

    if (observedTeamStatus) {
      this.lastTeamStatus = observedTeamStatus;
      return events;
    }

    const nextStatus = this.getStatusSnapshotForEvents(events).status;
    if (nextStatus === this.lastTeamStatus) {
      return events;
    }

    this.lastTeamStatus = nextStatus;
    return [
      ...events,
      {
        eventSourceType: TeamRunEventSourceType.TEAM,
        teamRunId: this.runId,
        sourcePath: [],
        data: {
          status: nextStatus,
        } satisfies TeamRunStatusUpdateData,
      },
    ];
  }

  private getStatusSnapshotForEvents(events: TeamRunEvent[]) {
    if (!this.isActive()) {
      return { status: "offline" as const };
    }

    return {
      status: deriveTeamApiStatus({
        memberStatuses: this.getMemberStatusSnapshotsWithOverrides(events),
        nativeTeamStatus: this.team.currentStatus,
      }),
    };
  }

  private getMemberStatusSnapshotsWithOverrides(events: TeamRunEvent[]): AgentStatusPayload[] {
    const overrides = this.collectMemberStatusOverrides(events);
    if (overrides.byRunId.size === 0) {
      return this.getMemberStatusSnapshots();
    }

    const applied = new Set<AgentStatusPayload>();
    const snapshots = this.getMemberStatusSnapshots().map((snapshot) => {
      const override =
        snapshot.agent_id ? overrides.byRunId.get(snapshot.agent_id) : undefined;
      if (!override) {
        return snapshot;
      }
      applied.add(override);
      return {
        ...snapshot,
        status: override.status,
        can_interrupt: override.can_interrupt,
      };
    });

    for (const override of overrides.byRunId.values()) {
      if (!applied.has(override)) {
        snapshots.push(override);
        applied.add(override);
      }
    }

    return snapshots;
  }

  private collectMemberStatusOverrides(events: TeamRunEvent[]): {
    byRunId: Map<string, AgentStatusPayload>;
  } {
    const byRunId = new Map<string, AgentStatusPayload>();

    for (const event of events) {
      if (event.eventSourceType !== TeamRunEventSourceType.AGENT) {
        continue;
      }
      const payload = event.data as TeamRunAgentEventPayload;
      if (payload.agentEvent.eventType !== AgentRunEventType.AGENT_STATUS) {
        continue;
      }

      const statusPayload = buildAgentStatusPayload({
        status: payload.agentEvent.payload.status,
        canInterrupt: payload.agentEvent.payload.can_interrupt === true,
        agentId: payload.memberRunId,
        agentName: payload.memberName,
      });
      byRunId.set(payload.memberRunId, statusPayload);
    }

    return { byRunId };
  }

}
