import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventConverter } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

const expectNoAgentToolsProviderMarkers = (
  payloads: Array<Record<string, unknown>>,
): void => {
  for (const payload of payloads) {
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("autobyteus_agent_tools");
    expect(serialized).not.toContain("mcp__autobyteus_agent_tools__");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("http_headers");
  }
};

const expectNoAgentToolsSecrets = (
  payloads: Array<Record<string, unknown>>,
  secrets: string[],
): void => {
  const serialized = JSON.stringify(payloads);
  for (const secret of secrets) {
    expect(serialized).not.toContain(secret);
  }
};

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

  it("maps thread status changes into normalized AGENT_STATUS payloads", () => {
    const converter = new CodexThreadEventConverter("run-1", null, () => ({
      status: "running",
      can_interrupt: true,
    }));

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
        status: "running",
        can_interrupt: true,
      },
    });
  });

  it("emits explicit turn lifecycle plus normalized agent-status events", () => {
    const converter = new CodexThreadEventConverter("run-1", null, () => ({
      status: "idle",
      can_interrupt: false,
    }));

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
        status: "idle",
        can_interrupt: false,
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

  it("maps local Agent Tools MCP approval requests into TOOL_APPROVAL_REQUESTED with canonical arguments", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
      params: {
        invocation_id: "call_send_message_approval",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_name: "code_reviewer",
          content: "ready for review",
        },
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      runId: "run-1",
      payload: {
        invocation_id: "call_send_message_approval",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "code_reviewer",
          content: "ready for review",
        },
      },
    });
  });

  it("maps local permission approval requests into TOOL_APPROVAL_REQUESTED with requested profile context", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
      params: {
        invocation_id: "perm-request-1",
        tool_name: "request_permissions",
        arguments: {
          permissions: {
            fileSystem: {
              read: ["/tmp/codex-validation"],
            },
            network: {
              enabled: true,
            },
          },
          cwd: "/tmp/codex-validation",
          reason: "Need validation access",
        },
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      runId: "run-1",
      payload: {
        invocation_id: "perm-request-1",
        tool_name: "request_permissions",
        arguments: {
          permissions: {
            fileSystem: {
              read: ["/tmp/codex-validation"],
            },
            network: {
              enabled: true,
            },
          },
          cwd: "/tmp/codex-validation",
          reason: "Need validation access",
        },
      },
    });
  });

  it("fans out mcpToolCall starts into tool_call segment and lifecycle start", () => {
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
        turnId: "turn-mcp-1",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
    ]);
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
    expect(converted[1]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
      runId: "run-1",
      payload: {
        invocation_id: "call_speak_auto",
        turn_id: "turn-mcp-1",
        tool_name: "speak",
        arguments: {
          text: "codex converter auto speak probe",
          play: true,
        },
      },
    });
  });

  it("maps local MCP completion events into TOOL_EXECUTION_SUCCEEDED with arguments", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_speak_auto",
        turn_id: "turn-mcp-1",
        tool_name: "speak",
        arguments: {
          text: "codex converter auto speak probe",
          play: true,
        },
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
        turn_id: "turn-mcp-1",
        tool_name: "speak",
        arguments: {
          text: "codex converter auto speak probe",
          play: true,
        },
        result: {
          structuredContent: {
            ok: true,
          },
        },
      },
    });
  });

  it("normalizes observed local MCP open_tab completion envelopes into direct browser results", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_open_tab",
        turn_id: "turn-browser-1",
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
        arguments: {
          url: "https://example.com",
          wait_until: "domcontentloaded",
          reuse_existing: true,
          title: "Open Tab Test",
        },
        result: {
          content: [
            {
              type: "text",
              text: "{\n  \"tab_id\": \"65ab2c\",\n  \"status\": \"reused\",\n  \"url\": \"https://example.com/\",\n  \"title\": \"Open Tab Test\"\n}",
            },
          ],
          structuredContent: null,
          _meta: null,
        },
        item: {
          type: "mcpToolCall",
          id: "call_open_tab",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__open_tab",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted).toHaveLength(1);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: "run-1",
      payload: {
        invocation_id: "call_open_tab",
        turn_id: "turn-browser-1",
        tool_name: "open_tab",
        arguments: {
          url: "https://example.com",
          wait_until: "domcontentloaded",
          reuse_existing: true,
          title: "Open Tab Test",
        },
        result: {
          tab_id: "65ab2c",
          status: "reused",
          url: "https://example.com/",
          title: "Open Tab Test",
        },
      },
    });
    expect(converted[0]?.payload.result).not.toHaveProperty("content");
  });

  it("maps failed local MCP completion events into TOOL_EXECUTION_FAILED with arguments", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_speak_failed",
        turn_id: "turn-mcp-2",
        tool_name: "speak",
        arguments: {
          text: "codex converter failed speak probe",
          play: false,
        },
        item: {
          type: "mcpToolCall",
          id: "call_speak_failed",
          tool: "speak",
          status: "failed",
          error: "speaker unavailable",
        },
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      runId: "run-1",
      payload: {
        invocation_id: "call_speak_failed",
        turn_id: "turn-mcp-2",
        tool_name: "speak",
        arguments: {
          text: "codex converter failed speak probe",
          play: false,
        },
        error: "speaker unavailable",
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

  it("fans out Agent Tools MCP send_message_to starts into tool_call segment and canonical lifecycle start", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "mcpToolCall",
          id: "call_send_message",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__send_message_to",
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
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        item: {
          tool: "send_message_to",
        },
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
    expect(converted[0].payload).toMatchObject({
      item: expect.not.objectContaining({
        server: expect.anything(),
      }),
    });
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        item: {
          tool: "send_message_to",
        },
        invocation_id: "call_send_message",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
      },
    });
  });

  it("maps successful Agent Tools MCP send_message_to completions into canonical terminal success", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_send_message",
        turn_id: "turn-1",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
        item: {
          type: "mcpToolCall",
          id: "call_send_message",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__send_message_to",
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
    ]);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        item: {
          tool: "send_message_to",
          contentItems: [
            {
              type: "inputText",
              text: "Delivered message to pong.",
            },
          ],
        },
        invocation_id: "call_send_message",
        turn_id: "turn-1",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
        result: "Delivered message to pong.",
      },
    });
  });

  it("normalizes non-send Agent Tools MCP completions into canonical tool lifecycle events", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generate_image",
        turn_id: "turn-1",
        tool_name: "mcp__autobyteus_agent_tools__generate_image",
        arguments: {
          prompt: "sunrise",
          output_file_path: "out.png",
        },
        item: {
          type: "mcpToolCall",
          id: "call_generate_image",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__generate_image",
          status: "completed",
          success: true,
          contentItems: [
            {
              type: "inputText",
              text: "{\"file_path\":\"/tmp/out.png\"}",
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      payload: {
        item: {
          tool: "generate_image",
        },
        invocation_id: "call_generate_image",
        tool_name: "generate_image",
        arguments: {
          prompt: "sunrise",
          output_file_path: "out.png",
        },
        result: {
          file_path: "/tmp/out.png",
        },
      },
    });
  });

  it("redacts prefixed free-form text and raw secret fields in Agent Tools MCP payloads", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generate_image_secret_probe",
        turn_id: "turn-1",
        tool_name: "mcp__autobyteus_agent_tools__generate_image",
        serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-secret-123",
        http_headers: {
          Authorization: "Bearer raw-header-token",
        },
        arguments: {
          prompt: "sunrise",
          capabilityToken: "raw-capability-token",
          nested: {
            token: "raw-nested-token",
            safe: "keep me",
          },
        },
        item: {
          type: "mcpToolCall",
          id: "call_generate_image_secret_probe",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__generate_image",
          status: "completed",
          success: true,
          capabilityToken: "raw-item-capability-token",
          tokenHash: "raw-token-hash",
          contentItems: [
            {
              type: "inputText",
              text:
                "mcp__autobyteus_agent_tools__generate_image Authorization: Bearer raw-freeform-token " +
                "http://127.0.0.1:3000/mcp/agent-tools/session-text-456 capabilityToken=raw-text-capability",
            },
          ],
        },
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expectNoAgentToolsSecrets(converted.map((event) => event.payload), [
      "raw-header-token",
      "raw-capability-token",
      "raw-nested-token",
      "raw-item-capability-token",
      "raw-token-hash",
      "raw-freeform-token",
      "raw-text-capability",
      "session-secret-123",
      "session-text-456",
    ]);
    expect(converted[0]).toMatchObject({
      payload: {
        tool_name: "generate_image",
        arguments: {
          prompt: "sunrise",
          nested: {
            safe: "keep me",
          },
        },
        item: {
          tool: "generate_image",
          contentItems: [
            {
              text: expect.stringContaining("generate_image"),
            },
          ],
        },
      },
    });
    const serialized = JSON.stringify(converted.map((event) => event.payload));
    expect(serialized).toContain("/mcp/agent-tools/<redacted>");
    expect(serialized).toContain("authorization_redacted=<redacted>");
    expect(serialized).toContain("capabilityToken=<redacted>");
  });

  it("maps failed Agent Tools MCP send_message_to completions into canonical terminal failure", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_send_message_failed",
        turn_id: "turn-1",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_name: "missing",
          content: "hello",
        },
        item: {
          type: "mcpToolCall",
          id: "call_send_message_failed",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__send_message_to",
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
    ]);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        item: {
          tool: "send_message_to",
          contentItems: [
            {
              type: "inputText",
              text: "Recipient missing was not found.",
            },
          ],
        },
        invocation_id: "call_send_message_failed",
        turn_id: "turn-1",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "missing",
          content: "hello",
        },
        error: "Recipient missing was not found.",
      },
    });
  });

  it("sanitizes Agent Tools MCP ITEM_COMPLETED segment-end payloads", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "mcpToolCall",
          id: "call_send_message_segment_end",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__send_message_to",
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
      AgentRunEventType.SEGMENT_END,
    ]);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      runId: "run-1",
      payload: {
        item: {
          tool: "send_message_to",
          contentItems: [
            {
              type: "inputText",
              text: "Delivered message to pong.",
            },
          ],
        },
        id: "call_send_message_segment_end",
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

  it("maps generic dynamic tool completions into terminal success and segment end", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_custom_dynamic",
          name: "custom_dynamic_tool",
          status: "completed",
          result: {
            tab_id: "dynamic-1",
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
        invocation_id: "call_custom_dynamic",
        tool_name: "custom_dynamic_tool",
        result: {
          tab_id: "dynamic-1",
          status: "opened",
        },
      },
    });
    expect(converted[1]).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      runId: "run-1",
      payload: {
        id: "call_custom_dynamic",
        metadata: {
          tool_name: "custom_dynamic_tool",
        },
      },
    });
  });

  it("parses generic dynamic tool JSON text results from contentItems", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const converted = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "dynamicToolCall",
          id: "call_custom_dynamic_text",
          name: "custom_dynamic_tool",
          status: "completed",
          contentItems: [
            {
              type: "inputText",
              text: JSON.stringify({
                tab_id: "dynamic-text-1",
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
        invocation_id: "call_custom_dynamic_text",
        tool_name: "custom_dynamic_tool",
        result: {
          tab_id: "dynamic-text-1",
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
        id: "call_custom_dynamic_text",
        metadata: {
          tool_name: "custom_dynamic_tool",
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
