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
import { buildAgentInputMessage } from "./channel-agent-input-message-builder.js";
import type { ChannelTeamDispatchHooks } from "./channel-run-dispatch-hooks.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelTeamRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  teamRunService?: TeamRunService;
  teamLiveMessagePublisher?: TeamLiveMessagePublisher;
};

export class ChannelTeamRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly teamRunService: TeamRunService;
  private readonly teamLiveMessagePublisher: TeamLiveMessagePublisher;

  constructor(
    deps: ChannelTeamRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.teamRunService =
      deps.teamRunService ?? getTeamRunService();
    this.teamLiveMessagePublisher =
      deps.teamLiveMessagePublisher ?? getTeamLiveMessagePublisher();
  }

  async dispatchToTeamBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
    hooks: ChannelTeamDispatchHooks = {},
  ): Promise<ChannelRunDispatchResult> {
    const teamRunId = await this.runLauncher.resolveOrStartTeamRun(binding);
    const teamRun = await this.teamRunService.resolveTeamRun(teamRunId);
    if (!teamRun) {
      throw new Error(`Team run '${teamRunId}' is not active.`);
    }
    hooks.onTeamRunResolved?.({
      teamRunId,
      subscribeToEvents: teamRun.subscribeToEvents.bind(teamRun),
    });
    const result = await teamRun.postMessage(
      buildAgentInputMessage(envelope),
      binding.targetNodeName ?? null,
    );
    if (!result.accepted) {
      throw new Error(result.message ?? `Team run '${teamRunId}' rejected the message.`);
    }
    await this.teamRunService.recordRunActivity(teamRun, {
      summary: envelope.content,
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });
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
      dispatchTargetType: "TEAM",
      teamRunId,
      memberRunId: result.memberRunId ?? null,
      memberName: result.memberName ?? binding.targetNodeName ?? null,
      dispatchedAt: new Date(),
    };
  }
}
