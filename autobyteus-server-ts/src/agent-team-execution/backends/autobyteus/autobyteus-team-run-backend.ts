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
import type { TeamMemberRunConfig, TeamRunConfig } from "../../domain/team-run-config.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import {
  TeamRunEventSourceType,
  type TeamRunEventListener,
  type TeamRunStatusUpdateData,
  type TeamRunTaskPlanEventPayload,
  type TeamRunEventUnsubscribe,
} from "../../domain/team-run-event.js";
import { buildInterAgentDeliveryInputMessage } from "../../services/inter-agent-message-runtime-builders.js";
import { publishProcessedTeamAgentEvents } from "../../services/publish-processed-team-agent-events.js";
import type { AutoByteusTeamRunContext } from "./autobyteus-team-run-context.js";

type AutoByteusTeamLike = {
  teamId: string;
  context?: {
    agents?: Array<{
      agentId?: string | null;
      context?: {
        config?: {
          name?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
  notifier?: unknown;
  currentStatus?: string;
  postMessage?: (message: AgentInputUserMessage, targetMemberName?: string | null) => Promise<void>;
  postToolExecutionApproval?: (
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void> | void;
};

type AutoByteusTeamRunBackendOptions = {
  isActive: () => boolean;
  removeTeamRun: (teamRunId: string) => Promise<boolean>;
  memberRunIdsByName?: ReadonlyMap<string, string>;
  runtimeContext?: AutoByteusTeamRunContext | null;
  teamRunConfig?: TeamRunConfig | null;
};

const buildRunNotFoundResult = (runId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${runId}' is not active.`,
});

const buildCommandFailure = (operation: string, error: unknown): AgentOperationResult => ({
  accepted: false,
  code: "RUNTIME_COMMAND_FAILED",
  message: `Failed to ${operation}: ${String(error)}`,
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const extractMemberRunId = (
  agentEvent: { agent_id?: unknown; data?: unknown } | null,
  memberName: string | null,
  memberRunIdsByName: ReadonlyMap<string, string> | undefined,
): string | null => {
  const normalizedMemberName = normalizeOptionalString(memberName);
  if (!normalizedMemberName) {
    return null;
  }
  const configuredMemberRunId = memberRunIdsByName?.get(normalizedMemberName) ?? null;
  if (typeof configuredMemberRunId === "string" && configuredMemberRunId.trim().length > 0) {
    return configuredMemberRunId.trim();
  }
  if (agentEvent && typeof agentEvent.agent_id === "string" && agentEvent.agent_id.trim().length > 0) {
    return agentEvent.agent_id.trim();
  }
  const agentEventPayload = asRecord(agentEvent?.data);
  if (typeof agentEventPayload.agent_id === "string" && agentEventPayload.agent_id.trim().length > 0) {
    return agentEventPayload.agent_id.trim();
  }
  return normalizedMemberName;
};

const toReferenceFilesPayload = (
  payload: Record<string, unknown>,
): unknown =>
  Object.prototype.hasOwnProperty.call(payload, "reference_files")
    ? payload.reference_files
    : payload.referenceFiles;

export class AutoByteusTeamRunBackend implements TeamRunBackend {
  readonly runId: string;
  readonly teamBackendKind = TeamBackendKind.AUTOBYTEUS;

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
    const stream = new AgentTeamEventStream(this.team as any);
    let isClosed = false;

    void (async () => {
      try {
        for await (const nativeEvent of stream.allEvents()) {
          if (isClosed) {
            break;
          }
          await this.emitNativeEvent(nativeEvent, listener, null);
        }
      } catch {
        // Ignore stream shutdown races.
      } finally {
        if (!isClosed) {
          isClosed = true;
          await stream.close().catch(() => {});
        }
      }
    })();

    return () => {
      if (isClosed) {
        return;
      }
      isClosed = true;
      void stream.close().catch(() => {});
    };
  }

  getStatus(): string | null {
    return this.team.currentStatus ?? null;
  }

  async postMessage(
    message: AgentInputUserMessage,
    targetMemberName: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.team.postMessage || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.team.postMessage(message, targetMemberName);
      const memberName = normalizeOptionalString(targetMemberName ?? null);
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
    targetMemberName: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<AgentOperationResult> {
    if (!this.team.postToolExecutionApproval || !this.isActive()) {
      return buildRunNotFoundResult(this.runId);
    }
    try {
      await this.team.postToolExecutionApproval(
        targetMemberName,
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
      await this.team.postMessage(
        buildInterAgentDeliveryInputMessage(request),
        request.recipientMemberName,
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
        ? {
            accepted: true,
          }
        : buildRunNotFoundResult(this.runId);
    } catch (error) {
      return buildCommandFailure("terminate team run", error);
    }
  }

  private async emitNativeEvent(
    nativeEvent: AgentTeamStreamEvent,
    listener: TeamRunEventListener,
    subTeamNodeName: string | null,
  ): Promise<void> {
    if (
      nativeEvent.event_source_type === "AGENT" &&
      nativeEvent.data instanceof AgentEventRebroadcastPayload
    ) {
      const agentPayload = nativeEvent.data;
      const payload = asRecord(agentPayload.agent_event.data);
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
        return;
      }

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
        publishTeamEvent: listener,
        subTeamNodeName,
      });
      return;
    }

    if (
      nativeEvent.event_source_type === "TEAM" &&
      nativeEvent.data instanceof AgentTeamStatusUpdateData
    ) {
      listener({
        eventSourceType: TeamRunEventSourceType.TEAM,
        teamRunId: this.runId,
        data: asRecord(nativeEvent.data) as TeamRunStatusUpdateData,
        subTeamNodeName,
      });
      return;
    }

    if (nativeEvent.event_source_type === "TASK_PLAN") {
      listener({
        eventSourceType: TeamRunEventSourceType.TASK_PLAN,
        teamRunId: this.runId,
        data: asRecord(nativeEvent.data as TaskPlanEventPayload) as TeamRunTaskPlanEventPayload,
        subTeamNodeName,
      });
      return;
    }

    if (
      nativeEvent.event_source_type === "SUB_TEAM" &&
      nativeEvent.data instanceof SubTeamEventRebroadcastPayload &&
      nativeEvent.data.sub_team_event instanceof AgentTeamStreamEvent
    ) {
      await this.emitNativeEvent(
        nativeEvent.data.sub_team_event,
        listener,
        nativeEvent.data.sub_team_node_name,
      );
    }
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
      ?? normalizeOptionalString(input.event.payload.original_message_type);

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
        ...(messageType ? { message_type: messageType } : {}),
        reference_files: toReferenceFilesPayload(input.event.payload),
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

}
