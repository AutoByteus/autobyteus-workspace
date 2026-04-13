import type { ChannelMessageReceipt } from "../domain/models.js";
import type { ChannelTurnReplyRecoveryService } from "../services/channel-turn-reply-recovery-service.js";
import type { ReplyCallbackService } from "../services/reply-callback-service.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { ChannelAgentRunReplyBridge } from "./channel-agent-run-reply-bridge.js";
import type { ChannelTeamRunReplyBridge } from "./channel-team-run-reply-bridge.js";
import type { ChannelTurnObservationResult } from "./channel-reply-bridge-support.js";
import { buildCallbackIdempotencyKey, logger } from "./channel-reply-bridge-support.js";

export type LiveObservationStartResult = "STARTED" | "RUN_MISSING" | "UNAVAILABLE";

export type PublishReplyResult = "PUBLISHED" | "BINDING_MISSING" | "RETRY";

export type ReceiptEffectRunnerDependencies = {
  turnReplyRecoveryService: ChannelTurnReplyRecoveryService;
  replyCallbackServiceFactory: () => ReplyCallbackService;
  agentRunService: AgentRunService;
  teamRunService: TeamRunService;
  agentReplyBridge: ChannelAgentRunReplyBridge;
  teamReplyBridge: ChannelTeamRunReplyBridge;
};

export class ReceiptEffectRunner {
  private readonly turnReplyRecoveryService: ChannelTurnReplyRecoveryService;
  private readonly replyCallbackServiceFactory: () => ReplyCallbackService;
  private readonly agentRunService: AgentRunService;
  private readonly teamRunService: TeamRunService;
  private readonly agentReplyBridge: ChannelAgentRunReplyBridge;
  private readonly teamReplyBridge: ChannelTeamRunReplyBridge;

  constructor(deps: ReceiptEffectRunnerDependencies) {
    this.turnReplyRecoveryService = deps.turnReplyRecoveryService;
    this.replyCallbackServiceFactory = deps.replyCallbackServiceFactory;
    this.agentRunService = deps.agentRunService;
    this.teamRunService = deps.teamRunService;
    this.agentReplyBridge = deps.agentReplyBridge;
    this.teamReplyBridge = deps.teamReplyBridge;
  }

  async recoverFinalReplyText(
    receipt: ChannelMessageReceipt,
  ): Promise<string | null> {
    if (!receipt.agentRunId || !receipt.turnId) {
      return null;
    }
    return this.turnReplyRecoveryService.resolveReplyText({
      agentRunId: receipt.agentRunId,
      teamRunId: receipt.teamRunId,
      turnId: receipt.turnId,
    });
  }

  async startLiveReplyObservation(
    receipt: ChannelMessageReceipt,
    callbacks: {
      onObservationResult: (result: ChannelTurnObservationResult) => Promise<void>;
      onObservationError: (error: unknown) => Promise<void>;
    },
  ): Promise<LiveObservationStartResult> {
    if (!receipt.agentRunId || !receipt.turnId) {
      return "UNAVAILABLE";
    }

    if (receipt.teamRunId) {
      const teamRun = await this.teamRunService.resolveTeamRun(receipt.teamRunId);
      if (!teamRun) {
        return "RUN_MISSING";
      }
      void this.teamReplyBridge
        .observeAcceptedTeamTurnToSource({
          run: teamRun,
          teamRunId: receipt.teamRunId,
          memberRunId: receipt.agentRunId,
          turnId: receipt.turnId,
          source: receipt,
        })
        .then(callbacks.onObservationResult)
        .catch(callbacks.onObservationError);
      return "STARTED";
    }

    const agentRun = await this.agentRunService.resolveAgentRun(receipt.agentRunId);
    if (!agentRun) {
      return "RUN_MISSING";
    }
    void this.agentReplyBridge
      .observeAcceptedTurnToSource({
        run: agentRun,
        teamRunId: null,
        turnId: receipt.turnId,
        source: receipt,
      })
      .then(callbacks.onObservationResult)
      .catch(callbacks.onObservationError);
    return "STARTED";
  }

  async publishFinalReply(
    receipt: ChannelMessageReceipt,
  ): Promise<PublishReplyResult> {
    if (!receipt.agentRunId || !receipt.turnId || !receipt.replyTextFinal) {
      return "RETRY";
    }

    const publishResult = await this.replyCallbackServiceFactory()
      .publishAssistantReplyToSource({
        source: receipt,
        agentRunId: receipt.agentRunId,
        teamRunId: receipt.teamRunId,
        turnId: receipt.turnId,
        replyText: receipt.replyTextFinal,
        callbackIdempotencyKey: buildCallbackIdempotencyKey(
          receipt.agentRunId,
          receipt.turnId,
        ),
      });

    if (publishResult.published || publishResult.duplicate) {
      return "PUBLISHED";
    }
    if (publishResult.reason === "BINDING_NOT_FOUND") {
      return "BINDING_MISSING";
    }
    return "RETRY";
  }

  async logObservationFailure(
    receipt: ChannelMessageReceipt,
    error: unknown,
  ): Promise<void> {
    logger.error(
      `Receipt workflow live observation failed for '${receipt.externalMessageId}': ${String(error)}`,
    );
  }
}
