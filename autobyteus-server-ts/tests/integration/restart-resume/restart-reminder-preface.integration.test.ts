/**
 * autobyteus-448 DS-004 with the real reminder service, notice slot and AgentRun over a fake backend: after a
 * non-update restart the run's next input carries the restart reminder in front of it (one dispatch, no extra turn),
 * the run publishes it as its system notice, and the reminder is removed. Also the `hasRunningBackgroundTasks()` facade.
 * Temporary data root only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunPlatformNotices } from "../../../src/agent-execution/domain/agent-run-platform-notices.js";
import type { AgentRunBackendInputDispatch } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RestartReminderService } from "../../../src/restart-resume/restart-reminder-service.js";
import { readRestartReminderRecord, restartReminderRecordPath } from "../../../src/restart-resume/restart-reminder-record.js";

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 20 }))); });

const createRun = (reminders: RestartReminderService, background: { running: boolean }) => {
  const context = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, agentDefinitionId: "def", llmModelIdentifier: "m",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: null }),
    runtimeContext: null,
  });
  let turns = 0;
  const dispatchUserInput = vi.fn(async (_dispatch: AgentRunBackendInputDispatch) => ({ forwarded: true as const, turnId: `turn-${++turns}` }));
  const backend = {
    runId: "run-1", runtimeKind: context.config.runtimeKind,
    compactionRecovery: { kind: "unsupported" } as const,
    backgroundTaskInspection: { kind: "event-stream" as const, current: () => (background.running
      ? [{ taskId: "1", kind: "shell" as const, description: "x", command: "x", status: "running" as const, summary: null, endReason: null, exitCode: null, startedAt: "2026-11-17T10:00:00.000Z" }] : []) },
    backgroundTaskNotices: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "unsupported" },
    getContext: () => context, getPlatformAgentRunId: () => "run-1", isActive: () => true,
    getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
    subscribeToSourceEventBatches: () => () => undefined,
    dispatchUserInput, approveToolInvocation: vi.fn(), interrupt: vi.fn(), terminate: vi.fn(),
    applyDefinitionTools: vi.fn(), getToolNames: () => [],
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context, backend: backend as never, commandObservers: [], inputPreface: new AgentRunPlatformNotices([reminders]),
  });
  const published: AgentRunEvent[] = [];
  run.subscribeToEvents((event) => { published.push(event); });
  return { run, dispatchUserInput, published };
};

describe("restart reminder on the run's next input", () => {
  it("rides the next input once, is published as the run's system notice and is removed", async () => {
    const appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "restart-reminder-preface-"));
    dirs.push(appDataDir);
    const recordPath = restartReminderRecordPath(appDataDir);
    const reminders = new RestartReminderService({ recordPath });
    await reminders.add([{ root: { rootSubjectKind: "agent", rootRunId: "run-1" }, agentRunId: "run-1", place: "host",
      cause: "unexpected_stop", version: "1.5.14", restartedAt: "2026-11-17T22:20:05.000Z", interruptedTurn: false }]);
    const background = { running: true };
    const { run, dispatchUserInput, published } = createRun(reminders, background);
    expect(run.hasRunningBackgroundTasks()).toBe(true);
    background.running = false;
    expect(run.hasRunningBackgroundTasks()).toBe(false);

    await run.postUserMessage(new AgentInputUserMessage("Is the build done?", SenderType.USER, null, {}));
    await vi.waitFor(() => expect(dispatchUserInput).toHaveBeenCalledTimes(1));
    const message = dispatchUserInput.mock.calls[0]![0].message;
    expect(message.content.startsWith("[Platform notice — application restarted]")).toBe(true);
    expect(message.content).toContain("(reason: an unexpected stop (a crash, a forced quit or a power loss)).");
    expect(message.content.endsWith("\n\nIs the build done?")).toBe(true);
    expect(readPlatformInputPreface(message.metadata)).toMatchObject({ senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: "Is the build done?" });
    await vi.waitFor(() => expect(published.filter((e) => e.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION)).toHaveLength(1));
    expect(published.find((e) => e.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION)!.payload)
      .toMatchObject({ sender_id: RESTART_RESUME_NOTICE_SENDER_ID, turn_id: "turn-1" });
    await vi.waitFor(async () => expect(await readRestartReminderRecord(recordPath)).toEqual({ kind: "missing" }));

    // Delivered once: no later input can take it again.
    expect(await reminders.takePreface(run)).toBeNull();
  });
});
