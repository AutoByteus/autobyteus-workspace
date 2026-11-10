/** autobyteus-338 DS-002: the native backend reports its run's background tasks (real BackgroundProcessManager and commands). */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBackgroundManager } from "autobyteus-ts";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AutoByteusAgentRunBackend } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";
import { toAgentBackgroundTask } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-background-task-reporter.js";
import { stubAutoByteusRunTools } from "../../../../helpers/agent-tool-mcp-run-sessions-stub.js";

const task = { pid: 41, command: "pnpm build", effectiveCwd: "/w", outputFile: "/tmp/x.log", startedAt: "2026-11-10T10:00:00.000Z" };
const end = (outcome: object) => ({ pid: 41, command: "pnpm build", outcome, durationMs: 5, outputFile: "/tmp/x.log", lastLines: "" }) as never;

describe("toAgentBackgroundTask", () => {
  it("maps a native task to the runtime-neutral vocabulary (panel status and summary)", () => {
    expect(toAgentBackgroundTask({ task, end: null })).toEqual({ taskId: "41", kind: "shell", description: "pnpm build",
      command: "pnpm build", status: "running", summary: null, startedAt: task.startedAt });
    expect([{ exitCode: 0 }, { exitCode: 2 }, { signal: "SIGTERM" }, { error: "lost" }]
      .map((outcome) => toAgentBackgroundTask({ task, end: end(outcome) })).map((t) => [t.status, t.summary]))
      .toEqual([["completed", "exit code 0"], ["failed", "exit code 2"], ["stopped", "signal SIGTERM"], ["failed", "lost"]]);
  });
});

const suite = process.platform === "win32" ? describe.skip : describe;
const cleanups: Array<() => Promise<unknown>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

suite("AutoByteusAgentRunBackend background tasks", () => {
  it("publishes BACKGROUND_TASK_UPDATED for start and end, reports running tasks and hands over each end once", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "native-bg-"));
    const agentContext = { agentId: `native-bg-${process.pid}` };
    const manager = getBackgroundManager(agentContext);
    cleanups.push(() => manager.scope.close(), () => manager.stopAllForRunEnd(), async () => fs.rmSync(cwd, { recursive: true, force: true }));
    const context = new AgentRunContext({ runId: "agent-1",
      config: new AgentRunConfig({ runtimeKind: RuntimeKind.AUTOBYTEUS, agentDefinitionId: "def-1", llmModelIdentifier: "model-1", autoExecuteTools: false }), runtimeContext: null });
    const backend = new AutoByteusAgentRunBackend(context, {
      agentId: "agent-1", getCompactionRecovery: () => null, authorizeCompactionRetry: () => "stale",
      revokeUnusedCompactionRetry: () => "stale", currentStatus: "idle", context: agentContext as never,
    }, { isActive: () => true, removeAgent: vi.fn().mockResolvedValue(true), tools: stubAutoByteusRunTools() });
    const events: AgentRunEvent[] = [];
    backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
    expect(backend.backgroundTaskInspection).toEqual({ kind: "event-stream" });
    expect(backend.hasRunningBackgroundTasks()).toBe(false);

    const { started } = await manager.run("sleep 0.3; exit 3", cwd, { background: true });
    expect(backend.hasRunningBackgroundTasks()).toBe(true);
    expect(backend.backgroundTaskNotices.kind).toBe("platform");
    if (backend.backgroundTaskNotices.kind !== "platform") return;
    expect(backend.backgroundTaskNotices.listRunning().map((t) => t.pid)).toEqual([started[0]!.pid]);

    const updates = () => events.filter((e) => e.eventType === AgentRunEventType.BACKGROUND_TASK_UPDATED).map((e) => [e.payload.status, e.payload.summary]);
    await vi.waitFor(() => expect(updates()).toEqual([["running", null], ["failed", "exit code 3"]]), { timeout: 5000 });
    expect(backend.hasRunningBackgroundTasks()).toBe(false);
    expect(backend.backgroundTaskNotices.takeUnreportedEnds().map((e) => [e.pid, e.outcome])).toEqual([[started[0]!.pid, { exitCode: 3 }]]);
    expect(backend.backgroundTaskNotices.takeUnreportedEnds()).toEqual([]);
  });
});
