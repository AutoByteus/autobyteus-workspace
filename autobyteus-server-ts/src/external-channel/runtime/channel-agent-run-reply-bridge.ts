import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunViewProjectionService } from "../../run-history/services/agent-run-view-projection-service.js";
import type { ChannelSourceContext } from "../domain/models.js";
import type { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import type { ReplyCallbackService } from "../services/reply-callback-service.js";
import {
  PENDING_TURN_TTL_MS,
  buildCallbackIdempotencyKey,
  buildPendingTurnKey,
  type ChannelReplyBridgeDependencies,
  logSkippedPublish,
  logger,
  mergeAssistantText,
  normalizeOptionalString,
  parseDirectAgentRunEvent,
  resolveChannelReplyBridgeDependencies,
  resolveReplyTextFromProjection,
  toSourceContext,
} from "./channel-reply-bridge-support.js";

type AgentEventSource = {
  runId: AgentRun["runId"];
  subscribeToEvents: AgentRun["subscribeToEvents"];
};

export type AcceptedExternalTurnInput = {
  run: AgentEventSource;
  turnId: string | null;
  teamRunId?: string | null;
  envelope: ExternalMessageEnvelope;
};

export type AcceptedSourceLinkedTurnInput = {
  run: AgentEventSource;
  turnId: string | null;
  teamRunId?: string | null;
  source: ChannelSourceContext;
};

type PendingTurn = {
  key: string;
  subscriptionRunId: string;
  agentRunId: string;
  teamRunId: string | null;
  turnId: string;
  source: ChannelSourceContext;
  receiptBound: boolean;
  assistantText: string;
  finalText: string | null;
  settled: boolean;
  unsubscribe: (() => void) | null;
  timeout: ReturnType<typeof setTimeout>;
};

export class ChannelAgentRunReplyBridge {
  private readonly pendingTurns = new Map<string, PendingTurn>();

  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly replyCallbackServiceFactory: () => ReplyCallbackService;
  private readonly runProjectionService: AgentRunViewProjectionService;

  constructor(deps: ChannelReplyBridgeDependencies = {}) {
    const resolved = resolveChannelReplyBridgeDependencies(deps);
    this.messageReceiptService = resolved.messageReceiptService;
    this.replyCallbackServiceFactory = resolved.replyCallbackServiceFactory;
    this.runProjectionService = resolved.runProjectionService;
  }

  async bindAcceptedExternalTurn(input: AcceptedExternalTurnInput): Promise<void> {
    await this.bindAcceptedTurnToSource({
      run: input.run,
      turnId: input.turnId,
      teamRunId: input.teamRunId,
      source: toSourceContext(input.envelope),
    });
  }

  async bindAcceptedTurnToSource(input: AcceptedSourceLinkedTurnInput): Promise<void> {
    const turnId = normalizeOptionalString(input.turnId);
    if (!turnId) {
      logger.info(
        `Run '${input.run.runId}': skipping agent reply bridge because accepted turnId is missing.`,
      );
      return;
    }

    const key = buildPendingTurnKey(input.run.runId, turnId);
    if (this.pendingTurns.has(key)) {
      return;
    }

    const timeout = setTimeout(() => {
      this.finishPendingTurn(key);
    }, PENDING_TURN_TTL_MS);
    if (typeof (timeout as { unref?: () => void }).unref === "function") {
      (timeout as { unref: () => void }).unref();
    }

    const pending: PendingTurn = {
      key,
      subscriptionRunId: input.run.runId,
      agentRunId: input.run.runId,
      teamRunId: normalizeOptionalString(input.teamRunId ?? null),
      turnId,
      source: input.source,
      receiptBound: false,
      assistantText: "",
      finalText: null,
      settled: false,
      unsubscribe: null,
      timeout,
    };

    await this.bindTurnReceiptIfReady(pending);

    pending.unsubscribe = input.run.subscribeToEvents((event: unknown) => {
      void this.handleRuntimeEvent(pending, event);
    });
    this.pendingTurns.set(key, pending);
  }

  private async handleRuntimeEvent(
    pending: PendingTurn,
    event: unknown,
  ): Promise<void> {
    if (pending.settled) {
      return;
    }

    const parsed = parseDirectAgentRunEvent(event);
    if (!parsed || !this.matchesPendingTurn(pending, parsed)) {
      return;
    }

    if (parsed.eventType === AgentRunEventType.SEGMENT_CONTENT && parsed.text) {
      pending.assistantText = mergeAssistantText(pending.assistantText, parsed.text);
      return;
    }

    if (parsed.eventType === AgentRunEventType.SEGMENT_END && parsed.text) {
      pending.finalText = mergeAssistantText(pending.finalText ?? "", parsed.text);
      return;
    }

    if (parsed.eventType === AgentRunEventType.ERROR) {
      this.finishPendingTurn(pending.key);
      return;
    }

    if (
      parsed.eventType === AgentRunEventType.ASSISTANT_COMPLETE ||
      (parsed.eventType === AgentRunEventType.AGENT_STATUS &&
        parsed.statusHint === "IDLE")
    ) {
      await this.publishPendingTurnReply(pending);
    }
  }

  private matchesPendingTurn(
    pending: PendingTurn,
    event: NonNullable<ReturnType<typeof parseDirectAgentRunEvent>>,
  ): boolean {
    if (event.turnId) {
      return event.turnId === pending.turnId;
    }
    return this.countPendingTurnsForRun(pending.subscriptionRunId) === 1;
  }

  private countPendingTurnsForRun(subscriptionRunId: string): number {
    let count = 0;
    for (const pending of this.pendingTurns.values()) {
      if (pending.subscriptionRunId === subscriptionRunId) {
        count += 1;
      }
    }
    return count;
  }

  private async publishPendingTurnReply(pending: PendingTurn): Promise<void> {
    if (pending.settled) {
      return;
    }
    pending.settled = true;

    try {
      let replyText =
        normalizeOptionalString(pending.finalText) ??
        normalizeOptionalString(pending.assistantText);
      if (!replyText) {
        replyText = await resolveReplyTextFromProjection(
          this.runProjectionService,
          pending.agentRunId,
        );
      }
      if (!replyText) {
        logger.info(
          `Run '${pending.subscriptionRunId}': skipping provider callback because assistant output could not be resolved for turn '${pending.turnId}'.`,
        );
        return;
      }

      const result = await this.replyCallbackServiceFactory().publishAssistantReplyByTurn({
        agentRunId: pending.agentRunId,
        teamRunId: pending.teamRunId,
        turnId: pending.turnId,
        replyText,
        callbackIdempotencyKey: buildCallbackIdempotencyKey(
          pending.agentRunId,
          pending.turnId,
        ),
      });
      logSkippedPublish(pending.subscriptionRunId, result);
    } catch (error) {
      logger.error(
        `Run '${pending.subscriptionRunId}': outbound provider callback failed: ${String(error)}`,
      );
    } finally {
      this.finishPendingTurn(pending.key);
    }
  }

  private async bindTurnReceiptIfReady(pending: PendingTurn): Promise<void> {
    if (pending.receiptBound) {
      return;
    }

    await this.messageReceiptService.bindTurnToReceipt({
      provider: pending.source.provider,
      transport: pending.source.transport,
      accountId: pending.source.accountId,
      peerId: pending.source.peerId,
      threadId: pending.source.threadId,
      externalMessageId: pending.source.externalMessageId,
      turnId: pending.turnId,
      agentRunId: pending.agentRunId,
      teamRunId: pending.teamRunId,
      receivedAt: pending.source.receivedAt,
    });
    pending.receiptBound = true;
  }

  private finishPendingTurn(key: string): void {
    const pending = this.pendingTurns.get(key);
    if (!pending) {
      return;
    }
    this.pendingTurns.delete(key);
    clearTimeout(pending.timeout);
    if (pending.unsubscribe) {
      try {
        pending.unsubscribe();
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

let cachedChannelAgentRunReplyBridge: ChannelAgentRunReplyBridge | null = null;

export const getChannelAgentRunReplyBridge = (): ChannelAgentRunReplyBridge => {
  if (!cachedChannelAgentRunReplyBridge) {
    cachedChannelAgentRunReplyBridge = new ChannelAgentRunReplyBridge();
  }
  return cachedChannelAgentRunReplyBridge;
};
