import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunErrorEvidence } from "../../../../src/agent-execution/domain/agent-run-error-evidence.js";
import { ChannelRunOutputEventCollector } from "../../../../src/external-channel/runtime/channel-run-output-event-collector.js";
import type {
  ChannelOutputEventTextKind,
  ParsedChannelOutputEvent,
} from "../../../../src/external-channel/runtime/channel-output-event-parser.js";
import { appendOutputTextFragment } from "../../../../src/external-channel/runtime/channel-output-text-assembler.js";

const parsedEvent = (input: {
  eventType: AgentRunEventType;
  turnId?: string;
  text?: string | null;
  textKind?: ChannelOutputEventTextKind | null;
  errorEvidence?: AgentRunErrorEvidence | null;
}): ParsedChannelOutputEvent => ({
  eventType: input.eventType,
  statusHint: "ACTIVE",
  errorEvidence: input.errorEvidence ?? null,
  agentRunId: "agent-run-1",
  teamRunId: null,
  executionAddress: null,
  turnId: input.turnId ?? "turn-1",
  text: input.text ?? null,
  textKind: input.textKind ?? null,
});

describe("channel output text assembly", () => {
  it("appends true delta fragments normally", () => {
    const assembled = ["Sent", " the", " student"].reduce(
      appendOutputTextFragment,
      "",
    );

    expect(assembled).toBe("Sent the student");
  });

  it("appends every accepted byte exactly once without snapshot or overlap inference", () => {
    const deltas = [" hello ", " ", "\n", "foo\n", "x", "x", "ab", "bc"];
    expect(deltas.reduce(appendOutputTextFragment, "")).toBe(
      " hello  \nfoo\nxxabbc",
    );
    expect(appendOutputTextFragment("Yes,", ", I’m here.")).toBe(
      "Yes,, I’m here.",
    );
  });
});

describe("ChannelRunOutputEventCollector", () => {
  it("collects exact stream fragments without deduplication or reconciliation", () => {
    const collector = new ChannelRunOutputEventCollector();
    for (const text of [" hello ", " ", "\n", "foo\n", "x", "x", "ab", "bc"]) {
      expect(collector.processEvent({
        deliveryKey: "delivery-1",
        event: parsedEvent({
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          text,
          textKind: "STREAM_FRAGMENT",
        }),
      })).toBeNull();
    }

    const final = collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({ eventType: AgentRunEventType.TURN_COMPLETED }),
    });

    expect(final?.replyText).toBe(" hello  \nfoo\nxxabbc");
  });

  it("ignores segment-end payload text and retains only admitted stream content", () => {
    const collector = new ChannelRunOutputEventCollector();
    collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({
        eventType: AgentRunEventType.SEGMENT_CONTENT,
        text: "noisy partial",
        textKind: "STREAM_FRAGMENT",
      }),
    });
    collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({
        eventType: AgentRunEventType.SEGMENT_END,
        text: "clean final reply",
        textKind: null,
      }),
    });

    const final = collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({ eventType: AgentRunEventType.TURN_COMPLETED }),
    });

    expect(final?.replyText).toBe("noisy partial");
  });

  it("preserves collected output across recoverable diagnostic errors", () => {
    const collector = new ChannelRunOutputEventCollector();
    collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({
        eventType: AgentRunEventType.SEGMENT_CONTENT,
        text: "still working",
        textKind: "STREAM_FRAGMENT",
      }),
    });
    collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({
        eventType: AgentRunEventType.ERROR,
        errorEvidence: { kind: "TURN_DIAGNOSTIC", turnId: "turn-1" },
      }),
    });

    const final = collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({ eventType: AgentRunEventType.TURN_COMPLETED }),
    });
    expect(final?.replyText).toBe("still working");
  });

  it("does not clear newer-turn output for an older terminal error", () => {
    const collector = new ChannelRunOutputEventCollector();
    collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({
        eventType: AgentRunEventType.SEGMENT_CONTENT,
        turnId: "turn-b",
        text: "newer reply",
        textKind: "STREAM_FRAGMENT",
      }),
    });
    collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({
        eventType: AgentRunEventType.ERROR,
        turnId: "turn-a",
        errorEvidence: { kind: "TURN_TERMINAL", turnId: "turn-a" },
      }),
    });

    const final = collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({ eventType: AgentRunEventType.TURN_COMPLETED, turnId: "turn-b" }),
    });
    expect(final?.replyText).toBe("newer reply");
  });
});
