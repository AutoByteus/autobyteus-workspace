import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  AgentTeamStreamEvent,
  SubTeamEventRebroadcastPayload,
  type TaskPlanEventPayload,
} from "autobyteus-ts";
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
import type { TeamMemberRunConfig, TeamRunConfig } from "../../domain/team-run-config.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunStatusUpdateData,
  type TeamRunTaskPlanEventPayload,
} from "../../domain/team-run-event.js";
import {
  buildInterAgentMessageReferenceFileEntries,
} from "../../services/inter-agent-message-runtime-builders.js";
import { publishProcessedTeamAgentEvents } from "../../services/publish-processed-team-agent-events.js";
import { buildTeamCommunicationMessageId } from "../../../services/team-communication/team-communication-identity.js";
import type { AutoByteusTeamRunContext } from "./autobyteus-team-run-context.js";
import {
  asRecord,
  extractMemberRunId,
  normalizeOptionalString,
  toReferenceFilesPayload,
} from "./autobyteus-team-run-backend-utils.js";

type AutoByteusTeamRunEventProcessorOptions = {
  memberRunIdsByName?: ReadonlyMap<string, string>;
  runtimeContext?: AutoByteusTeamRunContext | null;
  teamRunConfig?: TeamRunConfig | null;
};

const normalizeReferenceFilesPayload = (payload: Record<string, unknown>): string[] => {
  const rawReferenceFiles = toReferenceFilesPayload(payload);
  if (!Array.isArray(rawReferenceFiles)) {
    return [];
  }
  const seen = new Set<string>();
  const normalizedReferenceFiles: string[] = [];
  for (const rawReferenceFile of rawReferenceFiles) {
    if (typeof rawReferenceFile !== "string") {
      continue;
    }
    const normalizedReferenceFile = rawReferenceFile.trim();
    if (!normalizedReferenceFile || seen.has(normalizedReferenceFile)) {
      continue;
    }
    seen.add(normalizedReferenceFile);
    normalizedReferenceFiles.push(normalizedReferenceFile);
  }
  return normalizedReferenceFiles;
};

export class AutoByteusTeamRunEventProcessor {
  constructor(
    private readonly teamRunId: string,
    private readonly options: AutoByteusTeamRunEventProcessorOptions,
  ) {}

  async buildProcessedTeamEvents(
    nativeEvent: AgentTeamStreamEvent,
    subTeamNodeName: string | null,
  ): Promise<TeamRunEvent[]> {
    if (
      nativeEvent.event_source_type === "AGENT" &&
      nativeEvent.data instanceof AgentEventRebroadcastPayload
    ) {
      return this.buildProcessedAgentEvents(nativeEvent.data, subTeamNodeName);
    }

    if (
      nativeEvent.event_source_type === "TEAM" &&
      nativeEvent.data instanceof AgentTeamStatusUpdateData
    ) {
      return [{
        eventSourceType: TeamRunEventSourceType.TEAM,
        teamRunId: this.teamRunId,
        data: asRecord(nativeEvent.data) as TeamRunStatusUpdateData,
        subTeamNodeName,
      }];
    }

    if (nativeEvent.event_source_type === "TASK_PLAN") {
      return [{
        eventSourceType: TeamRunEventSourceType.TASK_PLAN,
        teamRunId: this.teamRunId,
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

  extractMemberRunId(
    agentEvent: { agent_id?: unknown; data?: unknown } | null,
    memberName: string | null,
  ): string | null {
    return extractMemberRunId(agentEvent, memberName, this.options.memberRunIdsByName);
  }

  normalizeMemberName(value: unknown): string | null {
    return normalizeOptionalString(value);
  }

  private async buildProcessedAgentEvents(
    agentPayload: AgentEventRebroadcastPayload,
    subTeamNodeName: string | null,
  ): Promise<TeamRunEvent[]> {
    const memberRunId = this.extractMemberRunId(
      agentPayload.agent_event as { agent_id?: unknown; data?: unknown },
      agentPayload.agent_name,
    );
    const resolvedMemberRunId =
      memberRunId ??
      normalizeOptionalString(agentPayload.agent_name) ??
      this.teamRunId;
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
      teamRunId: this.teamRunId,
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
      subTeamNodeName,
    });
    return processedEvents;
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
    const referenceFiles = normalizeReferenceFilesPayload(input.event.payload);
    const messageId = existingMessageId ?? (senderRunId
      ? buildTeamCommunicationMessageId({
        teamRunId: this.teamRunId,
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
        team_run_id: this.teamRunId,
        receiver_run_id: receiverRunId,
        receiver_agent_name: receiverMemberName,
        ...(senderRunId ? { sender_agent_id: senderRunId } : {}),
        ...(senderMemberName ? { sender_agent_name: senderMemberName } : {}),
        message_type: messageType,
        ...(messageId ? { message_id: messageId } : {}),
        created_at: createdAt,
        reference_files: referenceFiles,
        ...(messageId ? {
          reference_file_entries: buildInterAgentMessageReferenceFileEntries({
            teamRunId: this.teamRunId,
            messageId,
            referenceFiles,
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
}
