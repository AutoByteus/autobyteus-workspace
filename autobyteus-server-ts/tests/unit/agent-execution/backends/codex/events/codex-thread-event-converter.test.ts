import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { createCodexThreadEventHarness } from "../../../../../fixtures/codex-thread-event-harness.js";
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

describe("CodexThreadEventConverter through CodexThread", () => {
  it("projects command cwd on live execution start", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        turnId: "turn-command-start",
        item: {
          id: "tool-command-start",
          type: "commandExecution",
          command: "/bin/bash -lc pwd",
          cwd: "/workspace/nested",
          status: "inProgress",
        },
      },
    });

    const started = converted.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED,
    );
    expect(started).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
      payload: {
        invocation_id: "tool-command-start",
        turnId: "turn-command-start",
        tool_name: "run_bash",
        arguments: {
          command: "/bin/bash -lc pwd",
          cwd: "/workspace/nested",
        },
      },
    });
  });

  it("projects command cwd on live execution completion", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-command-complete",
        item: {
          id: "tool-command-complete",
          type: "commandExecution",
          command: "/bin/bash -lc pwd",
          cwd: "/workspace/nested",
          status: "completed",
          aggregatedOutput: "/workspace/nested\n",
        },
      },
    });

    const terminal = converted.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    );
    expect(terminal).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "tool-command-complete",
        turn_id: "turn-command-complete",
        tool_name: "run_bash",
        arguments: {
          command: "/bin/bash -lc pwd",
          cwd: "/workspace/nested",
        },
        result: "/workspace/nested\n",
      },
    });
  });

  it("projects top-level command cwd on approval requests", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
      params: {
        itemId: "tool-command-approval",
        approvalId: "approval-command-1",
        command: "pnpm test",
        cwd: "/repo/package",
      },
    });

    const approval = converted.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
    );
    expect(approval).toMatchObject({
      eventType: AgentRunEventType.TOOL_APPROVAL_REQUESTED,
      payload: {
        invocation_id: "tool-command-approval",
        tool_name: "run_bash",
        arguments: {
          command: "pnpm test",
          cwd: "/repo/package",
        },
      },
    });
  });

  it("projects authoritative command arguments for a result-first completed command", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-result-first",
        item: {
          id: "tool-result-first",
          type: "commandExecution",
          command: "echo inferred",
          status: "completed",
          aggregatedOutput: "inferred\n",
        },
      },
    });

    const terminal = converted.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    );
    expect(terminal).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "tool-result-first",
        turn_id: "turn-result-first",
        tool_name: "run_bash",
        arguments: { command: "echo inferred" },
        result: "inferred\n",
      },
    });
  });

  it("preserves explicit empty arguments for a result-first dynamic terminal", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-empty-dynamic",
        item: {
          id: "dynamic-empty",
          type: "dynamicToolCall",
          name: "no_arg_tool",
          arguments: {},
          status: "completed",
          result: { ok: true },
        },
      },
    });

    const terminal = converted.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    );
    expect(terminal).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "dynamic-empty",
        turn_id: "turn-empty-dynamic",
        tool_name: "no_arg_tool",
        arguments: {},
        result: { ok: true },
      },
    });
  });

  it("omits arguments for a genuinely argument-absent dynamic terminal", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-absent-dynamic",
        item: {
          id: "dynamic-absent",
          type: "dynamicToolCall",
          name: "arguments_later_tool",
          status: "completed",
          result: { ok: true },
        },
      },
    });

    const terminal = converted.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    );
    expect(terminal?.payload).toMatchObject({
      invocation_id: "dynamic-absent",
      turn_id: "turn-absent-dynamic",
      tool_name: "arguments_later_tool",
      result: { ok: true },
    });
    expect(terminal?.payload).not.toHaveProperty("arguments");
  });

  it("ignores codex-prefixed internal events at the dispatcher boundary", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: "codex/event/mcp_startup_update",
      params: {},
    });

    expect(converted).toEqual([]);
  });

  it("does not map token-usage telemetry into AGENT_STATUS", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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

  it("normalizes contextCompaction item start into a non-rotating provider compaction status", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "contextCompaction",
          id: "compaction-item-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        kind: "provider_compaction_boundary",
        runtime_kind: "CODEX",
        provider: "codex",
        source_surface: "codex.context_compaction_started",
        boundary_key: "codex:thread-1:compaction-item-1:compacting",
        provider_thread_id: "thread-1",
        provider_event_id: "compaction-item-1",
        turn_id: "turn-1",
        status: "compacting",
        rotation_eligible: false,
        semantic_compaction: false,
      },
    });
  });

  it("normalizes contextCompaction item completion into a rotating provider compaction boundary", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "contextCompaction",
          id: "compaction-item-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        kind: "provider_compaction_boundary",
        runtime_kind: "CODEX",
        provider: "codex",
        source_surface: "codex.context_compaction_completed",
        boundary_key: "codex:thread-1:compaction-item-1",
        provider_thread_id: "thread-1",
        provider_event_id: "compaction-item-1",
        turn_id: "turn-1",
        status: "compacted",
        rotation_eligible: true,
        semantic_compaction: false,
      },
    });
  });

  it("does not let contextCompaction start suppress the later completed boundary", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "contextCompaction",
          id: "compaction-item-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    const completed = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "contextCompaction",
          id: "compaction-item-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    });

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        boundary_key: "codex:thread-1:compaction-item-1",
        provider_event_id: "compaction-item-1",
        status: "compacted",
        rotation_eligible: true,
      },
    });
  });

  it("normalizes raw context_compaction items into provider compaction boundaries", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "context_compaction",
          id: "compaction-item-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        source_surface: "codex.raw_response_compaction_item",
        boundary_key: "codex:thread-1:compaction-item-1",
        provider_response_id: "response-1",
        status: "compacted",
        rotation_eligible: true,
      },
    });
  });

  it("dedupes completed contextCompaction and raw context_compaction surfaces for the same item", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "contextCompaction",
          id: "compaction-item-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "context_compaction",
          id: "compaction-item-1",
          response_id: "response-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("ignores compaction_trigger items as non-boundary signals", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "compaction_trigger",
          id: "trigger-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction_trigger",
          id: "trigger-1",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes raw compaction items when thread/compacted already reported the boundary", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "compaction-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("dedupes repeated raw no-stable compaction items in the same converter window", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      params: {
        item: {
          type: "compaction",
        },
        thread_id: "thread-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
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

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "compaction-1",
        turn_id: "turn-1",
      },
    })).toEqual([]);
  });

  it("keeps raw compaction items with a distinct stable id after thread/compacted in the same window", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "thread-boundary-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);

    expect(converter.emitThroughThread({
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
  });

  it("keeps thread/compacted with a distinct stable id after a raw compaction item in the same window", () => {
    const converter = createCodexThreadEventHarness("run-1");

    expect(converter.emitThroughThread({
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

    expect(converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_COMPACTED,
      params: {
        thread_id: "thread-1",
        id: "thread-boundary-1",
        turn_id: "turn-1",
      },
    })).toHaveLength(1);
  });

  it("emits thread status changes as neutral lifecycle facts", () => {
    const converter = createCodexThreadEventHarness("run-1");
    converter.thread.markTurnStarted("turn-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.THREAD_STATUS_CHANGED,
      params: {
        status: {
          type: "inProgress",
        },
      },
    });

    expect(converted).toEqual([
      expect.objectContaining({
        eventType: AgentRunEventType.AGENT_STATUS,
        payload: { status: "running" },
      }),
    ]);
  });

  it("emits only neutral explicit turn lifecycle events", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: {
        turn: {
          id: "turn-codex-1",
        },
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TURN_COMPLETED,
      runId: "run-1",
      payload: {
        turnId: "turn-codex-1",
      },
      statusHint: "IDLE",
    });
  });

  it("emits effect-aware Codex errors without a backend status companion", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ERROR,
      params: {
        code: "TURN_FAILED",
        message: "failed",
        error_scope: "turn",
        error_effect: "terminal",
        turn_id: "turn-1",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.ERROR,
    ]);
    expect(converted[0].payload).toMatchObject({
      error_scope: "turn",
      error_effect: "terminal",
      turn_id: "turn-1",
    });
    expect(converted[0].statusHint).toBe("ERROR");
  });

  it("keeps unclassified Codex errors as content without a guessed status", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ERROR,
      params: { code: "UNKNOWN", message: "unclassified" },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0].eventType).toBe(AgentRunEventType.ERROR);
    expect(converted[0].statusHint).toBeNull();
  });

  it("does not emit a status companion for a terminal error rejected by native turn guards", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ERROR,
      params: {
        code: "TURN_FAILED",
        message: "old failure",
        error_scope: "turn",
        error_effect: "terminal",
        turn_id: "turn-a",
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.ERROR,
      payload: { turn_id: "turn-a" },
    });
  });

  it("maps local MCP tool approval requests into TOOL_APPROVAL_REQUESTED", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
      params: {
        invocation_id: "call_send_message_approval",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_address: "code_reviewer",
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
          recipient_address: "code_reviewer",
          content: "ready for review",
        },
      },
    });
  });

  it("maps local permission approval requests into TOOL_APPROVAL_REQUESTED with requested profile context", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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

  it("normalizes Agent Tools MCP delegate_task completion envelopes into direct task results", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const taskResult = {
      task_id: "task_0001",
      status: "active",
    };

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_delegate_task",
        turn_id: "turn-task-1",
        tool_name: "mcp__autobyteus_agent_tools__delegate_task",
        arguments: {
          target: {
            kind: "team",
            name: "StudentStudyGroup",
          },
          task: "Summarize the lesson.",
        },
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(taskResult),
            },
          ],
          structuredContent: null,
          _meta: null,
        },
        item: {
          type: "mcpToolCall",
          id: "call_delegate_task",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__delegate_task",
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
        invocation_id: "call_delegate_task",
        turn_id: "turn-task-1",
        tool_name: "delegate_task",
        arguments: {
          target: {
            kind: "team",
            name: "StudentStudyGroup",
          },
          task: "Summarize the lesson.",
        },
        result: taskResult,
      },
    });
    expect(converted[0]?.payload.result).not.toHaveProperty("content");
    expect(converted[0]?.payload.result).not.toHaveProperty("structuredContent");
    expect(converted[0]?.payload.result).not.toHaveProperty("_meta");
  });

  it("normalizes Agent Tools MCP review_task_result completion envelopes into direct task results", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const reviewResult = {
      task_id: "task_0001",
      status: "accepted",
    };

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_review_task_result",
        turn_id: "turn-task-2",
        tool_name: "mcp__autobyteus_agent_tools__review_task_result",
        arguments: {
          task_id: "task_0001",
          decision: "accept",
          comment: "Looks good.",
        },
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(reviewResult),
            },
          ],
          structuredContent: null,
          _meta: null,
        },
        item: {
          type: "mcpToolCall",
          id: "call_review_task_result",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__review_task_result",
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
        invocation_id: "call_review_task_result",
        turn_id: "turn-task-2",
        tool_name: "review_task_result",
        result: reviewResult,
      },
    });
    expect(converted[0]?.payload.result).not.toHaveProperty("content");
  });

  it("projects generic Codex MCP JSON text envelopes into parsed results", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generic_json",
        turn_id: "turn-generic-json",
        tool_name: "mcp__custom_server__custom_tool",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, count: 2 }),
            },
          ],
          structuredContent: null,
          _meta: { hidden: true },
        },
        item: {
          type: "mcpToolCall",
          id: "call_generic_json",
          tool: "mcp__custom_server__custom_tool",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "call_generic_json",
        tool_name: "mcp__custom_server__custom_tool",
        result: { ok: true, count: 2 },
      },
    });
    expect(converted[0]?.payload.result).not.toHaveProperty("content");
    expect(converted[0]?.payload.result).not.toHaveProperty("_meta");
  });

  it("projects generic Codex MCP plain text envelopes into text results", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generic_text",
        tool_name: "mcp__custom_server__plain_text_tool",
        result: {
          content: [{ type: "text", text: "completed" }],
          structuredContent: null,
        },
        item: {
          type: "mcpToolCall",
          id: "call_generic_text",
          tool: "mcp__custom_server__plain_text_tool",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "call_generic_text",
        result: "completed",
      },
    });
  });

  it("projects generic Codex MCP structuredContent before text fallback", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generic_structured",
        tool_name: "mcp__custom_server__structured_tool",
        result: {
          structuredContent: { answer: 42 },
          content: [{ type: "text", text: "fallback" }],
          _meta: { hidden: true },
        },
        item: {
          type: "mcpToolCall",
          id: "call_generic_structured",
          tool: "mcp__custom_server__structured_tool",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        result: { answer: 42 },
      },
    });
    expect(converted[0]?.payload.result).not.toHaveProperty("_meta");
  });

  it("projects generic Codex MCP multi-text envelopes with deterministic separators", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generic_multitext",
        tool_name: "mcp__custom_server__multi_text_tool",
        result: {
          content: [
            { type: "text", text: "one" },
            { type: "text", text: "two" },
          ],
        },
        item: {
          type: "mcpToolCall",
          id: "call_generic_multitext",
          tool: "mcp__custom_server__multi_text_tool",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        result: "one\n\ntwo",
      },
    });
  });

  it("projects generic Codex MCP rich content envelopes into sanitized items", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generic_rich",
        tool_name: "mcp__custom_server__rich_tool",
        result: {
          content: [
            { type: "text", text: "see image", _meta: { hidden: true } },
            {
              type: "image",
              data: "abc123",
              mimeType: "image/png",
              _meta: { hidden: true },
            },
          ],
          _meta: { hidden: true },
        },
        item: {
          type: "mcpToolCall",
          id: "call_generic_rich",
          tool: "mcp__custom_server__rich_tool",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        result: {
          items: [
            { type: "text", text: "see image" },
            { type: "image", data: "abc123", mimeType: "image/png" },
          ],
        },
      },
    });
  });

  it("maps Codex MCP isError result envelopes into failure events without result", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_generic_error",
        tool_name: "mcp__custom_server__error_tool",
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: { message: "bad input" } }),
            },
          ],
        },
        item: {
          type: "mcpToolCall",
          id: "call_generic_error",
          tool: "mcp__custom_server__error_tool",
          status: "completed",
          success: true,
        },
      },
    });

    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      payload: {
        invocation_id: "call_generic_error",
        error: "bad input",
      },
    });
    expect(converted[0]?.payload).not.toHaveProperty("result");
  });

  it("does not project exact envelope-shaped non-MCP Codex dynamic tool results", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const rawEnvelopeLikeResult = {
      content: [{ type: "text", text: JSON.stringify({ should: "stay wrapped" }) }],
      structuredContent: null,
      _meta: { domain: true },
    };

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-non-mcp-envelope",
        item: {
          type: "dynamicToolCall",
          id: "call_non_mcp_envelope",
          name: "custom_dynamic_tool",
          status: "completed",
          result: rawEnvelopeLikeResult,
        },
      },
    });

    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "call_non_mcp_envelope",
        tool_name: "custom_dynamic_tool",
        result: rawEnvelopeLikeResult,
      },
    });
  });

  it("normalizes aliased Browser MCP completion results without circular placeholders", () => {
    const converter = createCodexThreadEventHarness("run-1");
    const browserResultEnvelope = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            url: "https://example.com/",
            result: {
              title: "Example Domain",
              answer: 42,
              href: "https://example.com/",
            },
            tab_id: "tab-run-1",
          }),
        },
      ],
      structuredContent: null,
      _meta: null,
    };

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_run_script",
        turn_id: "turn-browser-2",
        tool_name: "mcp__autobyteus_agent_tools__run_script",
        arguments: {
          tab_id: "tab-run-1",
          script: "() => ({ title: document.title, answer: 42, href: location.href })",
        },
        item: {
          type: "mcpToolCall",
          id: "call_run_script",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__run_script",
          status: "completed",
          success: true,
          result: browserResultEnvelope,
        },
        result: browserResultEnvelope,
      },
    });

    expect(converted).toHaveLength(1);
    expectNoAgentToolsProviderMarkers(converted.map((event) => event.payload));
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      runId: "run-1",
      payload: {
        invocation_id: "call_run_script",
        turn_id: "turn-browser-2",
        tool_name: "run_script",
        arguments: {
          tab_id: "tab-run-1",
          script: "() => ({ title: document.title, answer: 42, href: location.href })",
        },
        result: {
          url: "https://example.com/",
          result: {
            title: "Example Domain",
            answer: 42,
            href: "https://example.com/",
          },
          tab_id: "tab-run-1",
        },
      },
    });
    expect(converted[0]?.payload.result).not.toBe("[Circular]");
    expect(converted[0]?.payload.result).not.toHaveProperty("content");
  });

  it("maps failed local MCP completion events into TOOL_EXECUTION_FAILED with arguments", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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

  it("omits arguments from the captured hosted webSearch placeholder start", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "webSearch",
          id: "ws-placeholder",
          query: "",
          action: { type: "other" },
        },
        turnId: "turn-placeholder",
      },
    });

    expect(converted.map((entry) => entry.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
    ]);
    expect(converted[0]?.payload.metadata).toMatchObject({ tool_name: "search_web" });
    expect(converted[0]?.payload.metadata).not.toHaveProperty("arguments");
    expect(converted[1]?.payload).toMatchObject({
      invocation_id: "ws-placeholder",
      turn_id: "turn-placeholder",
      tool_name: "search_web",
    });
    expect(converted[1]?.payload).not.toHaveProperty("arguments");
  });

  it("emits card-capable identity and name without inventing arguments for an unseen webSearch terminal", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        item: {
          type: "webSearch",
          id: "ws-terminal-placeholder",
          status: "completed",
          query: "",
          action: { type: "other" },
        },
        turnId: "turn-terminal-placeholder",
      },
    });

    expect(converted.map((entry) => entry.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(converted[0]?.payload).toMatchObject({
      invocation_id: "ws-terminal-placeholder",
      turn_id: "turn-terminal-placeholder",
      tool_name: "search_web",
    });
    expect(converted[0]?.payload).not.toHaveProperty("arguments");
  });

  it("fans out successful webSearch completions into terminal success and segment end", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        item: {
          type: "mcpToolCall",
          id: "call_send_message",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__send_message_to",
          arguments: {
            recipient_address: "pong",
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
        id: "call_send_message",
        segment_type: "tool_call",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_address: "pong",
            content: "hello",
          },
        },
      },
    });
    expect(converted[0].payload).not.toHaveProperty("item");
    expect(converted[1]).toMatchObject({
      runId: "run-1",
      payload: {
        item: {
          tool: "send_message_to",
        },
        invocation_id: "call_send_message",
        tool_name: "send_message_to",
        arguments: {
          recipient_address: "pong",
          content: "hello",
        },
      },
    });
  });

  it("maps successful Agent Tools MCP send_message_to completions into canonical terminal success", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_send_message",
        turn_id: "turn-1",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_address: "pong",
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
          recipient_address: "pong",
          content: "hello",
        },
        result: "Delivered message to pong.",
      },
    });
  });

  it("normalizes non-send Agent Tools MCP completions into canonical tool lifecycle events", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      params: {
        invocation_id: "call_send_message_failed",
        turn_id: "turn-1",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_address: "missing",
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
          recipient_address: "missing",
          content: "hello",
        },
        error: "Recipient missing was not found.",
      },
    });
  });

  it("sanitizes Agent Tools MCP ITEM_COMPLETED segment-end payloads", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-send-message-segment-end",
        item: {
          type: "mcpToolCall",
          id: "call_send_message_segment_end",
          server: "autobyteus_agent_tools",
          tool: "mcp__autobyteus_agent_tools__send_message_to",
          arguments: {
            recipient_address: "pong",
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
        id: "call_send_message_segment_end",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_address: "pong",
            content: "hello",
          },
        },
      },
    });
    expect(converted[0].payload).not.toHaveProperty("item");
  });

  it("maps generic dynamic tool completions into terminal success and segment end", () => {
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-custom-dynamic",
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-custom-dynamic-text",
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
    const converter = createCodexThreadEventHarness("run-1", "/tmp/workspace");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        turnId: "turn-file-change",
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
    const converter = createCodexThreadEventHarness("run-1", "/tmp/workspace");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-file-change",
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
    const converter = createCodexThreadEventHarness("run-1");

    const converted = converter.emitThroughThread({
      method: CodexThreadEventName.ITEM_STARTED,
      params: {
        turnId: "turn-edit-file",
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
