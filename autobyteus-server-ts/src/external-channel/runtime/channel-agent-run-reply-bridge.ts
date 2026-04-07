import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { ChannelSourceContext } from "../domain/models.js";
import {
  PENDING_TURN_TTL_MS,
  buildPendingTurnKey,
  type ChannelReplyBridgeDependencies,
  type ChannelTurnObservationClosedReason,
  type ChannelTurnObservationResult,
  logger,
  mergeAssistantText,
  normalizeOptionalString,
  parseDirectAgentRunEvent,
  resolveChannelReplyBridgeDependencies,
  resolveReplyTextFromTurnRecovery,
  toSourceContext,
} from "./channel-reply-bridge-support.js";

type AgentEventSource = {
  runId: AgentRun["runId"];
  subscribeToEvents: AgentRun["subscribeToEvents"];
};

export type ObserveAcceptedExternalTurnInput = {
  run: AgentEventSource;
  turnId: string;
  teamRunId?: string | null;
  envelope: ExternalMessageEnvelope;
};

export type ObserveAcceptedSourceLinkedTurnInput = {
  run: AgentEventSource;
  turnId: string;
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
  assistantText: string;
  finalText: string | null;
  settled: boolean;
  unsubscribe: (() => void) | null;
  timeout: ReturnType<typeof setTimeout>;
  resolveObservation: (result: ChannelTurnObservationResult) => void;
  observation: Promise<ChannelTurnObservationResult>;
};

export class ChannelAgentRunReplyBridge {
  private readonly pendingTurns = new Map<string, PendingTurn>();
  private readonly turnReplyRecoveryService;

  constructor(deps: ChannelReplyBridgeDependencies = {}) {
    this.turnReplyRecoveryService =
      resolveChannelReplyBridgeDependencies(deps).turnReplyRecoveryService;
  }

  async observeAcceptedExternalTurn(
    input: ObserveAcceptedExternalTurnInput,
  ): Promise<ChannelTurnObservationResult> {
    return this.observeAcceptedTurnToSource({
      run: input.run,
      turnId: input.turnId,
      teamRunId: input.teamRunId,
      source: toSourceContext(input.envelope),
    });
  }

  async observeAcceptedTurnToSource(
    input: ObserveAcceptedSourceLinkedTurnInput,
  ): Promise<ChannelTurnObservationResult> {
    const turnId = normalizeOptionalString(input.turnId);
    if (!turnId) {
      throw new Error(
        `Run '${input.run.runId}': accepted reply observation requires an exact turnId.`,
      );
    }

    const key = buildPendingTurnKey(input.run.runId, turnId);
    const existing = this.pendingTurns.get(key);
    if (existing) {
      return existing.observation;
    }

    let resolveObservation: ((result: ChannelTurnObservationResult) => void) | null =
      null;
    const observation = new Promise<ChannelTurnObservationResult>((resolve) => {
      resolveObservation = resolve;
    });
    if (!resolveObservation) {
      throw new Error("Failed to initialize agent reply observation.");
    }

    const timeout = setTimeout(() => {
      this.settleClosed(key, "TIMEOUT");
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
      assistantText: "",
      finalText: null,
      settled: false,
      unsubscribe: null,
      timeout,
      resolveObservation,
      observation,
    };

    pending.unsubscribe = input.run.subscribeToEvents((event: unknown) => {
      void this.handleRuntimeEvent(pending, event);
    });
    this.pendingTurns.set(key, pending);
    return observation;
  }

  private async handleRuntimeEvent(
    pending: PendingTurn,
    event: unknown,
  ): Promise<void> {
    if (pending.settled) {
      return;
    }

    try {
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
        this.settleClosed(pending.key, "ERROR");
        return;
      }

      if (parsed.eventType === AgentRunEventType.TURN_COMPLETED) {
        await this.publishPendingTurnReply(pending);
      }
    } catch (error) {
      logger.error(
        `Run '${pending.subscriptionRunId}': agent reply observation failed: ${String(error)}`,
      );
      this.settleClosed(pending.key, "ERROR");
    }
  }

  private matchesPendingTurn(
    pending: PendingTurn,
    event: NonNullable<ReturnType<typeof parseDirectAgentRunEvent>>,
  ): boolean {
    return event.turnId === pending.turnId;
  }

  private async publishPendingTurnReply(pending: PendingTurn): Promise<void> {
    let replyText =
      normalizeOptionalString(pending.finalText) ??
      normalizeOptionalString(pending.assistantText);
    if (!replyText) {
      replyText = await resolveReplyTextFromTurnRecovery(
        this.turnReplyRecoveryService,
        {
          agentRunId: pending.agentRunId,
          teamRunId: pending.teamRunId,
          turnId: pending.turnId,
        },
      );
    }
    if (!replyText) {
      logger.info(
        `Run '${pending.subscriptionRunId}': closing agent reply observation because assistant output could not be resolved for turn '${pending.turnId}'.`,
      );
      this.settleClosed(pending.key, "EMPTY_REPLY");
      return;
    }

    this.settleReplyReady(pending.key, replyText);
  }

  private settleReplyReady(key: string, replyText: string): void {
    const pending = this.pendingTurns.get(key);
    if (!pending || pending.settled) {
      return;
    }
    pending.settled = true;
    pending.resolveObservation({
      status: "REPLY_READY",
      reply: {
        agentRunId: pending.agentRunId,
        teamRunId: pending.teamRunId,
        turnId: pending.turnId,
        source: pending.source,
        replyText,
      },
    });
    this.finishPendingTurn(key);
  }

  private settleClosed(
    key: string,
    reason: ChannelTurnObservationClosedReason,
  ): void {
    const pending = this.pendingTurns.get(key);
    if (!pending || pending.settled) {
      return;
    }
    pending.settled = true;
    pending.resolveObservation({ status: "CLOSED", reason });
    this.finishPendingTurn(key);
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
