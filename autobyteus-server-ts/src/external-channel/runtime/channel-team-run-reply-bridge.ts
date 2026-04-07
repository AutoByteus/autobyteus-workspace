import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { ChannelSourceContext } from "../domain/models.js";
import {
  PENDING_TURN_TTL_MS,
  buildPendingTurnKey,
  type ChannelReplyBridgeDependencies,
  type ChannelReplyReadyObservation,
  type ChannelTurnObservationClosedReason,
  type ChannelTurnObservationResult,
  logger,
  mergeAssistantText,
  normalizeOptionalString,
  type ParsedTeamAgentRuntimeEvent,
  parseTeamAgentRunEvent,
  resolveChannelReplyBridgeDependencies,
  resolveReplyTextFromTurnRecovery,
  toSourceContext,
} from "./channel-reply-bridge-support.js";

type TeamEventSource = {
  runId: TeamRun["runId"];
  subscribeToEvents: TeamRun["subscribeToEvents"];
};

export type ObserveAcceptedExternalTeamTurnInput = {
  run: TeamEventSource;
  turnId: string;
  teamRunId?: string | null;
  memberName?: string | null;
  memberRunId: string;
  envelope: ExternalMessageEnvelope;
};

export type ObserveAcceptedSourceLinkedTeamTurnInput = Omit<
  ObserveAcceptedExternalTeamTurnInput,
  "envelope"
> & {
  source: ChannelSourceContext;
};

type PendingTurn = {
  key: string;
  subscriptionRunId: string;
  teamRunId: string;
  agentRunId: string;
  turnId: string;
  expectedMemberName: string | null;
  source: ChannelSourceContext;
  assistantText: string;
  finalText: string | null;
  settled: boolean;
  unsubscribe: (() => void) | null;
  timeout: ReturnType<typeof setTimeout>;
  resolveObservation: (result: ChannelTurnObservationResult) => void;
  observation: Promise<ChannelTurnObservationResult>;
};

export class ChannelTeamRunReplyBridge {
  private readonly pendingTurns = new Map<string, PendingTurn>();
  private readonly turnReplyRecoveryService;

  constructor(deps: ChannelReplyBridgeDependencies = {}) {
    this.turnReplyRecoveryService =
      resolveChannelReplyBridgeDependencies(deps).turnReplyRecoveryService;
  }

  async observeAcceptedExternalTeamTurn(
    input: ObserveAcceptedExternalTeamTurnInput,
  ): Promise<ChannelTurnObservationResult> {
    return this.observeAcceptedTeamTurnToSource({
      ...input,
      source: toSourceContext(input.envelope),
    });
  }

  async observeAcceptedTeamTurnToSource(
    input: ObserveAcceptedSourceLinkedTeamTurnInput,
  ): Promise<ChannelTurnObservationResult> {
    const turnId = normalizeOptionalString(input.turnId ?? null);
    const memberRunId = normalizeOptionalString(input.memberRunId ?? null);
    const memberName = normalizeOptionalString(input.memberName ?? null);
    if (!memberRunId || !turnId) {
      throw new Error(
        `Run '${input.run.runId}': accepted team reply observation requires exact member and turn correlation.`,
      );
    }
    const teamRunId =
      normalizeOptionalString(input.teamRunId ?? null) ?? input.run.runId;
    const key = buildPendingTurnKey(memberRunId, turnId);

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
      throw new Error("Failed to initialize team reply observation.");
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
      teamRunId,
      agentRunId: memberRunId,
      turnId,
      expectedMemberName: memberName,
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
      const parsed = parseTeamAgentRunEvent(event);
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
        `Run '${pending.subscriptionRunId}': team reply observation failed: ${String(error)}`,
      );
      this.settleClosed(pending.key, "ERROR");
    }
  }

  private matchesPendingTurn(
    pending: PendingTurn,
    event: ParsedTeamAgentRuntimeEvent,
  ): boolean {
    if (event.memberRunId !== pending.agentRunId) {
      return false;
    }
    if (pending.expectedMemberName && event.memberName) {
      if (pending.expectedMemberName !== event.memberName) {
        return false;
      }
    }
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
        `Run '${pending.subscriptionRunId}': closing team reply observation because assistant output could not be resolved for turn '${pending.turnId}'.`,
      );
      this.settleClosed(pending.key, "EMPTY_REPLY");
      return;
    }

    this.settleReplyReady(pending.key, {
      agentRunId: pending.agentRunId,
      teamRunId: pending.teamRunId,
      turnId: pending.turnId,
      source: pending.source,
      replyText,
    });
  }

  private settleReplyReady(
    key: string,
    reply: ChannelReplyReadyObservation,
  ): void {
    const pending = this.pendingTurns.get(key);
    if (!pending || pending.settled) {
      return;
    }
    pending.settled = true;
    pending.resolveObservation({
      status: "REPLY_READY",
      reply,
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

let cachedChannelTeamRunReplyBridge: ChannelTeamRunReplyBridge | null = null;

export const getChannelTeamRunReplyBridge = (): ChannelTeamRunReplyBridge => {
  if (!cachedChannelTeamRunReplyBridge) {
    cachedChannelTeamRunReplyBridge = new ChannelTeamRunReplyBridge();
  }
  return cachedChannelTeamRunReplyBridge;
};
