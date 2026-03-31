import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
  ChannelSourceContext,
} from "../domain/models.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import {
  TeamRunService,
  getTeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { ChannelBindingService } from "../services/channel-binding-service.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import { ReplyCallbackService } from "../services/reply-callback-service.js";
import {
  buildCallbackIdempotencyKey,
  type ChannelTurnObservationResult,
  logger,
} from "./channel-reply-bridge-support.js";
import {
  ChannelAgentRunReplyBridge,
  getChannelAgentRunReplyBridge,
} from "./channel-agent-run-reply-bridge.js";
import {
  ChannelTeamRunReplyBridge,
  getChannelTeamRunReplyBridge,
} from "./channel-team-run-reply-bridge.js";
import { buildDefaultReplyCallbackService } from "./gateway-callback-delivery-runtime.js";
import {
  ChannelTurnReplyRecoveryService,
  getChannelTurnReplyRecoveryService,
} from "../services/channel-turn-reply-recovery-service.js";

const RETRY_DELAY_MS = 5_000;

export type AcceptedReceiptRecoveryRuntimeDependencies = {
  bindingService?: ChannelBindingService;
  messageReceiptService?: ChannelMessageReceiptService;
  agentRunManager?: AgentRunManager;
  agentRunService?: AgentRunService;
  teamRunService?: TeamRunService;
  agentReplyBridge?: ChannelAgentRunReplyBridge;
  teamReplyBridge?: ChannelTeamRunReplyBridge;
  replyCallbackServiceFactory?: () => ReplyCallbackService;
  turnReplyRecoveryService?: ChannelTurnReplyRecoveryService;
};

export class AcceptedReceiptRecoveryRuntime {
  private readonly bindingService: ChannelBindingService;
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly agentRunManager: AgentRunManager;
  private readonly agentRunService: AgentRunService;
  private readonly teamRunService: TeamRunService;
  private readonly agentReplyBridge: ChannelAgentRunReplyBridge;
  private readonly teamReplyBridge: ChannelTeamRunReplyBridge;
  private readonly replyCallbackServiceFactory: () => ReplyCallbackService;
  private readonly turnReplyRecoveryService: ChannelTurnReplyRecoveryService;
  private readonly observingKeys = new Set<string>();
  private readonly retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private started = false;

  constructor(deps: AcceptedReceiptRecoveryRuntimeDependencies = {}) {
    this.bindingService = deps.bindingService ?? new ChannelBindingService();
    this.messageReceiptService =
      deps.messageReceiptService ?? new ChannelMessageReceiptService();
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.agentRunService = deps.agentRunService ?? getAgentRunService();
    this.teamRunService = deps.teamRunService ?? getTeamRunService();
    this.agentReplyBridge = deps.agentReplyBridge ?? getChannelAgentRunReplyBridge();
    this.teamReplyBridge = deps.teamReplyBridge ?? getChannelTeamRunReplyBridge();
    this.replyCallbackServiceFactory =
      deps.replyCallbackServiceFactory ?? (() => buildDefaultReplyCallbackService());
    this.turnReplyRecoveryService =
      deps.turnReplyRecoveryService ?? getChannelTurnReplyRecoveryService();
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    void this.restoreAcceptedReceipts();
  }

  async stop(): Promise<void> {
    this.started = false;
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
    this.observingKeys.clear();
  }

  async registerAcceptedReceipt(receipt: ChannelMessageReceipt): Promise<void> {
    this.started = true;
    if (receipt.ingressState !== "ACCEPTED") {
      return;
    }
    this.scheduleProcessing(toReceiptKey(receipt), 0);
  }

  private async restoreAcceptedReceipts(): Promise<void> {
    try {
      const receipts =
        await this.messageReceiptService.listReceiptsByIngressState("ACCEPTED");
      for (const receipt of receipts) {
        this.scheduleProcessing(toReceiptKey(receipt), 0);
      }
    } catch (error) {
      logger.error(
        `Accepted receipt recovery runtime failed to restore pending receipts: ${String(error)}`,
      );
    }
  }

  private scheduleProcessing(key: ChannelIngressReceiptKey, delayMs: number): void {
    const serializedKey = serializeReceiptKey(key);
    const existing = this.retryTimers.get(serializedKey);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.retryTimers.delete(serializedKey);
      void this.processReceipt(key);
    }, delayMs);
    if (typeof (timer as { unref?: () => void }).unref === "function") {
      (timer as { unref: () => void }).unref();
    }
    this.retryTimers.set(serializedKey, timer);
  }

  private async processReceipt(key: ChannelIngressReceiptKey): Promise<void> {
    const serializedKey = serializeReceiptKey(key);
    if (this.observingKeys.has(serializedKey)) {
      return;
    }

    const receipt = await this.messageReceiptService.getReceiptByExternalMessage(key);
    if (!receipt || receipt.ingressState !== "ACCEPTED") {
      return;
    }

    const persistedPublishHandled = await this.tryPublishPersistedReply(receipt);
    if (persistedPublishHandled) {
      return;
    }

    const observationStarted = await this.tryStartLiveObservation(receipt);
    if (!observationStarted) {
      this.scheduleProcessing(key, RETRY_DELAY_MS);
    }
  }

  private async tryPublishPersistedReply(
    receipt: ChannelMessageReceipt,
  ): Promise<boolean> {
    if (!receipt.turnId || !receipt.agentRunId) {
      return false;
    }

    const replyText = await this.turnReplyRecoveryService.resolveReplyText({
      agentRunId: receipt.agentRunId,
      teamRunId: receipt.teamRunId,
      turnId: receipt.turnId,
    });
    if (!replyText) {
      return false;
    }

    return this.publishReply(receipt, {
      agentRunId: receipt.agentRunId,
      teamRunId: receipt.teamRunId,
      turnId: receipt.turnId,
      replyText,
      source: receipt,
    });
  }

  private async tryStartLiveObservation(
    receipt: ChannelMessageReceipt,
  ): Promise<boolean> {
    const serializedKey = serializeReceiptKey(receipt);

    if (receipt.teamRunId) {
      const teamRun = await this.resolveTeamRun(receipt.teamRunId);
      if (!teamRun) {
        return false;
      }
      const binding = await this.bindingService.findBindingByDispatchTarget({
        agentRunId: receipt.agentRunId,
        teamRunId: receipt.teamRunId,
      }).catch(() => null);

      this.observingKeys.add(serializedKey);
      void this.teamReplyBridge
        .observeAcceptedTeamTurnToSource({
          run: teamRun,
          teamRunId: receipt.teamRunId,
          memberName: binding?.targetNodeName ?? null,
          memberRunId: receipt.agentRunId,
          turnId: receipt.turnId,
          source: receipt,
          onCorrelationResolved: async (correlation) => {
            await this.messageReceiptService.updateAcceptedReceiptCorrelation({
              provider: correlation.source.provider,
              transport: correlation.source.transport,
              accountId: correlation.source.accountId,
              peerId: correlation.source.peerId,
              threadId: correlation.source.threadId,
              externalMessageId: correlation.source.externalMessageId,
              receivedAt: correlation.source.receivedAt,
              agentRunId: correlation.agentRunId,
              teamRunId: correlation.teamRunId,
              turnId: correlation.turnId,
            });
          },
        })
        .then(async (result) => {
          this.observingKeys.delete(serializedKey);
          await this.handleObservationResult(receipt, result);
        })
        .catch((error) => {
          this.observingKeys.delete(serializedKey);
          logger.error(
            `Accepted receipt '${serializedKey}' team observation failed: ${String(error)}`,
          );
          this.scheduleProcessing(toReceiptKey(receipt), RETRY_DELAY_MS);
        });
      return true;
    }

    if (!receipt.agentRunId) {
      return false;
    }

    const agentRun = await this.resolveAgentRun(receipt.agentRunId);
    if (!agentRun) {
      return false;
    }

    this.observingKeys.add(serializedKey);
    void this.agentReplyBridge
      .observeAcceptedTurnToSource({
        run: agentRun,
        teamRunId: receipt.teamRunId ?? null,
        turnId: receipt.turnId ?? null,
        source: receipt,
      })
      .then(async (result) => {
        this.observingKeys.delete(serializedKey);
        await this.handleObservationResult(receipt, result);
      })
      .catch((error) => {
        this.observingKeys.delete(serializedKey);
        logger.error(
          `Accepted receipt '${serializedKey}' agent observation failed: ${String(error)}`,
        );
        this.scheduleProcessing(toReceiptKey(receipt), RETRY_DELAY_MS);
      });
    return true;
  }

  private async handleObservationResult(
    receipt: ChannelMessageReceipt,
    result: ChannelTurnObservationResult,
  ): Promise<void> {
    if (result.status === "REPLY_READY") {
      const handled = await this.publishReply(receipt, result.reply);
      if (handled) {
        return;
      }
      this.scheduleProcessing(toReceiptKey(receipt), RETRY_DELAY_MS);
      return;
    }

    this.scheduleProcessing(toReceiptKey(receipt), RETRY_DELAY_MS);
  }

  private async publishReply(
    receipt: ChannelMessageReceipt,
    reply: {
      agentRunId: string;
      teamRunId: string | null;
      turnId: string;
      replyText: string;
      source: ChannelSourceContext;
    },
  ): Promise<boolean> {
    const callbackService = this.replyCallbackServiceFactory();
    const publishResult = await callbackService.publishAssistantReplyToSource({
      source: reply.source,
      agentRunId: reply.agentRunId,
      teamRunId: reply.teamRunId,
      turnId: reply.turnId,
      replyText: reply.replyText,
      callbackIdempotencyKey: buildCallbackIdempotencyKey(
        reply.agentRunId,
        reply.turnId,
      ),
    });

    if (publishResult.published || publishResult.duplicate) {
      await this.messageReceiptService.markReplyPublished({
        provider: reply.source.provider,
        transport: reply.source.transport,
        accountId: reply.source.accountId,
        peerId: reply.source.peerId,
        threadId: reply.source.threadId,
        externalMessageId: reply.source.externalMessageId,
        receivedAt: reply.source.receivedAt,
        agentRunId: reply.agentRunId,
        teamRunId: reply.teamRunId,
        turnId: reply.turnId,
      });
      return true;
    }

    if (publishResult.reason === "BINDING_NOT_FOUND") {
      await this.messageReceiptService.markIngressUnbound({
        provider: receipt.provider,
        transport: receipt.transport,
        accountId: receipt.accountId,
        peerId: receipt.peerId,
        threadId: receipt.threadId,
        externalMessageId: receipt.externalMessageId,
        receivedAt: receipt.receivedAt,
      });
      return true;
    }

    return false;
  }

  private async resolveAgentRun(agentRunId: string) {
    const activeRun = this.agentRunManager.getActiveRun(agentRunId);
    if (activeRun) {
      return activeRun;
    }
    try {
      const restored = await this.agentRunService.restoreAgentRun(agentRunId);
      return restored.run;
    } catch {
      return null;
    }
  }

  private async resolveTeamRun(teamRunId: string) {
    const activeRun = this.teamRunService.getTeamRun(teamRunId);
    if (activeRun) {
      return activeRun;
    }
    try {
      return await this.teamRunService.restoreTeamRun(teamRunId);
    } catch {
      return null;
    }
  }
}

let cachedAcceptedReceiptRecoveryRuntime: AcceptedReceiptRecoveryRuntime | null = null;

export const getAcceptedReceiptRecoveryRuntime =
  (): AcceptedReceiptRecoveryRuntime => {
    if (!cachedAcceptedReceiptRecoveryRuntime) {
      cachedAcceptedReceiptRecoveryRuntime = new AcceptedReceiptRecoveryRuntime();
    }
    return cachedAcceptedReceiptRecoveryRuntime;
  };

export const startAcceptedReceiptRecoveryRuntime = (): void => {
  getAcceptedReceiptRecoveryRuntime().start();
};

export const stopAcceptedReceiptRecoveryRuntime = async (): Promise<void> => {
  if (!cachedAcceptedReceiptRecoveryRuntime) {
    return;
  }
  await cachedAcceptedReceiptRecoveryRuntime.stop();
  cachedAcceptedReceiptRecoveryRuntime = null;
};

const toReceiptKey = (
  receipt: Pick<
    ChannelMessageReceipt,
    | "provider"
    | "transport"
    | "accountId"
    | "peerId"
    | "threadId"
    | "externalMessageId"
  >,
): ChannelIngressReceiptKey => ({
  provider: receipt.provider,
  transport: receipt.transport,
  accountId: receipt.accountId,
  peerId: receipt.peerId,
  threadId: receipt.threadId,
  externalMessageId: receipt.externalMessageId,
});

const serializeReceiptKey = (key: ChannelIngressReceiptKey): string =>
  [
    key.provider,
    key.transport,
    key.accountId,
    key.peerId,
    key.threadId ?? "",
    key.externalMessageId,
  ].join("::");
