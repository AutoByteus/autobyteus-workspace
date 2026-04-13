import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
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
  agentRunService?: AgentRunService;
  agentLiveMessagePublisher?: AgentLiveMessagePublisher;
  dispatchLockRegistry?: ChannelDispatchLockRegistry;
};

export class ChannelAgentRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly agentRunService: AgentRunService;
  private readonly agentLiveMessagePublisher: AgentLiveMessagePublisher;
  private readonly dispatchLockRegistry: ChannelDispatchLockRegistry;

  constructor(
    deps: ChannelAgentRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.agentRunService = deps.agentRunService ?? getAgentRunService();
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
        const activeRun = this.agentRunService.getAgentRun(agentRunId);
        if (!activeRun) {
          throw new Error(`Agent run '${agentRunId}' is not active.`);
        }
        const subscribeToEvents = activeRun.subscribeToEvents.bind(activeRun);
        const turnCapture = startDirectDispatchTurnCapture(subscribeToEvents);
        let result;
        try {
          result = await activeRun.postUserMessage(buildAgentInputMessage(envelope));
        } catch (error) {
          turnCapture.dispose();
          throw error;
        }
        if (!result.accepted) {
          turnCapture.dispose();
          throw new Error(
            result.message ??
              `Agent run '${agentRunId}' rejected external channel dispatch (${result.code ?? "UNKNOWN"}).`,
          );
        }
        let turnId = normalizeOptionalString(result.turnId ?? null);
        if (turnId) {
          turnCapture.dispose();
        } else {
          turnId = normalizeOptionalString(await turnCapture.promise);
        }
        if (!turnId) {
          throw new Error(
            `Agent run '${agentRunId}' accepted external channel dispatch without an authoritative turn start event.`,
          );
        }
        await this.agentRunService.recordRunActivity(activeRun, {
          summary: envelope.content,
          lastKnownStatus: "ACTIVE",
          lastActivityAt: new Date().toISOString(),
        });
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

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
