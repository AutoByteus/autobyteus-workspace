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

  it("maps browser dynamic tool completions into TOOL_EXECUTION_SUCCEEDED", () => {
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

    expect(converted).toHaveLength(1);
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

    expect(converted).toHaveLength(1);
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
  });

  it("fans out fileChange start into segment, lifecycle, and artifact events", () => {
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
      AgentRunEventType.ARTIFACT_UPDATED,
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
    expect(converted[2]?.payload).toMatchObject({
      agent_id: "run-1",
      workspace_root: "/tmp/workspace",
      path: "/tmp/workspace/demo.py",
      type: "file",
    });
  });

  it("fans out fileChange completion into success, persisted artifact, and segment end", () => {
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
      AgentRunEventType.ARTIFACT_PERSISTED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]?.payload).toMatchObject({
      invocation_id: "call_1",
      tool_name: "edit_file",
    });
    expect(converted[1]?.payload).toMatchObject({
      agent_id: "run-1",
      workspace_root: "/tmp/workspace",
      path: "/tmp/workspace/demo.py",
      type: "file",
    });
    expect(converted[2]?.payload).toMatchObject({
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
