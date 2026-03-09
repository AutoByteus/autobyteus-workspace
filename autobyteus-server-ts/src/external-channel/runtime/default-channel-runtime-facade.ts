import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import { buildAgentExternalSourceMetadata } from "autobyteus-ts/agent/message/external-source-metadata.js";
import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRuntimeDispatchResult, ChannelRuntimeFacade } from "./channel-runtime-facade.js";
import type { ChannelBindingRuntimeLauncher } from "./channel-binding-runtime-launcher.js";
import type { RuntimeCommandIngressService } from "../../runtime-execution/runtime-command-ingress-service.js";

type TeamLike = {
  postMessage: (
    message: AgentInputUserMessage,
    targetNodeName?: string | null,
  ) => Promise<void>;
};

export type AgentTeamRunManagerPort = {
  getTeamRun(teamRunId: string): TeamLike | null;
};

export type DefaultChannelRuntimeFacadeDependencies = {
  runtimeLauncher: Pick<ChannelBindingRuntimeLauncher, "resolveOrStartAgentRun">;
  runtimeCommandIngressService: Pick<RuntimeCommandIngressService, "sendTurn">;
  agentTeamRunManager: AgentTeamRunManagerPort;
};

export class DefaultChannelRuntimeFacade implements ChannelRuntimeFacade {
  constructor(
    private readonly deps: DefaultChannelRuntimeFacadeDependencies,
  ) {}

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
    const agentRunId = await this.deps.runtimeLauncher.resolveOrStartAgentRun(binding);
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
    const teamRunId = normalizeRequiredString(binding.teamRunId, "binding.teamRunId");
    const team = this.deps.agentTeamRunManager.getTeamRun(teamRunId);
    if (!team?.postMessage) {
      throw new Error(`Team run '${teamRunId}' not found for channel dispatch.`);
    }

    await team.postMessage(buildAgentInputMessage(envelope), binding.targetNodeName);

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

const normalizeRequiredString = (
  value: string | null,
  field: string,
): string => {
  if (value === null) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};
