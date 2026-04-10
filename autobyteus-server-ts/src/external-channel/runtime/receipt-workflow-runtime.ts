import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
} from "../domain/models.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import {
  TeamRunService,
  getTeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import {
  ChannelTurnReplyRecoveryService,
  getChannelTurnReplyRecoveryService,
} from "../services/channel-turn-reply-recovery-service.js";
import { ReplyCallbackService } from "../services/reply-callback-service.js";
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
  logger,
  type ChannelTurnObservationResult,
} from "./channel-reply-bridge-support.js";
import {
  serializeReceiptKey,
  toReceiptKey,
} from "./receipt-workflow-key.js";
import {
  loadActiveReceipt,
  listActiveReceipts,
  persistReceiptWorkflowEvent,
} from "./receipt-workflow-persistence.js";
import { ReceiptEffectRunner } from "./receipt-effect-runner.js";
import {
  RETRY_DELAY_MS,
  type ReceiptRuntimeEvent,
  type ReceiptWorkflowRuntimeDependencies,
} from "./receipt-workflow-runtime-contract.js";

export class ReceiptWorkflowRuntime {
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly effectRunner: ReceiptEffectRunner;
  private readonly eventQueues = new Map<string, ReceiptRuntimeEvent[]>();
  private readonly processingChains = new Map<string, Promise<void>>();
  private readonly retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly observingReceiptKeys = new Set<string>();
  private started = false;

  constructor(deps: ReceiptWorkflowRuntimeDependencies = {}) {
    const messageReceiptService =
      deps.messageReceiptService ?? new ChannelMessageReceiptService();
    const agentRunService = deps.agentRunService ?? getAgentRunService();
    const teamRunService = deps.teamRunService ?? getTeamRunService();
    const agentReplyBridge =
      deps.agentReplyBridge ?? getChannelAgentRunReplyBridge();
    const teamReplyBridge =
      deps.teamReplyBridge ?? getChannelTeamRunReplyBridge();
    const turnReplyRecoveryService =
      deps.turnReplyRecoveryService ?? getChannelTurnReplyRecoveryService();
    const replyCallbackServiceFactory =
      deps.replyCallbackServiceFactory ?? (() => buildDefaultReplyCallbackService());

    this.messageReceiptService = messageReceiptService;
    this.effectRunner = new ReceiptEffectRunner({
      turnReplyRecoveryService,
      replyCallbackServiceFactory,
      agentRunService,
      teamRunService,
      agentReplyBridge,
      teamReplyBridge,
    });
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    void this.restoreActiveReceipts();
  }

  async stop(): Promise<void> {
    this.started = false;
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
    this.eventQueues.clear();
    this.processingChains.clear();
    this.observingReceiptKeys.clear();
  }

  async registerAcceptedReceipt(receipt: ChannelMessageReceipt): Promise<void> {
    if (receipt.ingressState !== "ACCEPTED") {
      return;
    }
    this.enqueueReceiptEvent(toReceiptKey(receipt), {
      type: "PROCESS",
    });
  }

  private async restoreActiveReceipts(): Promise<void> {
    try {
      const receipts = await listActiveReceipts(this.messageReceiptService);
      for (const receipt of receipts) {
        this.enqueueReceiptEvent(toReceiptKey(receipt), {
          type: "PROCESS",
        });
      }
    } catch (error) {
      logger.error(
        `Receipt workflow runtime failed to restore active receipts: ${String(error)}`,
      );
    }
  }

  private enqueueReceiptEvent(
    key: ChannelIngressReceiptKey,
    event: ReceiptRuntimeEvent,
  ): void {
    const serializedKey = serializeReceiptKey(key);
    const queue = this.eventQueues.get(serializedKey) ?? [];
    queue.push(event);
    this.eventQueues.set(serializedKey, queue);

    if (this.processingChains.has(serializedKey)) {
      return;
    }

    const processing = this.drainReceiptQueue(key)
      .catch((error) => {
        logger.error(
          `Receipt workflow runtime failed for '${serializedKey}': ${String(error)}`,
        );
      })
      .finally(() => {
        this.processingChains.delete(serializedKey);
        const remainingQueue = this.eventQueues.get(serializedKey);
        if (remainingQueue && remainingQueue.length > 0) {
          this.enqueueReceiptEvent(key, {
            type: "PROCESS",
          });
        }
      });
    this.processingChains.set(serializedKey, processing);
  }

  private async drainReceiptQueue(
    key: ChannelIngressReceiptKey,
  ): Promise<void> {
    const serializedKey = serializeReceiptKey(key);
    const queue = this.eventQueues.get(serializedKey) ?? [];
    while (queue.length > 0) {
      const event = queue.shift() as ReceiptRuntimeEvent;
      await this.handleReceiptEvent(key, event);
    }
    this.eventQueues.delete(serializedKey);
  }

  private async handleReceiptEvent(
    key: ChannelIngressReceiptKey,
    event: ReceiptRuntimeEvent,
  ): Promise<void> {
    const receipt = await loadActiveReceipt(this.messageReceiptService, key);
    if (!receipt) {
      return;
    }

    switch (event.type) {
      case "PROCESS":
        await this.advanceReceipt(receipt);
        return;
      case "FINAL_REPLY_READY": {
        const updated = await persistReceiptWorkflowEvent(
          this.messageReceiptService,
          receipt,
          {
            type: "FINAL_REPLY_READY",
            replyText: event.replyText,
          },
        );
        this.enqueueReceiptEvent(toReceiptKey(updated), {
          type: "PROCESS",
        });
        return;
      }
      case "TURN_COMPLETED": {
        const updated = await persistReceiptWorkflowEvent(
          this.messageReceiptService,
          receipt,
          {
            type: "TURN_COMPLETED",
          },
        );
        this.enqueueReceiptEvent(toReceiptKey(updated), {
          type: "PROCESS",
        });
        return;
      }
      case "WORKFLOW_FAILED":
        await persistReceiptWorkflowEvent(this.messageReceiptService, receipt, {
          type: "WORKFLOW_FAILED",
          error: event.error,
          state: event.state,
        });
        return;
      case "PUBLISH_SUCCEEDED":
        await persistReceiptWorkflowEvent(this.messageReceiptService, receipt, {
          type: "PUBLISH_SUCCEEDED",
        });
        return;
      case "BINDING_MISSING":
        await persistReceiptWorkflowEvent(this.messageReceiptService, receipt, {
          type: "BINDING_MISSING",
        });
        return;
      default:
        return;
    }
  }

  private async advanceReceipt(receipt: ChannelMessageReceipt): Promise<void> {
    switch (receipt.workflowState) {
      case "TURN_BOUND":
      case "COLLECTING_REPLY":
        await this.advanceCollectingReceipt(receipt);
        return;
      case "TURN_COMPLETED":
        await this.advanceCompletedReceipt(receipt);
        return;
      case "REPLY_FINALIZED":
      case "PUBLISH_PENDING":
        await this.advancePublishableReceipt(receipt);
        return;
      default:
        return;
    }
  }

  private async advanceCollectingReceipt(
    receipt: ChannelMessageReceipt,
  ): Promise<void> {
    const serializedKey = serializeReceiptKey(toReceiptKey(receipt));
    if (this.observingReceiptKeys.has(serializedKey)) {
      return;
    }

    const collectingReceipt =
      receipt.workflowState === "COLLECTING_REPLY"
        ? receipt
        : await persistReceiptWorkflowEvent(this.messageReceiptService, receipt, {
            type: "LIVE_OBSERVATION_STARTED",
          });

    const observationStart = await this.effectRunner.startLiveReplyObservation(
      collectingReceipt,
      {
        onObservationResult: async (result) => {
          this.observingReceiptKeys.delete(serializedKey);
          await this.handleLiveObservationResult(collectingReceipt, result);
        },
        onObservationError: async (error) => {
          this.observingReceiptKeys.delete(serializedKey);
          await this.effectRunner.logObservationFailure(collectingReceipt, error);
          this.scheduleRetry(toReceiptKey(collectingReceipt), RETRY_DELAY_MS);
        },
      },
    );

    if (observationStart === "STARTED") {
      this.observingReceiptKeys.add(serializedKey);
      return;
    }
    if (observationStart === "RUN_MISSING") {
      this.enqueueReceiptEvent(toReceiptKey(collectingReceipt), {
        type: "TURN_COMPLETED",
      });
      return;
    }
    this.enqueueReceiptEvent(toReceiptKey(collectingReceipt), {
      type: "WORKFLOW_FAILED",
      error: "COLLECTING_RECEIPT_UNOBSERVABLE",
    });
  }

  private async handleLiveObservationResult(
    receipt: ChannelMessageReceipt,
    result: ChannelTurnObservationResult,
  ): Promise<void> {
    if (result.status === "REPLY_READY") {
      this.enqueueReceiptEvent(toReceiptKey(receipt), {
        type: "FINAL_REPLY_READY",
        replyText: result.reply.replyText,
      });
      return;
    }
    if (result.reason === "EMPTY_REPLY") {
      this.enqueueReceiptEvent(toReceiptKey(receipt), {
        type: "TURN_COMPLETED",
      });
      return;
    }
    this.scheduleRetry(toReceiptKey(receipt), RETRY_DELAY_MS);
  }

  private async advanceCompletedReceipt(
    receipt: ChannelMessageReceipt,
  ): Promise<void> {
    const replyText =
      receipt.replyTextFinal ??
      (await this.effectRunner.recoverFinalReplyText(receipt));
    if (!replyText) {
      this.enqueueReceiptEvent(toReceiptKey(receipt), {
        type: "WORKFLOW_FAILED",
        error: "TURN_COMPLETED_WITHOUT_RECOVERABLE_REPLY",
      });
      return;
    }
    this.enqueueReceiptEvent(toReceiptKey(receipt), {
      type: "FINAL_REPLY_READY",
      replyText,
    });
  }

  private async advancePublishableReceipt(
    receipt: ChannelMessageReceipt,
  ): Promise<void> {
    const publishableReceipt =
      receipt.workflowState === "PUBLISH_PENDING"
        ? receipt
        : await persistReceiptWorkflowEvent(this.messageReceiptService, receipt, {
            type: "PUBLISH_REQUESTED",
          });

    const publishResult =
      await this.effectRunner.publishFinalReply(publishableReceipt);
    if (publishResult === "PUBLISHED") {
      this.enqueueReceiptEvent(toReceiptKey(publishableReceipt), {
        type: "PUBLISH_SUCCEEDED",
      });
      return;
    }
    if (publishResult === "BINDING_MISSING") {
      this.enqueueReceiptEvent(toReceiptKey(publishableReceipt), {
        type: "BINDING_MISSING",
      });
      return;
    }
    this.scheduleRetry(toReceiptKey(publishableReceipt), RETRY_DELAY_MS);
  }

  private scheduleRetry(
    key: ChannelIngressReceiptKey,
    delayMs: number,
  ): void {
    const serializedKey = serializeReceiptKey(key);
    const existing = this.retryTimers.get(serializedKey);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.retryTimers.delete(serializedKey);
      this.enqueueReceiptEvent(key, {
        type: "PROCESS",
      });
    }, delayMs);
    if (typeof (timer as { unref?: () => void }).unref === "function") {
      (timer as { unref: () => void }).unref();
    }
    this.retryTimers.set(serializedKey, timer);
  }

}
