import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import {
  parseDirectChannelOutputEvent,
  parseTeamChannelOutputEvent,
} from "../../../../src/external-channel/runtime/channel-output-event-parser.js";
import { ChannelRunOutputEligibilityPolicy } from "../../../../src/external-channel/runtime/channel-run-output-eligibility.js";

describe("channel output event parsing and eligibility", () => {
  it("parses direct assistant text from segment payload variants", () => {
    const parsed = parseDirectChannelOutputEvent({
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      runId: "agent-run-1",
      statusHint: "ACTIVE",
      payload: {
        turn: { id: "turn-1" },
        segment_type: "text",
        item: { type: "output_text", content: [{ text: "hello" }] },
      },
    });

    expect(parsed).toMatchObject({
      agentRunId: "agent-run-1",
      turnId: "turn-1",
      text: "hello",
      textKind: "STREAM_FRAGMENT",
    });
  });

  it("classifies segment end text as final text", () => {
    const parsed = parseDirectChannelOutputEvent({
      eventType: AgentRunEventType.SEGMENT_END,
      runId: "agent-run-1",
      statusHint: "ACTIVE",
      payload: {
        turnId: "turn-1",
        segment_type: "text",
        text: "complete reply",
      },
    });

    expect(parsed).toMatchObject({
      text: "complete reply",
      textKind: "FINAL_TEXT",
    });
  });

  it("ignores non-text segment end payloads", () => {
    const parsed = parseDirectChannelOutputEvent({
      eventType: AgentRunEventType.SEGMENT_END,
      runId: "agent-run-1",
      statusHint: "ACTIVE",
      payload: {
        turnId: "turn-1",
        segment_type: "tool_call",
        text: "tool output should not publish",
      },
    });

    expect(parsed).toMatchObject({
      text: null,
      textKind: null,
    });
  });

  it("parses team member events and filters to the coordinator member", () => {
    const event = {
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "worker",
        memberRunId: "worker-run-1",
        agentEvent: {
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          runId: "worker-run-1",
          statusHint: "ACTIVE",
          payload: {
            turnId: "worker-turn-1",
            segment_type: "text",
            delta: "internal",
          },
        },
      },
    };

    const parsed = parseTeamChannelOutputEvent(event);
    const policy = new ChannelRunOutputEligibilityPolicy();

    expect(parsed).toMatchObject({
      teamRunId: "team-1",
      memberName: "worker",
      memberRunId: "worker-run-1",
      text: "internal",
      textKind: "STREAM_FRAGMENT",
    });
    expect(policy.evaluate({
      linkTarget: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryMemberRunId: "coordinator-run-1",
        entryMemberName: "coordinator",
      },
      event: parsed!,
    })).toBeNull();
  });

  it("accepts restored coordinator links by member name and captures member run id", () => {
    const parsed = parseTeamChannelOutputEvent({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "coordinator",
        memberRunId: "coordinator-run-1",
        agentEvent: {
          eventType: AgentRunEventType.TURN_COMPLETED,
          runId: "coordinator-run-1",
          statusHint: "IDLE",
          payload: { turnId: "turn-2" },
        },
      },
    });
    const policy = new ChannelRunOutputEligibilityPolicy();

    const eligible = policy.evaluate({
      linkTarget: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryMemberRunId: null,
        entryMemberName: "coordinator",
      },
      event: parsed!,
    });

    expect(eligible?.target).toEqual({
      targetType: "TEAM",
      teamRunId: "team-1",
      entryMemberRunId: "coordinator-run-1",
      entryMemberName: "coordinator",
    });
  });
});
