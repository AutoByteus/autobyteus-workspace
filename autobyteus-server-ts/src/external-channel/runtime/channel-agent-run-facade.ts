import { createHash } from "node:crypto";
import {
  AgentRunCommandCoordinator,
  getAgentRunCommandCoordinator,
} from "../../agent-execution/services/agent-run-command-coordinator.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "./channel-run-dispatch-result.js";
import { ChannelBindingRunLauncher } from "./channel-binding-run-launcher.js";
import {
  getAgentLiveMessagePublisher,
  type AgentLiveMessagePublisher,
} from "../../services/agent-streaming/agent-live-message-publisher.js";
import { buildAgentInputMessage } from "./channel-agent-input-message-builder.js";
import { startDirectDispatchTurnCapture } from "./channel-dispatch-turn-capture.js";
import {
  ChannelDispatchLockRegistry,
  getChannelDispatchLockRegistry,
} from "./channel-dispatch-lock-registry.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelAgentRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  commandCoordinator?: AgentRunCommandCoordinator;
  agentLiveMessagePublisher?: AgentLiveMessagePublisher;
  dispatchLockRegistry?: ChannelDispatchLockRegistry;
};

export class ChannelAgentRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly commandCoordinator: AgentRunCommandCoordinator;
  private readonly agentLiveMessagePublisher: AgentLiveMessagePublisher;
  private readonly dispatchLockRegistry: ChannelDispatchLockRegistry;

  constructor(
    deps: ChannelAgentRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.commandCoordinator = deps.commandCoordinator ?? getAgentRunCommandCoordinator();
    this.agentLiveMessagePublisher =
      deps.agentLiveMessagePublisher ?? getAgentLiveMessagePublisher();
    this.dispatchLockRegistry =
      deps.dispatchLockRegistry ?? getChannelDispatchLockRegistry();
  }

  async dispatchToAgentBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
  ): Promise<ChannelRunDispatchResult> {
    const agentRunId = await this.runLauncher.resolveOrStartAgentRun(binding);
    return this.dispatchLockRegistry.runExclusive(
      `agent:${agentRunId}`,
      async () => {
        const turnCaptureRef: {
          current: ReturnType<typeof startDirectDispatchTurnCapture> | null;
        } = { current: null };
        const commandIdentity = buildExternalCommandIdentity(binding.id, envelope);
        const commandResult = await this.commandCoordinator.postUserMessage({
          runId: agentRunId,
          messageId: commandIdentity.messageId,
          dedupeKey: commandIdentity.dedupeKey,
          message: buildAgentInputMessage(envelope),
          summary: envelope.content,
          onActiveRunReady: (activeRun) => {
            turnCaptureRef.current = startDirectDispatchTurnCapture(
              activeRun.subscribeToEvents.bind(activeRun),
            );
          },
        });
        if (!commandResult.ack.accepted) {
          turnCaptureRef.current?.dispose();
          throw new Error(
            commandResult.ack.message ??
              `Agent run '${agentRunId}' rejected external channel dispatch (${commandResult.ack.code ?? "UNKNOWN"}).`,
          );
        }
        let turnId = normalizeOptionalString(commandResult.turnId);
        if (turnId) {
          turnCaptureRef.current?.dispose();
        } else if (turnCaptureRef.current) {
          turnId = normalizeOptionalString(await turnCaptureRef.current.promise);
        }
        if (!turnId) {
          throw new Error(
            `Agent run '${agentRunId}' accepted external channel dispatch without an authoritative turn start event.`,
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
          dispatchTargetType: "AGENT",
          agentRunId,
          turnId,
          dispatchedAt: new Date(),
        };
      },
    );
  }
}

const buildExternalCommandIdentity = (
  bindingId: string,
  envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
): { messageId: string; dedupeKey: string } => {
  const hash = createHash("sha256")
    .update(JSON.stringify({
      bindingId,
      provider: envelope.provider,
      transport: envelope.transport,
      accountId: envelope.accountId,
      peerId: envelope.peerId,
      threadId: envelope.threadId,
      externalMessageId: envelope.externalMessageId,
    }))
    .digest("hex");
  return {
    messageId: `external_${hash.slice(0, 48)}`,
    dedupeKey: `external_channel:${hash}`,
  };
};

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
