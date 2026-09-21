import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import {
  parseDirectChannelOutputEvent,
  parseTeamChannelOutputEvent,
} from "../../../../src/external-channel/runtime/channel-output-event-parser.js";
import { ChannelRunOutputEligibilityPolicy } from "../../../../src/external-channel/runtime/channel-run-output-eligibility.js";

describe("channel output event parsing and eligibility", () => {
  it("parses direct assistant text from the admitted segment delta", () => {
    const parsed = parseDirectChannelOutputEvent({
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      runId: "agent-run-1",
      statusHint: "ACTIVE",
      payload: {
        turnId: "turn-1",
        segment_type: "text",
        delta: "hello",
      },
    });

    expect(parsed).toMatchObject({
      agentRunId: "agent-run-1",
      turnId: "turn-1",
      text: "hello",
      textKind: "STREAM_FRAGMENT",
    });
  });

  it("does not reinterpret segment-end metadata as assistant text", () => {
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
      text: null,
      textKind: null,
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

  it("preserves strict diagnostic error evidence for downstream output collection", () => {
    const parsed = parseDirectChannelOutputEvent({
      eventType: AgentRunEventType.ERROR,
      runId: "agent-run-1",
      statusHint: null,
      payload: {
        source: "ToolPhase",
        message: "recoverable",
        error_scope: "turn",
        error_effect: "diagnostic",
        turn_id: "turn-1",
      },
    });

    expect(parsed?.errorEvidence).toEqual({
      kind: "TURN_DIAGNOSTIC",
      turnId: "turn-1",
    });
  });

  it("parses team member events and filters to the coordinator member", () => {
    const event = {
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: {
        root: { rootSubjectKind: "agent_team", rootRunId: "team-1" },
        memberAddress: "/worker",
        agentRunId: "worker-run-1",
      },
      payload: {
        eventType: "SEGMENT_CONTENT",
        statusHint: "ACTIVE",
        details: {
          segmentId: "segment-1",
          turnId: "worker-turn-1",
          segmentType: "text",
          delta: "internal",
        },
      },
    };

    const parsed = parseTeamChannelOutputEvent(event);
    const policy = new ChannelRunOutputEligibilityPolicy();

    expect(parsed).toMatchObject({
      teamRunId: "team-1",
      agentRunId: "worker-run-1",
      memberAddress: "/worker",
      text: "internal",
      textKind: "STREAM_FRAGMENT",
    });
    expect(policy.evaluate({
      linkTarget: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryAgentRunId: "coordinator-run-1",
      },
      event: parsed!,
    })).toBeNull();
  });

  it("accepts a restored exact entry Agent identity", () => {
    const parsed = parseTeamChannelOutputEvent({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: {
        root: { rootSubjectKind: "agent_team", rootRunId: "team-1" },
        memberAddress: "/coordinator",
        agentRunId: "coordinator-run-1",
      },
      payload: {
        eventType: "TURN_COMPLETED",
        statusHint: "IDLE",
        details: { turnId: "turn-2", reason: null },
      },
    });
    const policy = new ChannelRunOutputEligibilityPolicy();

    const eligible = policy.evaluate({
      linkTarget: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryAgentRunId: "coordinator-run-1",
      },
      event: parsed!,
    });

    expect(eligible?.target).toEqual({
      targetType: "TEAM",
      teamRunId: "team-1",
      entryAgentRunId: "coordinator-run-1",
    });
  });
});
