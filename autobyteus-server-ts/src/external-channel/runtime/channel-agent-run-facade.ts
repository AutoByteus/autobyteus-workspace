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
import type { ChannelAgentDispatchHooks } from "./channel-run-dispatch-hooks.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelAgentRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  agentRunService?: AgentRunService;
  agentLiveMessagePublisher?: AgentLiveMessagePublisher;
};

export class ChannelAgentRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly agentRunService: AgentRunService;
  private readonly agentLiveMessagePublisher: AgentLiveMessagePublisher;

  constructor(
    deps: ChannelAgentRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.agentRunService = deps.agentRunService ?? getAgentRunService();
    this.agentLiveMessagePublisher =
      deps.agentLiveMessagePublisher ?? getAgentLiveMessagePublisher();
  }

  async dispatchToAgentBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
    hooks: ChannelAgentDispatchHooks = {},
  ): Promise<ChannelRunDispatchResult> {
    const agentRunId = await this.runLauncher.resolveOrStartAgentRun(binding);
    const activeRun = this.agentRunService.getAgentRun(agentRunId);
    if (!activeRun) {
      throw new Error(`Agent run '${agentRunId}' is not active.`);
    }
    hooks.onAgentRunResolved?.({
      agentRunId,
      subscribeToEvents: activeRun.subscribeToEvents.bind(activeRun),
    });
    const result = await activeRun.postUserMessage(buildAgentInputMessage(envelope));
    if (!result.accepted) {
      throw new Error(
        result.message ??
          `Agent run '${agentRunId}' rejected external channel dispatch (${result.code ?? "UNKNOWN"}).`,
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
      dispatchedAt: new Date(),
    };
  }
}
