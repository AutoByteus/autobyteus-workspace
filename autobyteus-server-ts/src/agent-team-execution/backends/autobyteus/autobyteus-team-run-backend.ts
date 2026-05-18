import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentTeamEventStream } from "autobyteus-ts";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { AgentStatusPayload } from "../../../agent-execution/domain/agent-status-payload.js";
import { deriveTeamApiStatus } from "../../domain/team-status-aggregation.js";
import type { RuntimeTeamRunContext } from "../../domain/team-run-context.js";
import type { AutoByteusTeamMemberContext } from "./autobyteus-team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import {
  resolveTeamMemberSelector,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";
import type {
  TeamRunEvent,
  TeamRunEventListener,
  TeamRunEventUnsubscribe,
  TeamRunStatusUpdateData,
} from "../../domain/team-run-event.js";
import { TeamRunEventSourceType } from "../../domain/team-run-event.js";
import { buildInterAgentDeliveryInputMessage } from "../../services/inter-agent-message-runtime-builders.js";
import { buildTeamCommandStartStatusEvent } from "../../services/team-member-command-start-status-events.js";
import { TeamCommandStatusOverlayStore } from "../../services/team-command-status-overlay-store.js";
import { AutoByteusTeamRunEventProcessor } from "./autobyteus-team-run-event-processor.js";
import { AutoByteusTeamMemberStatusProjector } from "./autobyteus-team-member-status-projector.js";
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
  private readonly commandStatusOverlayStore: TeamCommandStatusOverlayStore;
  private readonly memberStatusProjector: AutoByteusTeamMemberStatusProjector;
  private nativeEventStream: AgentTeamEventStream | null = null;
  private lastTeamStatus: AgentStatusPayload["status"] | null = null;

  constructor(
    private readonly team: AutoByteusTeamLike,
    private readonly options: AutoByteusTeamRunBackendOptions,
  ) {
    this.runId = team.teamId;
    this.memberStatusProjector = new AutoByteusTeamMemberStatusProjector(this.team, {
      memberRunIdsByName: options.memberRunIdsByName,
      runtimeContext: options.runtimeContext ?? null,
      isActive: () => this.isActive(),
    });
    this.commandStatusOverlayStore = new TeamCommandStatusOverlayStore({
      getTeamRunId: () => this.runId,
      publishEvent: (event) => this.publishEvents([event]),
      publishTeamStatusIfChanged: () => this.publishTeamStatusIfChanged(),
    });
    this.eventProcessor = new AutoByteusTeamRunEventProcessor(this.runId, {
      projector: this.memberStatusProjector,
      teamRunConfig: options.teamRunConfig ?? null,
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
        nativeTeamStatus: this.commandStatusOverlayStore.getTeamStatus({
          sourcePath: [],
          fallbackStatus: () => this.team.currentStatus,
        }),
      }),
    };
  }

  getMemberStatusSnapshots() {
    return this.commandStatusOverlayStore.applyMemberStatusOverlays(
      this.memberStatusProjector.projectMemberStatusSnapshots(),
    );
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
    memberContext ? this.publishMemberCommandStatus(memberContext, "initializing") : this.publishRootCommandStatus("initializing");
    try {
      await this.team.postMessage(message, targetMemberName);
      const memberName = this.eventProcessor.normalizeMemberName(targetMemberName ?? null);
      return { accepted: true, memberName, memberRunId: this.eventProcessor.extractMemberRunId(null, memberName) };
    } catch (error) {
      memberContext ? this.publishMemberCommandStatus(memberContext, "error", String(error)) : this.publishRootCommandStatus("error", String(error));
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
      this.publishMemberCommandStatus(recipientContext, "initializing");
      await this.team.postMessage(buildInterAgentDeliveryInputMessage(request), recipientContext.memberName);
      return { accepted: true };
    } catch (error) {
      const recipientContext = this.resolveTargetMemberContext(request.recipient.selector);
      if (!("accepted" in recipientContext)) this.publishMemberCommandStatus(recipientContext, "error", String(error));
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
      if (removed) {
        this.commandStatusOverlayStore.clear();
        this.memberStatusProjector.clearObservedStatuses();
      }
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

    this.publishEvents(this.withTeamStatusUpdate(events));
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
    this.commandStatusOverlayStore.recordReplacementEvents(events);
    this.memberStatusProjector.recordStatusEvents(events);
    const nextStatus = this.getStatusSnapshotForEvents().status;
    let hasTeamStatus = false;
    const normalizedEvents = events.map((event) => {
      if (event.eventSourceType !== TeamRunEventSourceType.TEAM) return event;
      hasTeamStatus = true;
      return { ...event, data: { ...(event.data as TeamRunStatusUpdateData), status: nextStatus } satisfies TeamRunStatusUpdateData };
    });
    if (hasTeamStatus) { this.lastTeamStatus = nextStatus; return normalizedEvents; }
    if (nextStatus === this.lastTeamStatus) return normalizedEvents;
    this.lastTeamStatus = nextStatus;
    return [...normalizedEvents, { eventSourceType: TeamRunEventSourceType.TEAM, teamRunId: this.runId, sourcePath: [], data: { status: nextStatus } satisfies TeamRunStatusUpdateData }];
  }

  private getStatusSnapshotForEvents() {
    return !this.isActive() ? { status: "offline" as const } : { status: deriveTeamApiStatus({
      memberStatuses: this.getMemberStatusSnapshots(),
      nativeTeamStatus: this.commandStatusOverlayStore.getTeamStatus({
        sourcePath: [],
        fallbackStatus: () => this.team.currentStatus,
      }),
    }) };
  }

  private publishMemberCommandStatus(memberContext: AutoByteusTeamMemberContext, status: "initializing" | "error", errorMessage: string | null = null): void {
    this.commandStatusOverlayStore.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      memberContext,
      status,
      errorMessage,
      currentStatus: () => this.commandStatusOverlayStore.getMemberStatusSnapshot({
        memberContext,
        fallback: () => this.memberStatusProjector.projectMemberStatusSnapshot({
          memberRunId: memberContext.memberRunId,
          memberName: memberContext.memberName,
          knownRuntimeMemberContext: memberContext,
        }),
      }).status,
    });
  }

  private publishRootCommandStatus(status: "initializing" | "error", errorMessage: string | null = null): void {
    const published = this.commandStatusOverlayStore.publishTeamCommandStatus({
      sourcePath: [],
      status,
      errorMessage,
      currentStatus: () => this.getStatusSnapshot().status,
      notifyStatusChange: false,
    });
    if (published) {
      this.lastTeamStatus = status;
    }
  }

  private publishTeamStatusIfChanged(): void {
    const nextStatus = this.getStatusSnapshot().status;
    if (nextStatus === this.lastTeamStatus) return;
    this.lastTeamStatus = nextStatus;
    this.publishEvents([buildTeamCommandStartStatusEvent({ teamRunId: this.runId, sourcePath: [], status: nextStatus })]);
  }

  private publishEvents(events: TeamRunEvent[]): void {
    const listeners = Array.from(this.listeners);
    for (const event of events) for (const listener of listeners) {
      if (!this.listeners.has(listener)) continue;
      try { listener(event); }
      catch (error) { logger.warn(`AutoByteusTeamRunBackend: team event listener failed for '${this.runId}': ${String(error)}`); }
    }
  }

}
