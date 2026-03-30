import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventConverter } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

describe("CodexThreadEventConverter", () => {
  it("ignores codex-prefixed internal events at the dispatcher boundary", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: "codex/event/mcp_startup_update",
      params: {},
    });

    expect(converted).toBeNull();
  });

  it("does not map token-usage telemetry into AGENT_STATUS", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED,
      params: {
        usage: {
          inputTokens: 12,
          outputTokens: 5,
        },
      },
    });

    expect(converted).toBeNull();
  });

  it("still maps thread status changes into AGENT_STATUS", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.THREAD_STATUS_CHANGED,
      params: {
        status: {
          type: "inProgress",
        },
      },
    });

    expect(converted).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "run-1",
      payload: {
        status: {
          type: "inProgress",
        },
      },
    });
  });
});
