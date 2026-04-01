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

  it("maps local MCP tool approval requests into TOOL_APPROVAL_REQUESTED", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
      params: {
        invocation_id: "call_speak_1",
        tool_name: "speak",
        arguments: {
          text: "codex converter speak probe",
          play: true,
        },
      },
    });

    expect(converted).toMatchObject({
      eventType: AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      runId: "run-1",
      payload: {
        invocation_id: "call_speak_1",
        tool_name: "speak",
        arguments: {
          text: "codex converter speak probe",
          play: true,
        },
      },
    });
  });

  it("normalizes mcpToolCall items into tool_call segments", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "mcpToolCall",
          id: "call_speak_auto",
          tool: "speak",
          arguments: {
            text: "codex converter auto speak probe",
            play: true,
          },
        },
      },
    });

    expect(converted).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: "run-1",
      payload: {
        id: "call_speak_auto",
        segment_type: "tool_call",
        metadata: {
          tool_name: "speak",
          arguments: {
            text: "codex converter auto speak probe",
            play: true,
          },
        },
      },
    });
  });

  it("maps local MCP completion events into TOOL_EXECUTION_SUCCEEDED", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_speak_auto",
        tool_name: "speak",
        item: {
          type: "mcpToolCall",
          id: "call_speak_auto",
          tool: "speak",
          status: "completed",
          result: {
            structuredContent: {
              ok: true,
            },
          },
        },
      },
    });

    expect(converted).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: "run-1",
      payload: {
        invocation_id: "call_speak_auto",
        tool_name: "speak",
        result: {
          structuredContent: {
            ok: true,
          },
        },
      },
    });
  });

  it("maps preview dynamic tool completions into TOOL_EXECUTION_SUCCEEDED", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_preview_open",
          name: "open_preview",
          status: "completed",
          result: {
            preview_session_id: "preview-1",
            status: "opened",
          },
        },
      },
    });

    expect(converted).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: "run-1",
      payload: {
        invocation_id: "call_preview_open",
        tool_name: "open_preview",
        result: {
          preview_session_id: "preview-1",
          status: "opened",
        },
      },
    });
  });
});
