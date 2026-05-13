import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  AgentEventRebroadcastPayload,
  AgentTeamEventStream,
  AgentTeamStatusUpdateData,
  AgentTeamStreamEvent,
  SubTeamEventRebroadcastPayload,
  type TaskPlanEventPayload,
} from "autobyteus-ts";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import {
  AgentRunContext,
  type RuntimeAgentRunContext,
} from "../../../agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../agent-execution/domain/agent-run-event.js";
import { AutoByteusStreamEventConverter } from "../../../agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import type { RuntimeTeamRunContext } from "../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../domain/inter-agent-message-delivery.js";
import type { TeamMemberRunConfig } from "../../domain/team-run-config.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import {
  resolveTeamMemberSelector,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunStatusUpdateData,
  type TeamRunTaskPlanEventPayload,
  type TeamRunEventUnsubscribe,
} from "../../domain/team-run-event.js";
import {
  buildInterAgentDeliveryInputMessage,
  buildInterAgentMessageReferenceFileEntries,
} from "../../services/inter-agent-message-runtime-builders.js";
import { publishProcessedTeamAgentEvents } from "../../services/publish-processed-team-agent-events.js";
import { buildTeamCommunicationMessageId } from "../../../services/team-communication/team-communication-identity.js";
import {
  asRecord,
  extractMemberRunId,
  normalizeOptionalString,
  toReferenceFilesPayload,
} from "./autobyteus-team-run-backend-utils.js";
import {
  autoByteusTeamRunBackendLogger as logger,
  buildCommandFailure,
  buildRunNotFoundResult,
  buildTargetResolutionFailure,
  type AutoByteusTeamLike,
  type AutoByteusTeamRunBackendOptions,
} from "./autobyteus-team-run-backend-contracts.js";

export class AutoByteusTeamRunBackend implements TeamRunBackend {
  readonly runId: string;
  readonly teamBackendKind = TeamBackendKind.AUTOBYTEUS;
  private readonly listeners = new Set<TeamRunEventListener>();
  private nativeEventStream: AgentTeamEventStream | null = null;

  constructor(
    private readonly team: AutoByteusTeamLike,
    private readonly options: AutoByteusTeamRunBackendOptions,
  ) {
    this.runId = team.teamId;
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

  getStatus(): string | null {
    return this.team.currentStatus ?? null;
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
      const memberName = normalizeOptionalString(targetMemberName);
      return {
        accepted: true,
        memberName,
        memberRunId: extractMemberRunId(
          null,
          memberName,
          this.options.memberRunIdsByName,
        ),
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
    if (!this.team.stop || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.team.stop();
      return { accepted: true };
    } catch (error) {
      return buildCommandFailure("interrupt team run", error);
    }
  }

  async terminate(): Promise<AgentOperationResult> {
    try {
      const removed = await this.options.removeTeamRun(this.runId);
      return removed
        ? { accepted: true }
        : buildRunNotFoundResult(this.runId);
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
          const processedEvents = await this.buildProcessedTeamEvents(nativeEvent, null);
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

    const listeners = Array.from(this.listeners);
    for (const event of events) {
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

  private async buildProcessedTeamEvents(
    nativeEvent: AgentTeamStreamEvent,
    subTeamNodeName: string | null,
  ): Promise<TeamRunEvent[]> {
    if (
      nativeEvent.event_source_type === "AGENT" &&
      nativeEvent.data instanceof AgentEventRebroadcastPayload
    ) {
      const agentPayload = nativeEvent.data;
      const memberRunId = extractMemberRunId(
        agentPayload.agent_event as { agent_id?: unknown; data?: unknown },
        agentPayload.agent_name,
        this.options.memberRunIdsByName,
      );
      const resolvedMemberRunId =
        memberRunId ??
        normalizeOptionalString(agentPayload.agent_name) ??
        this.runId;
      const nativeAgentId =
        typeof agentPayload.agent_event.agent_id === "string" &&
        agentPayload.agent_event.agent_id.trim().length > 0
          ? agentPayload.agent_event.agent_id.trim()
          : null;
      const runtimeMemberContext = this.options.runtimeContext?.memberContexts.find(
        (memberContext) =>
          memberContext.memberRunId === resolvedMemberRunId ||
          memberContext.memberName === agentPayload.agent_name,
      );
      if (runtimeMemberContext && nativeAgentId) {
        runtimeMemberContext.nativeAgentId = nativeAgentId;
      }
      const converter = new AutoByteusStreamEventConverter(resolvedMemberRunId);
      const convertedEvent = converter.convert(agentPayload.agent_event);
      if (!convertedEvent) {
        return [];
      }

      const processedEvents: TeamRunEvent[] = [];
      await publishProcessedTeamAgentEvents({
        teamRunId: this.runId,
        runContext: this.buildMemberRunContext(
          agentPayload.agent_name,
          resolvedMemberRunId,
        ),
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: agentPayload.agent_name,
        memberRunId: resolvedMemberRunId,
        agentEvents: [
          this.enrichConvertedEvent({
            event: convertedEvent,
            memberName: agentPayload.agent_name,
            memberRunId: resolvedMemberRunId,
          }),
        ],
        publishTeamEvent: (event) => {
          processedEvents.push(event);
        },
        sourcePath: this.resolveSourcePath(
          runtimeMemberContext?.memberPath ?? null,
          agentPayload.agent_name,
          subTeamNodeName,
        ),
        subTeamNodeName,
      });
      return processedEvents;
    }

    if (
      nativeEvent.event_source_type === "TEAM" &&
      nativeEvent.data instanceof AgentTeamStatusUpdateData
    ) {
      return [{
        eventSourceType: TeamRunEventSourceType.TEAM,
        teamRunId: this.runId,
        sourcePath: this.resolveTeamEventSourcePath(subTeamNodeName),
        data: asRecord(nativeEvent.data) as TeamRunStatusUpdateData,
        subTeamNodeName,
      }];
    }

    if (nativeEvent.event_source_type === "TASK_PLAN") {
      return [{
        eventSourceType: TeamRunEventSourceType.TASK_PLAN,
        teamRunId: this.runId,
        sourcePath: this.resolveTeamEventSourcePath(subTeamNodeName),
        data: asRecord(nativeEvent.data as TaskPlanEventPayload) as TeamRunTaskPlanEventPayload,
        subTeamNodeName,
      }];
    }

    if (
      nativeEvent.event_source_type === "SUB_TEAM" &&
      nativeEvent.data instanceof SubTeamEventRebroadcastPayload &&
      nativeEvent.data.sub_team_event instanceof AgentTeamStreamEvent
    ) {
      return this.buildProcessedTeamEvents(
        nativeEvent.data.sub_team_event,
        nativeEvent.data.sub_team_node_name,
      );
    }

    return [];
  }

  private enrichConvertedEvent(input: {
    event: AgentRunEvent;
    memberName: string;
    memberRunId: string;
  }): AgentRunEvent {
    if (input.event.eventType !== AgentRunEventType.INTER_AGENT_MESSAGE) {
      return input.event;
    }

    const receiverContext = this.resolveMemberContextByRunIdOrName(
      input.memberRunId,
      input.memberName,
    );
    const receiverRunId = receiverContext?.memberRunId ?? input.memberRunId;
    const receiverMemberName = receiverContext?.memberName ?? input.memberName;
    const senderIdentity =
      normalizeOptionalString(input.event.payload.sender_agent_id)
      ?? normalizeOptionalString(input.event.payload.senderAgentId)
      ?? normalizeOptionalString(input.event.payload.sender_run_id);
    const senderContext = this.resolveMemberContextByIdentity(senderIdentity);
    const senderRunId = senderContext?.memberRunId ?? senderIdentity;
    const senderMemberName =
      normalizeOptionalString(input.event.payload.sender_agent_name)
      ?? normalizeOptionalString(input.event.payload.senderAgentName)
      ?? senderContext?.memberName
      ?? null;
    const messageType =
      normalizeOptionalString(input.event.payload.message_type)
      ?? normalizeOptionalString(input.event.payload.messageType)
      ?? normalizeOptionalString(input.event.payload.original_message_type)
      ?? "agent_message";
    const content = typeof input.event.payload.content === "string" ? input.event.payload.content : "";
    const createdAt =
      normalizeOptionalString(input.event.payload.created_at)
      ?? normalizeOptionalString(input.event.payload.createdAt)
      ?? new Date().toISOString();
    const existingMessageId =
      normalizeOptionalString(input.event.payload.message_id)
      ?? normalizeOptionalString(input.event.payload.messageId);
    const referenceFiles = toReferenceFilesPayload(input.event.payload);
    const normalizedReferenceFiles = Array.isArray(referenceFiles)
      ? referenceFiles
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => entry.trim())
      : [];
    const messageId = existingMessageId ?? (senderRunId
      ? buildTeamCommunicationMessageId({
        teamRunId: this.runId,
        senderRunId,
        receiverRunId,
        messageType,
        content,
        createdAt,
      })
      : null);

    return {
      ...input.event,
      runId: receiverRunId,
      payload: {
        ...input.event.payload,
        team_run_id: this.runId,
        receiver_run_id: receiverRunId,
        receiver_agent_name: receiverMemberName,
        ...(senderRunId ? { sender_agent_id: senderRunId } : {}),
        ...(senderMemberName ? { sender_agent_name: senderMemberName } : {}),
        message_type: messageType,
        ...(messageId ? { message_id: messageId } : {}),
        created_at: createdAt,
        reference_files: normalizedReferenceFiles,
        ...(messageId ? {
          reference_file_entries: buildInterAgentMessageReferenceFileEntries({
            teamRunId: this.runId,
            messageId,
            referenceFiles: normalizedReferenceFiles,
            timestamp: createdAt,
          }),
        } : {}),
      },
    };
  }

  private buildMemberRunContext(
    memberName: string,
    memberRunId: string,
  ): AgentRunContext<RuntimeAgentRunContext> {
    const memberConfig = this.resolveMemberConfig(memberName, memberRunId);
    return new AgentRunContext({
      runId: memberRunId,
      config: new AgentRunConfig({
        agentDefinitionId: memberConfig?.agentDefinitionId ?? memberName,
        llmModelIdentifier: memberConfig?.llmModelIdentifier ?? "",
        autoExecuteTools: memberConfig?.autoExecuteTools ?? false,
        workspaceId: memberConfig?.workspaceId ?? null,
        memoryDir: memberConfig?.memoryDir ?? null,
        llmConfig: memberConfig?.llmConfig ?? null,
        skillAccessMode: memberConfig?.skillAccessMode ?? SkillAccessMode.NONE,
        runtimeKind: memberConfig?.runtimeKind ?? RuntimeKind.AUTOBYTEUS,
        applicationExecutionContext: memberConfig?.applicationExecutionContext ?? null,
      }),
      runtimeContext: null,
    });
  }

  private resolveMemberConfig(
    memberName: string,
    memberRunId: string,
  ): TeamMemberRunConfig | null {
    return (
      this.options.teamRunConfig?.memberConfigs.find(
        (memberConfig) =>
          memberConfig.memberRunId === memberRunId ||
          memberConfig.memberName === memberName ||
          memberConfig.memberRouteKey === memberName,
      ) ?? null
    );
  }

  private resolveMemberContextByRunIdOrName(
    memberRunId: string,
    memberName: string | null,
  ) {
    return (
      this.options.runtimeContext?.memberContexts.find(
        (memberContext) =>
          memberContext.memberRunId === memberRunId ||
          memberContext.memberName === memberName ||
          memberContext.nativeAgentId === memberRunId,
      ) ?? null
    );
  }

  private resolveMemberContextByIdentity(identity: string | null) {
    if (!identity) {
      return null;
    }
    return (
      this.options.runtimeContext?.memberContexts.find(
        (memberContext) =>
          memberContext.memberRunId === identity ||
          memberContext.nativeAgentId === identity ||
          memberContext.memberName === identity ||
          memberContext.memberRouteKey === identity,
      ) ?? null
    );
  }

  private resolveTargetMemberContext(
    selector: TeamMemberSelector,
  ) {
    const memberContexts = this.options.runtimeContext?.memberContexts ?? [];
    const resolution = resolveTeamMemberSelector(selector, memberContexts);
    if (!resolution.ok) {
      return buildTargetResolutionFailure(selector, resolution.message, resolution.code);
    }
    return resolution.member;
  }

  private resolveSourcePath(
    memberPath: string[] | null,
    memberName: string,
    subTeamNodeName: string | null,
  ): string[] {
    if (Array.isArray(memberPath) && memberPath.length > 0) {
      return [...memberPath];
    }
    const normalizedMemberName = normalizeOptionalString(memberName) ?? memberName;
    return subTeamNodeName ? [subTeamNodeName, normalizedMemberName] : [normalizedMemberName];
  }

  private resolveTeamEventSourcePath(subTeamNodeName: string | null): string[] {
    return subTeamNodeName ? [subTeamNodeName] : [];
  }

}
