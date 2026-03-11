import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import { buildAgentExternalSourceMetadata } from "autobyteus-ts/agent/message/external-source-metadata.js";
import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRuntimeDispatchResult, ChannelRuntimeFacade } from "./channel-runtime-facade.js";
import type { ChannelBindingRuntimeLauncher } from "./channel-binding-runtime-launcher.js";
import type { RuntimeCommandIngressService } from "../../runtime-execution/runtime-command-ingress-service.js";
import {
  getAgentLiveMessagePublisher,
  type AgentLiveMessagePublisher,
} from "../../services/agent-streaming/agent-live-message-publisher.js";
import {
  getTeamLiveMessagePublisher,
  type TeamLiveMessagePublisher,
} from "../../services/agent-streaming/team-live-message-publisher.js";
import {
  getRuntimeExternalChannelTurnBridge,
  type RuntimeExternalChannelTurnBridge,
} from "./runtime-external-channel-turn-bridge.js";
import {
  getTeamRunContinuationService,
  type TeamRunContinuationService,
} from "../../run-history/services/team-run-continuation-service.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type DefaultChannelRuntimeFacadeDependencies = {
  runtimeLauncher: Pick<
    ChannelBindingRuntimeLauncher,
    "resolveOrStartAgentRun" | "resolveOrStartTeamRun"
  >;
  runtimeCommandIngressService: Pick<RuntimeCommandIngressService, "sendTurn">;
  teamRunContinuationService?: Pick<
    TeamRunContinuationService,
    "continueTeamRunWithMessage"
  >;
  agentLiveMessagePublisher?: Pick<
    AgentLiveMessagePublisher,
    "publishExternalUserMessage"
  >;
  teamLiveMessagePublisher?: Pick<TeamLiveMessagePublisher, "publishExternalUserMessage">;
  externalTurnBridge?: Pick<
    RuntimeExternalChannelTurnBridge,
    "bindAcceptedExternalTurn"
  >;
};

export class DefaultChannelRuntimeFacade implements ChannelRuntimeFacade {
  private readonly teamRunContinuationService: Pick<
    TeamRunContinuationService,
    "continueTeamRunWithMessage"
  >;

  private readonly agentLiveMessagePublisher: Pick<
    AgentLiveMessagePublisher,
    "publishExternalUserMessage"
  >;

  private readonly teamLiveMessagePublisher: Pick<
    TeamLiveMessagePublisher,
    "publishExternalUserMessage"
  >;

  private readonly externalTurnBridge: Pick<
    RuntimeExternalChannelTurnBridge,
    "bindAcceptedExternalTurn"
  >;

  constructor(
    private readonly deps: DefaultChannelRuntimeFacadeDependencies,
  ) {
    this.teamRunContinuationService =
      deps.teamRunContinuationService ?? getTeamRunContinuationService();
    this.agentLiveMessagePublisher =
      deps.agentLiveMessagePublisher ?? getAgentLiveMessagePublisher();
    this.teamLiveMessagePublisher =
      deps.teamLiveMessagePublisher ?? getTeamLiveMessagePublisher();
    this.externalTurnBridge =
      deps.externalTurnBridge ?? getRuntimeExternalChannelTurnBridge();
  }

  async dispatchToBinding(
    binding: ChannelBinding,
    envelope: ExternalMessageEnvelope,
  ): Promise<ChannelRuntimeDispatchResult> {
    if (binding.targetType === "AGENT") {
      return this.dispatchToAgent(binding, envelope);
    }
    return this.dispatchToTeam(binding, envelope);
  }

  private async dispatchToAgent(
    binding: ChannelBinding,
    envelope: ExternalMessageEnvelope,
  ): Promise<ChannelRuntimeDispatchResult> {
    const agentRunId = await this.deps.runtimeLauncher.resolveOrStartAgentRun(binding, {
      initialSummary: envelope.content,
    });
    const result = await this.deps.runtimeCommandIngressService.sendTurn({
      runId: agentRunId,
      mode: "agent",
      message: buildAgentInputMessage(envelope),
    });
    if (!result.accepted) {
      throw new Error(
        result.message ??
          `Agent run '${agentRunId}' rejected external channel dispatch (${result.code ?? "UNKNOWN"}).`,
      );
    }
    try {
      await this.externalTurnBridge.bindAcceptedExternalTurn({
        runId: agentRunId,
        runtimeKind: result.runtimeKind,
        turnId: result.turnId ?? null,
        envelope,
      });
    } catch (error) {
      logger.warn(
        `Agent run '${agentRunId}': failed to bind the accepted external runtime turn for provider reply routing. Continuing because inbound dispatch already succeeded.`,
        error,
      );
    }
    try {
      this.agentLiveMessagePublisher.publishExternalUserMessage({
        runId: agentRunId,
        envelope,
      });
    } catch (error) {
      logger.warn(
        `Agent run '${agentRunId}': failed to publish external user message to the live frontend stream. Continuing because provider reply routing depends on ingress receipt persistence.`,
        error,
      );
    }

    return {
      agentRunId: agentRunId,
      teamRunId: null,
      dispatchedAt: new Date(),
    };
  }

  private async dispatchToTeam(
    binding: ChannelBinding,
    envelope: ExternalMessageEnvelope,
  ): Promise<ChannelRuntimeDispatchResult> {
    const teamRunId = await this.deps.runtimeLauncher.resolveOrStartTeamRun(binding, {
      initialSummary: envelope.content,
    });
    const continuationResult = await this.teamRunContinuationService.continueTeamRunWithMessage({
      teamRunId,
      message: buildAgentInputMessage(envelope),
      targetMemberRouteKey: binding.targetNodeName,
    });
    if (continuationResult.dispatchedTurn) {
      try {
        await this.externalTurnBridge.bindAcceptedExternalTurn({
          runId: continuationResult.dispatchedTurn.memberRunId,
          teamRunId,
          runtimeKind: continuationResult.dispatchedTurn.runtimeKind,
          turnId: continuationResult.dispatchedTurn.turnId,
          envelope,
        });
      } catch (error) {
        logger.warn(
          `Team run '${teamRunId}': failed to bind the accepted coordinator/member external runtime turn for provider reply routing. Continuing because inbound dispatch already succeeded.`,
          error,
        );
      }
    }
    try {
      this.teamLiveMessagePublisher.publishExternalUserMessage({
        teamRunId,
        envelope,
        agentName: continuationResult.targetMemberName,
        agentId: continuationResult.dispatchedTurn?.memberRunId ?? null,
      });
    } catch (error) {
      logger.warn(
        `Team run '${teamRunId}': failed to publish external user message to the live team frontend stream. Continuing because provider reply routing depends on ingress receipt persistence.`,
        error,
      );
    }

    return {
      agentRunId: null,
      teamRunId: teamRunId,
      dispatchedAt: new Date(),
    };
  }
}

const buildAgentInputMessage = (
  envelope: ExternalMessageEnvelope,
): AgentInputUserMessage => {
  const externalSource = buildAgentExternalSourceMetadata(envelope);
  const contextFiles = envelope.attachments
    .map((attachment) => mapAttachmentToContextFile(attachment))
    .filter((item): item is ContextFile => item !== null);
  const metadata: Record<string, unknown> = {
    ...envelope.metadata,
    externalSource,
  };

  return AgentInputUserMessage.fromDict({
    content: envelope.content,
    context_files: contextFiles.length > 0 ? contextFiles.map((file) => file.toDict()) : null,
    metadata,
  });
};

const mapAttachmentToContextFile = (attachment: ExternalAttachment): ContextFile | null => {
  if (typeof attachment.url !== "string" || attachment.url.trim().length === 0) {
    return null;
  }

  const fileType = inferContextFileType(attachment);
  if (fileType === null) {
    return null;
  }

  return new ContextFile(
    attachment.url,
    fileType,
    attachment.fileName,
    {
      source: "external-attachment",
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      ...attachment.metadata,
    },
  );
};

const inferContextFileType = (attachment: ExternalAttachment): ContextFileType | null => {
  const kind = attachment.kind.trim().toLowerCase();
  const mimeType = attachment.mimeType?.trim().toLowerCase() ?? "";

  if (kind === "audio" || mimeType.startsWith("audio/")) {
    return ContextFileType.AUDIO;
  }
  if (kind === "image" || mimeType.startsWith("image/")) {
    return ContextFileType.IMAGE;
  }
  if (kind === "video" || mimeType.startsWith("video/")) {
    return ContextFileType.VIDEO;
  }

  return null;
};
