import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "./channel-run-dispatch-result.js";
import { ChannelBindingRunLauncher } from "./channel-binding-run-launcher.js";
import {
  getAgentLiveMessagePublisher,
  type AgentLiveMessagePublisher,
} from "../../services/agent-streaming/agent-live-message-publisher.js";
import { buildAgentInputMessage } from "./channel-agent-input-message-builder.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelAgentRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  agentRunManager?: AgentRunManager;
  agentLiveMessagePublisher?: AgentLiveMessagePublisher;
};

export class ChannelAgentRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentLiveMessagePublisher: AgentLiveMessagePublisher;

  constructor(
    deps: ChannelAgentRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.agentLiveMessagePublisher =
      deps.agentLiveMessagePublisher ?? getAgentLiveMessagePublisher();
  }

  async dispatchToAgentBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
  ): Promise<ChannelRunDispatchResult> {
    const agentRunId = await this.runLauncher.resolveOrStartAgentRun(binding, {
      initialSummary: envelope.content,
    });
    const activeRun = this.agentRunManager.getActiveRun(agentRunId);
    if (!activeRun) {
      throw new Error(`Agent run '${agentRunId}' is not active.`);
    }
    const result = await activeRun.postUserMessage(buildAgentInputMessage(envelope));
    if (!result.accepted) {
      throw new Error(
        result.message ??
          `Agent run '${agentRunId}' rejected external channel dispatch (${result.code ?? "UNKNOWN"}).`,
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
      turnId: result.turnId ?? null,
      dispatchedAt: new Date(),
    };
  }
}
