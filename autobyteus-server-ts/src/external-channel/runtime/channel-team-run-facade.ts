import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "./channel-run-dispatch-result.js";
import { ChannelBindingRunLauncher } from "./channel-binding-run-launcher.js";
import {
  getTeamLiveMessagePublisher,
  type TeamLiveMessagePublisher,
} from "../../services/agent-streaming/team-live-message-publisher.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import {
  getChannelTeamRunReplyBridge,
  type ChannelTeamRunReplyBridge,
} from "./channel-team-run-reply-bridge.js";
import { buildAgentInputMessage } from "./channel-agent-input-message-builder.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelTeamRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  teamRunService?: TeamRunService;
  externalTurnBridge?: ChannelTeamRunReplyBridge;
  teamLiveMessagePublisher?: TeamLiveMessagePublisher;
};

export class ChannelTeamRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly teamRunService: TeamRunService;
  private readonly externalTurnBridge: ChannelTeamRunReplyBridge;
  private readonly teamLiveMessagePublisher: TeamLiveMessagePublisher;

  constructor(
    deps: ChannelTeamRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.teamRunService =
      deps.teamRunService ?? getTeamRunService();
    this.externalTurnBridge =
      deps.externalTurnBridge ?? getChannelTeamRunReplyBridge();
    this.teamLiveMessagePublisher =
      deps.teamLiveMessagePublisher ?? getTeamLiveMessagePublisher();
  }

  async dispatchToTeamBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
  ): Promise<ChannelRunDispatchResult> {
    const teamRunId = await this.runLauncher.resolveOrStartTeamRun(binding, {
      initialSummary: envelope.content,
    });
    const teamRun =
      this.teamRunService.getTeamRun(teamRunId) ??
      await this.teamRunService.restoreTeamRun(teamRunId);
    const result = await teamRun.postMessage(
      buildAgentInputMessage(envelope),
      binding.targetNodeName ?? null,
    );
    if (!result.accepted) {
      throw new Error(result.message ?? `Team run '${teamRunId}' rejected the message.`);
    }
    try {
      await this.externalTurnBridge.bindAcceptedExternalTeamTurn({
        run: teamRun,
        teamRunId,
        memberName: result.memberName ?? binding.targetNodeName ?? null,
        memberRunId: result.memberRunId ?? null,
        turnId: result.turnId ?? null,
        envelope,
      });
    } catch (error) {
      logger.warn(
        `Team run '${teamRunId}': failed to bind the accepted external team turn for provider reply routing. Continuing because inbound dispatch already succeeded.`,
        error,
      );
    }
    try {
      this.teamLiveMessagePublisher.publishExternalUserMessage({
        teamRunId,
        envelope,
        agentName: binding.targetNodeName ?? null,
        agentId: null,
      });
    } catch (error) {
      logger.warn(
        `Team run '${teamRunId}': failed to publish external user message to the live team frontend stream. Continuing because provider reply routing depends on ingress receipt persistence.`,
        error,
      );
    }

    return {
      agentRunId: null,
      teamRunId,
      dispatchedAt: new Date(),
    };
  }
}
