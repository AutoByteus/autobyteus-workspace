import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";
import { ClaudeCompactionOperationTracker } from "../../src/agent-execution/backends/claude/session/claude-compaction-operation-tracker.js";
import { ClaudeSessionEventConverter } from "../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { RuntimeMemoryEventAccumulator } from "../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../src/agent-memory/store/external-runtime-memory-writer.js";
import { LocalMemoryRunViewProjectionProvider } from "../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { buildHistoricalReplayEvents } from "../../src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunViewProjectionService } from "../../src/run-history/services/agent-run-view-projection-service.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";

it("probe", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "probe-"));
  const memoryDir = path.join(root, "memory");
  await fs.mkdir(memoryDir);
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  const acc = new RuntimeMemoryEventAccumulator({ runId: "r", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
  const tracker = new ClaudeCompactionOperationTracker();
  const ctx = { turnId: "turn-1", sessionId: "sess-1" };
  const events = [
    ...tracker.observeFrame({ type: "system", subtype: "status", status: "compacting", uuid: "op-1" }, ctx),
    ...tracker.observeFrame({ type: "system", subtype: "status", status: null, compact_result: "failed", compact_error: "API Error: Request was aborted.", uuid: "f-1" }, ctx),
  ];
  const conv = new ClaudeSessionEventConverter("r");
  for (const e of events) for (const re of conv.convert(e)) acc.recordRunEvent(re);
  const traces = new RunMemoryFileStore(memoryDir).listTurnRawTracesOrdered();
  console.log("TRACES", JSON.stringify(traces.map((t) => ({ id: t.id, turn: t.turnId, seq: t.seq, ts: t.ts, tr: t.toolResult })), null, 1));
  const replay = buildHistoricalReplayEvents(traces as never);
  console.log("REPLAY", JSON.stringify(replay, null, 1));
  const proj = await new LocalMemoryRunViewProjectionProvider(root).buildProjection({ source: { runId: "r", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, workspaceRootPath: null, memoryDir, platformRunId: null, metadata: null } });
  console.log("PROVIDER_ACTIVITY_COUNT", proj!.activities.length);
  const svc = new AgentRunViewProjectionService(root);
  const meta = { runId: "r", agentDefinitionId: "a", workspaceRootPath: "/tmp", memoryDir, llmModelIdentifier: "haiku", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: null };
  const sp = await svc.getProjectionFromMetadata({ runId: "r", metadata: meta });
  console.log("SERVICE_ACTIVITIES", JSON.stringify(sp.activities.map((a: any) => ({ id: a.activityId, phase: a.phase }))));
  const page = await svc.getActiveTracePageFromMetadata({ runId: "r", metadata: meta, canonicalSubject: "run:r" });
  console.log("BROWSE_VISUALS", JSON.stringify(page.events.flatMap((e: any) => e.visuals.map((v: any) => ({ kind: v.kind, phase: v.phase, activityId: v.activityId })))));
});
