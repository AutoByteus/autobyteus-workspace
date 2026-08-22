import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import {
  ApplicationAgentStreamEventProjector,
  ApplicationAgentStreamProjectionError,
} from "../../../src/application-agent-streaming/services/application-agent-stream-event-projector.js";
import { APPLICATION_AGENT_EVENT_TEXT_LIMIT } from "../../../src/application-communication-limits.js";
import { AgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";

const projector = new ApplicationAgentStreamEventProjector();
const event = (eventType: AgentRunEventType, payload: Record<string, unknown> = {}): AgentRunEvent => ({
  eventType,
  payload,
  runId: "physical-run-secret",
  statusHint: null,
});

describe("ApplicationAgentStreamEventProjector", () => {
  it.each([
    ["AutoByteus", { id: "segment-1", segment_type: "text", delta: "Hello " }],
    ["Codex", { id: "message-1", segment_type: "text", delta: "\nnext", provider_item_id: "secret" }],
    ["Claude", { id: "content-1", segment_type: "text", delta: " world", provider_block: "secret" }],
  ])("projects real-shaped %s canonical text with exact bytes", (_provider, payload) => {
    expect(projector.project(event(AgentRunEventType.SEGMENT_CONTENT, payload))).toEqual({
      type: "TEXT_DELTA",
      delta: payload.delta,
    });
  });

  it.each([" ", "\n", " \n\t"])("preserves whitespace-only delta %j", (delta) => {
    expect(projector.project(event(AgentRunEventType.SEGMENT_CONTENT, {
      segment_type: "text",
      delta,
    }))).toEqual({ type: "TEXT_DELTA", delta });
  });

  it("drops empty and non-text content without consuming another semantic shape", () => {
    expect(projector.project(event(AgentRunEventType.SEGMENT_CONTENT, {
      segment_type: "text",
      delta: "",
    }))).toBeNull();
    expect(projector.project(event(AgentRunEventType.SEGMENT_CONTENT, {
      segment_type: "reasoning",
      delta: "hidden reasoning",
    }))).toBeNull();
    expect(projector.project(event(AgentRunEventType.SEGMENT_CONTENT, {
      type: "text",
      delta: "provider alias",
    }))).toBeNull();
  });

  it("fails invalid or oversized canonical text for consumer isolation", () => {
    expect(() => projector.project(event(AgentRunEventType.SEGMENT_CONTENT, {
      segment_type: "text",
      delta: 42,
    }))).toThrow(ApplicationAgentStreamProjectionError);
    expect(() => projector.project(event(AgentRunEventType.SEGMENT_CONTENT, {
      segment_type: "text",
      delta: "x".repeat(APPLICATION_AGENT_EVENT_TEXT_LIMIT + 1),
    }))).toThrow(ApplicationAgentStreamProjectionError);
  });

  it.each([
    [AgentRunEventType.TURN_STARTED, { type: "TURN_STARTED" }],
    [AgentRunEventType.TURN_COMPLETED, { type: "TURN_COMPLETED" }],
    [AgentRunEventType.TURN_INTERRUPTED, { type: "TURN_INTERRUPTED" }],
    [AgentRunEventType.ERROR, { type: "ERROR", message: "provider-error-message" }],
  ])("projects %s to its exact closed event", (eventType, expected) => {
    const actual = projector.project(event(eventType, {
      turnId: "provider-turn-secret",
      reason: "provider-reason-secret",
      message: "provider-error-message",
      error: { message: "provider-error-secret", stack: "stack-secret" },
    }));
    expect(actual).toEqual(expected);
    expect(JSON.stringify(actual)).not.toContain("secret");
  });

  it("drops every non-v1 canonical agent event", () => {
    const projectedTypes = new Set<AgentRunEventType>([
      AgentRunEventType.TURN_STARTED,
      AgentRunEventType.SEGMENT_CONTENT,
      AgentRunEventType.TURN_COMPLETED,
      AgentRunEventType.TURN_INTERRUPTED,
      AgentRunEventType.ERROR,
    ]);
    for (const eventType of Object.values(AgentRunEventType)) {
      if (projectedTypes.has(eventType)) continue;
      expect(projector.project(event(eventType, { providerSecret: "must-not-escape" }))).toBeNull();
    }
  });

  it("keeps native text bytes and completion meaning unchanged while projecting the minimal application shape", () => {
    const nativeMapper = new AgentRunEventMessageMapper();
    const text = event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "segment-1",
      segment_type: "text",
      delta: " exact \n",
    });
    const completed = event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" });

    expect(nativeMapper.map(text)).toMatchObject({
      type: "SEGMENT_CONTENT",
      payload: { segment_type: "text", delta: " exact \n" },
    });
    expect(projector.project(text)).toEqual({ type: "TEXT_DELTA", delta: " exact \n" });
    expect(nativeMapper.map(completed)).toMatchObject({ type: "TURN_COMPLETED" });
    expect(projector.project(completed)).toEqual({ type: "TURN_COMPLETED" });
  });
});
