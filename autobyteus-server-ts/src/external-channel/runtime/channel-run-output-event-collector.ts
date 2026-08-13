import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { ParsedChannelOutputEvent } from "./channel-output-event-parser.js";
import {
  appendOutputTextFragment,
} from "./channel-output-text-assembler.js";

export type ChannelRunOutputCollectedFinal = {
  deliveryKey: string;
  turnId: string;
  replyText: string | null;
};

type PendingTurn = {
  deliveryKey: string;
  turnId: string;
  assistantText: string;
};

export class ChannelRunOutputEventCollector {
  private readonly pendingTurns = new Map<string, PendingTurn>();

  processEvent(input: {
    deliveryKey: string;
    event: ParsedChannelOutputEvent;
  }): ChannelRunOutputCollectedFinal | null {
    const turnId = normalizeOptionalString(input.event.turnId);
    if (!turnId) {
      return null;
    }

    if (
      input.event.errorEvidence?.kind === "TURN_DIAGNOSTIC" ||
      input.event.errorEvidence?.kind === "RUNTIME_DIAGNOSTIC"
    ) {
      return null;
    }

    if (
      input.event.eventType === AgentRunEventType.ERROR &&
      input.event.errorEvidence?.kind === "TURN_TERMINAL" &&
      input.event.errorEvidence.turnId === turnId &&
      this.pendingTurns.get(input.deliveryKey)?.turnId === turnId
    ) {
      this.pendingTurns.delete(input.deliveryKey);
      return null;
    }

    const pending = this.getOrCreatePending(input.deliveryKey, turnId);

    if (
      input.event.eventType === AgentRunEventType.SEGMENT_CONTENT &&
      input.event.textKind === "STREAM_FRAGMENT" &&
      input.event.text
    ) {
      pending.assistantText = appendOutputTextFragment(
        pending.assistantText,
        input.event.text,
      );
      return null;
    }

    if (input.event.eventType !== AgentRunEventType.TURN_COMPLETED) {
      return null;
    }

    this.pendingTurns.delete(input.deliveryKey);
    return {
      deliveryKey: input.deliveryKey,
      turnId,
      replyText: normalizeOptionalString(pending.assistantText),
    };
  }

  forgetDelivery(deliveryKey: string): void {
    this.pendingTurns.delete(deliveryKey);
  }

  private getOrCreatePending(deliveryKey: string, turnId: string): PendingTurn {
    const existing = this.pendingTurns.get(deliveryKey);
    if (existing) {
      return existing;
    }
    const created: PendingTurn = {
      deliveryKey,
      turnId,
      assistantText: "",
    };
    this.pendingTurns.set(deliveryKey, created);
    return created;
  }
}

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
