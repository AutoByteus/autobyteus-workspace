// autobyteus-609 D-D2: a tool call the user stopped reads "Stopped" when the run is read back from the node, as it does
// live. Each writer stores its interruption its own way; the replay reads one rule (`isInterruptedToolResult`).
// Production: the writers (the node's runtime memory accumulator and trace sequencer, fed by the real Codex converter;
// the native `MemoryManager`), the memory file stores, `LocalMemoryRunViewProjectionProvider` (every runtime's history),
// the replay, the conversation and activity transformers, and the earlier-trace page. Nothing is doubled.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { ToolInvocation } from "autobyteus-ts/agent/tool-invocation.js";
import { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventName } from "../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { RuntimeMemoryEventAccumulator } from "../../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { LocalMemoryRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import type { RunProjectionToolActivityEntry } from "../../../../src/run-history/projection/run-projection-types.js";
import type { EventMonitorToolCardVisual } from "../../../../src/run-history/projection/event-monitor-active-trace-page-types.js";
import { createCodexThreadEventHarness } from "../../../fixtures/codex-thread-event-harness.js";

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
const newMemoryDir = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stopped-tool-read-back-"));
  tempDirs.push(root);
  const memoryDir = path.join(root, "run-1");
  await fs.mkdir(memoryDir, { recursive: true });
  return memoryDir;
};

/** The run read back from the node: its projection (conversation, activities) and its earlier-trace page. */
const readBack = async (memoryDir: string, runtimeKind: RuntimeKind) => {
  const metadata: AgentRunMetadata = {
    runId: "run-1", agentDefinitionId: "agent-def-1", workspaceRootPath: "/tmp/workspace", memoryDir, llmModelIdentifier: "m",
    llmConfig: null, autoExecuteTools: true, runtimeKind, platformAgentRunId: null,
  };
  const source = { runId: "run-1", runtimeKind, workspaceRootPath: "/tmp/workspace", memoryDir, platformRunId: null, metadata };
  const provider = new LocalMemoryRunViewProjectionProvider("/unused");
  const projection = await provider.buildProjection({ source });
  const page = await provider.buildActiveTracePage({ source, subjectFingerprint: "subject", beforeCursor: null });
  const statuses = (invocationId: string) => ({
    conversation: projection.conversation.find((entry) => entry.invocationId === invocationId)?.toolStatus,
    activity: projection.activities
      .find((entry): entry is RunProjectionToolActivityEntry => entry.kind === "tool" && entry.invocationId === invocationId)?.status,
    page: page.events.flatMap((event) => event.visuals)
      .find((visual): visual is EventMonitorToolCardVisual => visual.kind === "tool_card" && visual.invocationId === invocationId)?.statusKey,
  });
  return { projection, statuses };
};
const everywhere = (status: string) => ({ conversation: status, activity: status, page: status });

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent =>
  ({ eventType, runId: "run-1", payload, statusHint: null });

/** Runtime events → segment lifecycle (as the default pipeline) → the node's runtime memory accumulator. */
const recordRuntimeEvents = (memoryDir: string, events: AgentRunEvent[]): void => {
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  const accumulator = new RuntimeMemoryEventAccumulator({ runId: "run-1", writer,
    toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
  const transformer = new AgentSegmentLifecycleEventTransformer();
  const segmentLifecycleState = new AgentSegmentLifecycleState();
  const lifecycleState = new AgentTurnLifecycleState();
  for (const runtimeEvent of events) {
    lifecycleState.observeEvent(runtimeEvent);
    for (const item of transformer.transform({ runContext: {} as never, events: [runtimeEvent], lifecycleState, segmentLifecycleState }))
      accumulator.recordRunEvent(item);
  }
};

const toolStarted = (turnId: string, invocationId: string, command: string) =>
  event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
    turnId, turn_id: turnId, invocation_id: invocationId, tool_name: "run_bash", arguments: { command },
  });

describe("a stopped tool call read back from the node (autobyteus-609 D-D2)", () => {
  it("Codex: a command still running when the user stops the turn reads Stopped; a command that failed reads Failed", async () => {
    const memoryDir = await newMemoryDir();
    const harness = createCodexThreadEventHarness("run-1");
    const notifications = [
      { method: CodexThreadEventName.TURN_STARTED, params: { threadId: "thread-1", turn: { id: "turn-c", status: "inProgress" } } },
      { method: CodexThreadEventName.ITEM_STARTED, params: { threadId: "thread-1", turnId: "turn-c",
        item: { id: "cmd-failed", type: "commandExecution", command: "/bin/bash -lc 'exit 23'", cwd: "/w", status: "inProgress" } } },
      { method: CodexThreadEventName.ITEM_COMPLETED, params: { threadId: "thread-1", turnId: "turn-c",
        item: { id: "cmd-failed", type: "commandExecution", command: "/bin/bash -lc 'exit 23'", cwd: "/w", status: "failed",
          aggregatedOutput: "boom", exitCode: 23 } } },
      { method: CodexThreadEventName.ITEM_STARTED, params: { threadId: "thread-1", turnId: "turn-c",
        item: { id: "cmd-stopped", type: "commandExecution", command: "/bin/bash -lc 'sleep 600'", cwd: "/w", status: "inProgress" } } },
      // As Codex sends it when the user interrupts the turn (shape: tests/fixtures/codex-compaction/codex-interrupt-manual).
      { method: CodexThreadEventName.TURN_COMPLETED, params: { threadId: "thread-1",
        turn: { id: "turn-c", items: [], itemsView: "notLoaded", status: "interrupted", error: null } } },
    ];
    const events = notifications.flatMap((notification) => harness.emitThroughThread(notification));
    expect(events.map((item) => item.eventType)).toContain(AgentRunEventType.TURN_INTERRUPTED);
    recordRuntimeEvents(memoryDir, events);

    const { statuses } = await readBack(memoryDir, RuntimeKind.CODEX_APP_SERVER);
    expect(statuses("cmd-stopped")).toEqual(everywhere("interrupted"));
    expect(statuses("cmd-failed")).toEqual(everywhere("error"));
  });

  it("a runtime that reports the call interrupted (TOOL_EXECUTION_INTERRUPTED, as Claude and Antigravity do) reads Stopped", async () => {
    const memoryDir = await newMemoryDir();
    recordRuntimeEvents(memoryDir, [
      event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }),
      toolStarted("turn-1", "call-interrupted", "sleep 600"),
      event(AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, { turnId: "turn-1", turn_id: "turn-1", invocation_id: "call-interrupted",
        tool_name: "run_bash", reason: "the user stopped the run" }),
      toolStarted("turn-1", "call-failed", "false"),
      event(AgentRunEventType.TOOL_EXECUTION_FAILED, { turnId: "turn-1", turn_id: "turn-1", invocation_id: "call-failed",
        tool_name: "run_bash", error: "exit 1" }),
      event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }),
    ]);

    const { statuses } = await readBack(memoryDir, RuntimeKind.CLAUDE_AGENT_SDK);
    expect(statuses("call-interrupted")).toEqual(everywhere("interrupted"));
    expect(statuses("call-failed")).toEqual(everywhere("error"));
  });

  it.each([
    ["user_interrupt"],
    ["the run was shut down"],
  ])("native AutoByteus: a call open when the turn is interrupted (reason %s) reads Stopped; a failed call reads Failed", async (reason) => {
    const memoryDir = await newMemoryDir();
    // With no agent sub-folder the store writes into the folder it is given: the run's memory folder.
    const manager = new MemoryManager({ store: new FileMemoryStore(memoryDir, "run-1", { agentRootSubdir: "" }) });
    const turnId = manager.startTurn();
    manager.ingestToolIntent(new ToolInvocation("run_bash", { command: "false" }, "native-failed", turnId), turnId);
    manager.ingestToolResults([new ToolResultEvent("run_bash", null, "native-failed", "exit 1", { command: "false" }, turnId)], turnId);
    manager.ingestToolIntent(new ToolInvocation("run_bash", { command: "sleep 600" }, "native-stopped", turnId), turnId);
    manager.finalizePendingToolCallsForTurn(turnId, reason, { appendToWorkingContext: false });

    const { statuses } = await readBack(memoryDir, RuntimeKind.AUTOBYTEUS);
    expect(statuses("native-stopped")).toEqual(everywhere("interrupted"));
    expect(statuses("native-failed")).toEqual(everywhere("error"));
  });

  it("a stored result with only an interruption's error text reads Stopped; a denial stays denied", async () => {
    const memoryDir = await newMemoryDir();
    const records = [
      { id: "c1", trace_type: "tool_call", tool_call_id: "error-only", tool_name: "run_bash", tool_args: {}, turn_id: "t", seq: 1, ts: 1 },
      { id: "r1", trace_type: "tool_result", tool_call_id: "error-only", tool_name: "run_bash", tool_result: null,
        tool_error: "Tool execution interrupted.", source_event: "LegacyWriter", turn_id: "t", seq: 2, ts: 2 },
      { id: "c2", trace_type: "tool_call", tool_call_id: "denied", tool_name: "run_command", tool_args: {}, turn_id: "t", seq: 3, ts: 3 },
      { id: "r2", trace_type: "tool_result", tool_call_id: "denied", tool_name: "run_command",
        tool_result: { status: "denied", provider_state: "ERROR" }, tool_error: "user_interrupt",
        source_event: AgentRunEventType.TOOL_DENIED, turn_id: "t", seq: 4, ts: 4 },
    ];
    await fs.writeFile(path.join(memoryDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
      records.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");

    const { statuses } = await readBack(memoryDir, RuntimeKind.AUTOBYTEUS);
    expect(statuses("error-only")).toEqual(everywhere("interrupted"));
    expect(statuses("denied")).toEqual(everywhere("denied"));
  });
});
