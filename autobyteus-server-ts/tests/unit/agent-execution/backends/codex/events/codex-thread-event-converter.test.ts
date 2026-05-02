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

    expect(converted).toEqual([]);
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

    expect(converted).toEqual([]);
  });

  it("normalizes thread/compacted into provider compaction boundary status", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "compaction-1",
        turn_id: "turn-1",
        pre_tokens: 120000,
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        kind: "provider_compaction_boundary",
        runtime_kind: "CODEX",
        provider: "codex",
        source_surface: "codex.thread_compacted",
        boundary_key: "codex:thread-1:compaction-1",
        provider_thread_id: "thread-1",
        provider_event_id: "compaction-1",
        turn_id: "turn-1",
        rotation_eligible: true,
        semantic_compaction: false,
      },
    });
  });

  it("dedupes raw compaction items when thread/compacted already reported the boundary", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "compaction-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
          id: "compaction-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes raw no-stable compaction items when thread/compacted already reported the boundary", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes later thread/compacted when a raw no-stable compaction item arrived first", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes repeated raw no-stable compaction items in the same converter window", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes stable-id compaction boundaries when the raw item arrives before thread/compacted", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
          id: "compaction-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "compaction-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes raw compaction items with a different stable id after thread/compacted in the same window", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "thread-boundary-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
          id: "raw-item-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes thread/compacted with a different stable id after a raw compaction item in the same window", () => {
    const converter = new CodexThreadEventConverter("run-1");

    expect(converter.convert({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
          id: "raw-item-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.convert({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "thread-boundary-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
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

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "run-1",
      payload: {
        status: {
          type: "inProgress",
        },
      },
    });
  });

  it("emits explicit turn lifecycle plus preserved agent-status events", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: {
        turn: {
          id: "turn-codex-1",
        },
      },
    });

    expect(converted).toHaveLength(2);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TURN_COMPLETED,
      runId: "run-1",
      payload: {
        turnId: "turn-codex-1",
      },
      statusHint: "IDLE",
    });
    expect(converted[1]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "run-1",
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
        turnId: "turn-codex-1",
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

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
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

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
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

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
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

  it("fans out webSearch starts into tool_call segment and lifecycle start", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "webSearch",
          id: "ws_1",
          query: "OpenAI Codex CLI",
          action: {
            type: "search",
            query: "OpenAI Codex CLI",
            queries: ["OpenAI Codex CLI", ""],
          },
        },
        turnId: "turn-1",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
    ]);
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        id: "ws_1",
        segment_type: "tool_call",
        metadata: {
          tool_name: "search_web",
          arguments: {
            query: "OpenAI Codex CLI",
            action_type: "search",
            queries: ["OpenAI Codex CLI"],
          },
        },
      },
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        invocation_id: "ws_1",
        turn_id: "turn-1",
        tool_name: "search_web",
        arguments: {
          query: "OpenAI Codex CLI",
          action_type: "search",
          queries: ["OpenAI Codex CLI"],
        },
      },
    });
  });

  it("fans out successful webSearch completions into terminal success and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "webSearch",
          id: "ws_1",
          status: "completed",
          query: "OpenAI Codex CLI",
          action: {
            type: "search",
            query: "OpenAI Codex CLI",
            queries: ["OpenAI Codex CLI"],
          },
        },
        turnId: "turn-1",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        invocation_id: "ws_1",
        turn_id: "turn-1",
        tool_name: "search_web",
        arguments: {
          query: "OpenAI Codex CLI",
          action_type: "search",
          queries: ["OpenAI Codex CLI"],
        },
        result: {
          status: "completed",
          query: "OpenAI Codex CLI",
          action_type: "search",
          queries: ["OpenAI Codex CLI"],
        },
      },
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        id: "ws_1",
        metadata: {
          tool_name: "search_web",
          arguments: {
            query: "OpenAI Codex CLI",
            action_type: "search",
            queries: ["OpenAI Codex CLI"],
          },
        },
      },
    });
  });

  it("fans out failed webSearch completions into terminal failure and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "webSearch",
          id: "ws_failed",
          status: "failed",
          query: "OpenAI Codex CLI",
          action: {
            type: "search",
            query: "OpenAI Codex CLI",
          },
        },
        turn_id: "turn-2",
        error: "Search provider unavailable.",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_FAILED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        invocation_id: "ws_failed",
        turn_id: "turn-2",
        tool_name: "search_web",
        arguments: {
          query: "OpenAI Codex CLI",
          action_type: "search",
        },
        error: "Search provider unavailable.",
      },
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        id: "ws_failed",
        metadata: {
          tool_name: "search_web",
          arguments: {
            query: "OpenAI Codex CLI",
            action_type: "search",
          },
        },
      },
    });
  });

  it("fans out dynamicToolCall starts into tool_call segment and lifecycle start", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_send_message",
          tool: "send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
          },
          status: "inProgress",
        },
        turnId: "turn-1",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
    ]);
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        id: "call_send_message",
        segment_type: "tool_call",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
          },
        },
      },
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        invocation_id: "call_send_message",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
      },
    });
  });

  it("fans out successful dynamicToolCall completions into terminal success and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_send_message",
          tool: "send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
          },
          status: "completed",
          success: true,
          contentItems: [
            {
              type: "inputText",
              text: "Delivered message to pong.",
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        invocation_id: "call_send_message",
        tool_name: "send_message_to",
        result: "Delivered message to pong.",
      },
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        id: "call_send_message",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
          },
        },
      },
    });
  });

  it("fans out failed dynamicToolCall completions into terminal failure with contentItems error and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_send_message_failed",
          tool: "send_message_to",
          arguments: {
            recipient_name: "missing",
            content: "hello",
          },
          status: "completed",
          success: false,
          contentItems: [
            {
              type: "inputText",
              text: "Recipient missing was not found.",
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_FAILED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        invocation_id: "call_send_message_failed",
        tool_name: "send_message_to",
        error: "Recipient missing was not found.",
      },
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        id: "call_send_message_failed",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_name: "missing",
            content: "hello",
          },
        },
      },
    });
  });

  it("maps browser dynamic tool completions into terminal success and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_browser_open",
          name: "open_tab",
          status: "completed",
          result: {
            tab_id: "browser-1",
            status: "opened",
          },
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: "run-1",
      payload: {
        invocation_id: "call_browser_open",
        tool_name: "open_tab",
        result: {
          tab_id: "browser-1",
          status: "opened",
        },
      },
    });
    expect(converted[1]).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      runId: "run-1",
      payload: {
        id: "call_browser_open",
        metadata: {
          tool_name: "open_tab",
        },
      },
    });
  });

  it("parses browser dynamic tool JSON text results from contentItems", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_browser_open_text",
          name: "open_tab",
          status: "completed",
          contentItems: [
            {
              type: "inputText",
              text: JSON.stringify({
                tab_id: "browser-text-1",
                status: "opened",
                url: "https://example.com",
                title: "Example",
              }),
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: "run-1",
      payload: {
        invocation_id: "call_browser_open_text",
        tool_name: "open_tab",
        result: {
          tab_id: "browser-text-1",
          status: "opened",
          url: "https://example.com",
          title: "Example",
        },
      },
    });
    expect(converted[1]).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      runId: "run-1",
      payload: {
        id: "call_browser_open_text",
        metadata: {
          tool_name: "open_tab",
        },
      },
    });
  });

  it("fans out fileChange start into segment and lifecycle events", () => {
    const converter = new CodexThreadEventConverter("run-1", "/tmp/workspace");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "fileChange",
          id: "call_1",
          status: "inProgress",
          changes: [
            {
              path: "/tmp/workspace/demo.py",
              diff: "print('hi')\n",
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
    ]);
    expect(converted[0]?.payload).toMatchObject({
      id: "call_1",
      segment_type: "edit_file",
      metadata: {
        tool_name: "edit_file",
        path: "/tmp/workspace/demo.py",
        patch: "print('hi')\n",
      },
    });
    expect(converted[1]?.payload).toMatchObject({
      invocation_id: "call_1",
      tool_name: "edit_file",
      arguments: {
        path: "/tmp/workspace/demo.py",
        patch: "print('hi')\n",
      },
    });
  });

  it("fans out fileChange completion into success and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1", "/tmp/workspace");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "fileChange",
          id: "call_1",
          status: "completed",
          changes: [
            {
              path: "/tmp/workspace/demo.py",
              diff: "print('hi')\n",
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]?.payload).toMatchObject({
      invocation_id: "call_1",
      tool_name: "edit_file",
    });
    expect(converted[1]?.payload).toMatchObject({
      id: "call_1",
      metadata: {
        path: "/tmp/workspace/demo.py",
        patch: "print('hi')\n",
      },
    });
  });

  it("preserves edit_file metadata when converting file-change segments", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "editFile",
          id: "edit-file-1",
          path: "demo.py",
          patch: "@@ -0,0 +1 @@\n+print('demo')",
        },
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: "run-1",
      payload: {
        id: "edit-file-1",
        segment_type: "edit_file",
        metadata: {
          tool_name: "edit_file",
          path: "demo.py",
        },
      },
    });
  });
});
