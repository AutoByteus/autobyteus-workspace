import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
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
}): ParsedChannelOutputEvent => ({
  eventType: input.eventType,
  statusHint: "ACTIVE",
  agentRunId: "agent-run-1",
  teamRunId: null,
  memberName: null,
  memberRunId: null,
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

  it("uses the latest cumulative snapshot fragment", () => {
    const assembled = ["Sent", "Sent the", "Sent the student"].reduce(
      appendOutputTextFragment,
      "",
    );

    expect(assembled).toBe("Sent the student");
  });

  it("dedupes suffix/prefix-overlapping stream fragments", () => {
    const assembled = [
      "Sent the",
      " the student",
      " student a",
      " a hard",
      " hard cyclic",
      " cyclic inequality",
      " inequality problem",
      " problem to",
      " to solve",
      " solve.",
    ].reduce(appendOutputTextFragment, "");

    expect(assembled).toBe(
      "Sent the student a hard cyclic inequality problem to solve.",
    );
  });

  it("dedupes punctuation overlaps without rewriting one-character word splits", () => {
    expect(appendOutputTextFragment("Yes,", ", I’m here.")).toBe("Yes, I’m here.");
    expect(appendOutputTextFragment("cat", "tail")).toBe("cattail");
  });
});

describe("ChannelRunOutputEventCollector", () => {
  it("collects overlapping stream fragments without duplicated words", () => {
    const collector = new ChannelRunOutputEventCollector();
    for (const text of [
      "Sent the",
      " the student",
      " student a",
      " a hard",
      " hard cyclic",
      " cyclic inequality",
      " inequality problem",
      " problem to",
      " to solve",
      " solve.",
    ]) {
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

    expect(final?.replyText).toBe(
      "Sent the student a hard cyclic inequality problem to solve.",
    );
  });

  it("keeps cumulative stream snapshots clean", () => {
    const collector = new ChannelRunOutputEventCollector();
    for (const text of ["Glad", "Glad you", "Glad you liked it!"]) {
      collector.processEvent({
        deliveryKey: "delivery-1",
        event: parsedEvent({
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          text,
          textKind: "STREAM_FRAGMENT",
        }),
      });
    }

    const final = collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({ eventType: AgentRunEventType.TURN_COMPLETED }),
    });

    expect(final?.replyText).toBe("Glad you liked it!");
  });

  it("uses final text snapshots before accumulated stream fragments", () => {
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
        textKind: "FINAL_TEXT",
      }),
    });

    const final = collector.processEvent({
      deliveryKey: "delivery-1",
      event: parsedEvent({ eventType: AgentRunEventType.TURN_COMPLETED }),
    });

    expect(final?.replyText).toBe("clean final reply");
  });
});
