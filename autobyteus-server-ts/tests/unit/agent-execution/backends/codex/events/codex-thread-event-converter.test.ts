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
});
