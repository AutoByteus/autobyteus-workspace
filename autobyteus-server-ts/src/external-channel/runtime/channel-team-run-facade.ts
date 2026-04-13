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
import { startTeamDispatchTurnCapture } from "./channel-dispatch-turn-capture.js";
import {
  ChannelDispatchLockRegistry,
  getChannelDispatchLockRegistry,
} from "./channel-dispatch-lock-registry.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type ChannelTeamRunFacadeDependencies = {
  runLauncher?: ChannelBindingRunLauncher;
  teamRunService?: TeamRunService;
  teamLiveMessagePublisher?: TeamLiveMessagePublisher;
  dispatchLockRegistry?: ChannelDispatchLockRegistry;
};

export class ChannelTeamRunFacade {
  private readonly runLauncher: ChannelBindingRunLauncher;
  private readonly teamRunService: TeamRunService;
  private readonly teamLiveMessagePublisher: TeamLiveMessagePublisher;
  private readonly dispatchLockRegistry: ChannelDispatchLockRegistry;

  constructor(
    deps: ChannelTeamRunFacadeDependencies = {},
  ) {
    this.runLauncher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.teamRunService =
      deps.teamRunService ?? getTeamRunService();
    this.teamLiveMessagePublisher =
      deps.teamLiveMessagePublisher ?? getTeamLiveMessagePublisher();
    this.dispatchLockRegistry =
      deps.dispatchLockRegistry ?? getChannelDispatchLockRegistry();
  }

  async dispatchToTeamBinding(
    binding: ChannelBinding,
    envelope: import("autobyteus-ts/external-channel/external-message-envelope.js").ExternalMessageEnvelope,
  ): Promise<ChannelRunDispatchResult> {
    const teamRunId = await this.runLauncher.resolveOrStartTeamRun(binding);
    return this.dispatchLockRegistry.runExclusive(
      `team:${teamRunId}`,
      async () => {
        const teamRun = await this.teamRunService.resolveTeamRun(teamRunId);
        if (!teamRun) {
          throw new Error(`Team run '${teamRunId}' is not active.`);
        }
        const subscribeToEvents = teamRun.subscribeToEvents.bind(teamRun);
        const turnCapture = startTeamDispatchTurnCapture(
          subscribeToEvents,
          binding.targetNodeName ?? null,
        );
        let result;
        try {
          result = await teamRun.postMessage(
            buildAgentInputMessage(envelope),
            binding.targetNodeName ?? null,
          );
        } catch (error) {
          turnCapture.dispose();
          throw error;
        }
        if (!result.accepted) {
          turnCapture.dispose();
          throw new Error(result.message ?? `Team run '${teamRunId}' rejected the message.`);
        }
        const directTurnId = normalizeOptionalString(result.turnId ?? null);
        const directMemberRunId = normalizeOptionalString(result.memberRunId ?? null);
        let capturedTurn = null;
        if (directTurnId && directMemberRunId) {
          turnCapture.dispose();
          capturedTurn = {
            turnId: directTurnId,
            memberRunId: directMemberRunId,
            memberName:
              normalizeOptionalString(result.memberName ?? null) ??
              normalizeOptionalString(binding.targetNodeName ?? null),
          };
        } else {
          capturedTurn = await turnCapture.promise;
        }
        const turnId = normalizeOptionalString(capturedTurn?.turnId ?? directTurnId);
        const memberRunId = normalizeOptionalString(
          capturedTurn?.memberRunId ?? directMemberRunId,
        );
        if (!turnId || !memberRunId) {
          throw new Error(
            `Team run '${teamRunId}' accepted external channel dispatch without authoritative member/turn correlation.`,
          );
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
          memberRunId,
          memberName:
            normalizeOptionalString(capturedTurn?.memberName ?? null) ??
            normalizeOptionalString(result.memberName ?? null) ??
            normalizeOptionalString(binding.targetNodeName ?? null),
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
