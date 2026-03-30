import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { AgentRunViewProjectionService } from "../../run-history/services/agent-run-view-projection-service.js";
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
  type ParsedTeamAgentRuntimeEvent,
  parseTeamAgentRunEvent,
  resolveChannelReplyBridgeDependencies,
  resolveReplyTextFromProjection,
  toSourceContext,
} from "./channel-reply-bridge-support.js";

type TeamEventSource = {
  runId: TeamRun["runId"];
  subscribeToEvents: TeamRun["subscribeToEvents"];
};

export type AcceptedExternalTeamTurnInput = {
  run: TeamEventSource;
  turnId?: string | null;
  teamRunId?: string | null;
  memberName?: string | null;
  memberRunId?: string | null;
  envelope: ExternalMessageEnvelope;
};

type PendingTurn = {
  key: string;
  subscriptionRunId: string;
  teamRunId: string;
  agentRunId: string | null;
  turnId: string | null;
  expectedMemberName: string | null;
  expectedMemberRunId: string | null;
  source: ReturnType<typeof toSourceContext>;
  receiptBound: boolean;
  assistantText: string;
  finalText: string | null;
  settled: boolean;
  unsubscribe: (() => void) | null;
  timeout: ReturnType<typeof setTimeout>;
};

export class ChannelTeamRunReplyBridge {
  private readonly pendingTurns = new Map<string, PendingTurn>();
  private nextPendingId = 1;

  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly replyCallbackServiceFactory: () => ReplyCallbackService;
  private readonly runProjectionService: AgentRunViewProjectionService;

  constructor(deps: ChannelReplyBridgeDependencies = {}) {
    const resolved = resolveChannelReplyBridgeDependencies(deps);
    this.messageReceiptService = resolved.messageReceiptService;
    this.replyCallbackServiceFactory = resolved.replyCallbackServiceFactory;
    this.runProjectionService = resolved.runProjectionService;
  }

  async bindAcceptedExternalTeamTurn(
    input: AcceptedExternalTeamTurnInput,
  ): Promise<void> {
    const turnId = normalizeOptionalString(input.turnId ?? null);
    const memberRunId = normalizeOptionalString(input.memberRunId ?? null);
    const memberName = normalizeOptionalString(input.memberName ?? null);
    const teamRunId =
      normalizeOptionalString(input.teamRunId ?? null) ?? input.run.runId;
    const key =
      memberRunId && turnId
        ? buildPendingTurnKey(memberRunId, turnId)
        : this.buildAnonymousPendingKey(input.run.runId, memberName, memberRunId);
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
      teamRunId,
      agentRunId: memberRunId,
      turnId,
      expectedMemberName: memberName,
      expectedMemberRunId: memberRunId,
      source: toSourceContext(input.envelope),
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

    const parsed = parseTeamAgentRunEvent(event);
    if (!parsed || !this.matchesPendingTurn(pending, parsed)) {
      return;
    }

    if (!pending.agentRunId && parsed.memberRunId) {
      pending.agentRunId = parsed.memberRunId;
    }
    if (!pending.expectedMemberRunId && parsed.memberRunId) {
      pending.expectedMemberRunId = parsed.memberRunId;
    }
    if (!pending.turnId && parsed.turnId) {
      pending.turnId = parsed.turnId;
    }
    await this.bindTurnReceiptIfReady(pending);

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
    event: ParsedTeamAgentRuntimeEvent,
  ): boolean {
    if (pending.expectedMemberRunId && event.memberRunId) {
      if (pending.expectedMemberRunId !== event.memberRunId) {
        return false;
      }
    }
    if (pending.expectedMemberName && event.memberName) {
      if (pending.expectedMemberName !== event.memberName) {
        return false;
      }
    }
    if (pending.agentRunId && event.memberRunId) {
      if (pending.agentRunId !== event.memberRunId) {
        return false;
      }
    }
    if (pending.turnId && event.turnId) {
      return pending.turnId === event.turnId;
    }
    return this.countPendingTurnsForStream(
      pending.subscriptionRunId,
      pending.expectedMemberName,
    ) === 1;
  }

  private countPendingTurnsForStream(
    subscriptionRunId: string,
    memberName: string | null,
  ): number {
    let count = 0;
    for (const pending of this.pendingTurns.values()) {
      if (
        pending.subscriptionRunId === subscriptionRunId &&
        pending.expectedMemberName === memberName
      ) {
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
      const agentRunId =
        normalizeOptionalString(pending.agentRunId ?? pending.expectedMemberRunId);
      const turnId = normalizeOptionalString(pending.turnId);
      if (!agentRunId || !turnId) {
        logger.info(
          `Run '${pending.subscriptionRunId}': skipping provider callback because accepted team turn metadata is incomplete.`,
        );
        return;
      }

      let replyText =
        normalizeOptionalString(pending.finalText) ??
        normalizeOptionalString(pending.assistantText);
      if (!replyText) {
        replyText = await resolveReplyTextFromProjection(
          this.runProjectionService,
          agentRunId,
        );
      }
      if (!replyText) {
        logger.info(
          `Run '${pending.subscriptionRunId}': skipping provider callback because assistant output could not be resolved for turn '${turnId}'.`,
        );
        return;
      }

      const result = await this.replyCallbackServiceFactory().publishAssistantReplyByTurn({
        agentRunId,
        teamRunId: pending.teamRunId,
        turnId,
        replyText,
        callbackIdempotencyKey: buildCallbackIdempotencyKey(agentRunId, turnId),
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
    const agentRunId =
      normalizeOptionalString(pending.agentRunId ?? pending.expectedMemberRunId);
    const turnId = normalizeOptionalString(pending.turnId);
    if (!agentRunId || !turnId || pending.receiptBound) {
      return;
    }

    await this.messageReceiptService.bindTurnToReceipt({
      provider: pending.source.provider,
      transport: pending.source.transport,
      accountId: pending.source.accountId,
      peerId: pending.source.peerId,
      threadId: pending.source.threadId,
      externalMessageId: pending.source.externalMessageId,
      turnId,
      agentRunId,
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

  private buildAnonymousPendingKey(
    subscriptionRunId: string,
    memberName: string | null,
    memberRunId: string | null,
  ): string {
    const pendingId = this.nextPendingId;
    this.nextPendingId += 1;
    return `pending:${subscriptionRunId}:${memberRunId ?? memberName ?? "any"}:${pendingId}`;
  }
}

let cachedChannelTeamRunReplyBridge: ChannelTeamRunReplyBridge | null = null;

export const getChannelTeamRunReplyBridge = (): ChannelTeamRunReplyBridge => {
  if (!cachedChannelTeamRunReplyBridge) {
    cachedChannelTeamRunReplyBridge = new ChannelTeamRunReplyBridge();
  }
  return cachedChannelTeamRunReplyBridge;
};
