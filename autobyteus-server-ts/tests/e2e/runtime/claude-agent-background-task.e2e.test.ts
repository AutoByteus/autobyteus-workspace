import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import {
  LIVE_CLAUDE_TURN_TIMEOUT_MS,
  closeClaudeLiveAgentHarness,
  createClaudeLiveAgentHarness,
  findClaudeCliProcessIds,
  findProcessIds,
  useStandaloneClaudeCli,
  waitForCondition,
  waitForStreamMessage,
  type ClaudeLiveAgentHarness,
  type StreamMessage,
} from "../helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const cliCandidates = resolveClaudeCliExecutableCandidates();
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeLiveClaudeRuntime =
  liveClaudeTestsEnabled && cliCandidates.length > 0 ? describe : describe.skip;
const BACKGROUND_COMMAND_SECONDS = 20;
const cases = cliCandidates.map((candidate) => [candidate.label, candidate] as const);

type BackgroundTaskSnapshot = {
  task_id: string;
  kind: string;
  description: string;
  command: string | null;
  status: string;
  summary: string | null;
  started_at: string;
};

const isType = (type: string) => (message: StreamMessage) => message.type === type;

/** Every BACKGROUND_TASK_UPDATED payload streamed so far (from `fromIndex`), in order. */
const taskSnapshots = (harness: ClaudeLiveAgentHarness, fromIndex = 0): BackgroundTaskSnapshot[] =>
  harness.messages
    .slice(fromIndex)
    .filter(isType("BACKGROUND_TASK_UPDATED"))
    .map((message) => message.payload as unknown as BackgroundTaskSnapshot);

const snapshotsOf = (harness: ClaudeLiveAgentHarness, taskId: string): BackgroundTaskSnapshot[] =>
  taskSnapshots(harness).filter((snapshot) => snapshot.task_id === taskId);

const latestSnapshotOf = (harness: ClaudeLiveAgentHarness, taskId: string): BackgroundTaskSnapshot | undefined =>
  snapshotsOf(harness, taskId).at(-1);

/** Waits for the first running snapshot and returns it (AC-007: description, kind, running). */
const waitForRunningTask = async (harness: ClaudeLiveAgentHarness, fromIndex: number): Promise<BackgroundTaskSnapshot> => {
  const index = await waitForStreamMessage(
    harness,
    (message) => message.type === "BACKGROUND_TASK_UPDATED" && message.payload?.status === "running",
    "running BACKGROUND_TASK_UPDATED",
    { fromIndex },
  );
  const snapshot = harness.messages[index]!.payload as unknown as BackgroundTaskSnapshot;
  expect(snapshot.summary).toBeNull();
  expect(Number.isNaN(Date.parse(snapshot.started_at))).toBe(false);
  return snapshot;
};

const waitForTaskStatus = (harness: ClaudeLiveAgentHarness, taskId: string, status: string, timeoutMs?: number) =>
  waitForStreamMessage(
    harness,
    (message) =>
      message.type === "BACKGROUND_TASK_UPDATED" &&
      message.payload?.task_id === taskId &&
      message.payload?.status === status,
    `${status} BACKGROUND_TASK_UPDATED for ${taskId}`,
    { timeoutMs },
  );

/** Statuses a task went through, collapsing repeated snapshots (e.g. a summary filled in later). */
const statusPath = (snapshots: readonly BackgroundTaskSnapshot[]): string[] =>
  snapshots.map((snapshot) => snapshot.status).filter((status, index, all) => index === 0 || all[index - 1] !== status);

const sendAndAwaitTurn = async (harness: ClaudeLiveAgentHarness, content: string): Promise<{ startIndex: number; completedIndex: number }> => {
  const startIndex = harness.messages.length;
  sendE2eSendMessageCommand(harness.socket, { content });
  const completedIndex = await waitForStreamMessage(harness, isType("TURN_COMPLETED"), `TURN_COMPLETED for "${content.slice(0, 40)}"`, { fromIndex: startIndex });
  return { startIndex, completedIndex };
};

/** A long foreground command the CLI runs as-is (it rejects foreground `sleep N; …` chains). */
const longForegroundCommand = (seconds: number, marker: string): string =>
  `python3 -c "import time; time.sleep(${String(seconds)}); print('${marker}')"`;

describeLiveClaudeRuntime("Claude runtime background tasks (live E2E)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
  });

  const startHarness = async (label: string) => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), `claude-live-${label}-`));
    cleanups.push(() => fs.rm(workspaceRoot, { recursive: true, force: true }));
    const harness = await createClaudeLiveAgentHarness({ runId: `claude-live-${label}-${randomUUID()}`, workspaceRoot });
    cleanups.push(() => closeClaudeLiveAgentHarness(harness));
    return { harness, workspaceRoot };
  };

  it.each(cases)(
    "shows a background Bash command as running, then completed with its summary, alongside the unchanged completion notice and Claude-initiated turn (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness, workspaceRoot } = await startHarness("background-task");
      const markerPath = path.join(workspaceRoot, "marker");
      const command = `sleep ${String(BACKGROUND_COMMAND_SECONDS)}; echo done > ${markerPath}`;

      sendE2eSendMessageCommand(harness.socket, {
        content: [
          "Use the Bash tool with run_in_background set to true to run this exact command:",
          command,
          "Do not wait for it. Reply only STARTED and end your turn.",
          "When you are later notified that it finished, reply with the content of the marker file.",
        ].join("\n"),
      });

      // AC-007: the task is listed as a running shell task while the first turn ends without it.
      const running = await waitForRunningTask(harness, 0);
      expect(running.kind).toBe("shell");
      expect(running.description.length).toBeGreaterThan(0);
      const firstCompleted = await waitForStreamMessage(harness, isType("TURN_COMPLETED"), "first TURN_COMPLETED");
      expect(fsSync.existsSync(markerPath), "the command is still running when the first turn ends").toBe(false);
      expect(latestSnapshotOf(harness, running.task_id)?.status).toBe("running");
      const bashStart = harness.messages.find((message) =>
        message.type === "TOOL_EXECUTION_STARTED" &&
        message.payload?.tool_name === "Bash" &&
        String((message.payload?.arguments as Record<string, unknown> | undefined)?.command ?? "").includes(markerPath));
      expect((bashStart?.payload?.arguments as Record<string, unknown> | undefined)?.run_in_background).toBe(true);
      // REQ-002/REQ-007: the task carries the exact command of its Bash call (possibly from a follow-up snapshot).
      const bashCommand = (bashStart?.payload?.arguments as Record<string, unknown> | undefined)?.command;
      expect(bashCommand).toContain(markerPath);
      await waitForCondition(() => latestSnapshotOf(harness, running.task_id)?.command === bashCommand, "snapshot with the Bash command", 15_000);

      // BEH-006 preserved: notice and a turn Claude starts itself.
      const noticeIndex = await waitForStreamMessage(
        harness,
        (message, index) => index > firstCompleted && message.type === "SYSTEM_TASK_NOTIFICATION",
        "background completion notice",
      );
      const notice = harness.messages[noticeIndex]!;
      expect(notice.payload?.sender_id).toBe("system.claude_background_task");
      expect(String(notice.payload?.content)).toMatch(/^Background task completed: .+ \(completed\)$/u);
      await waitForStreamMessage(
        harness,
        (message, index) => index > noticeIndex && message.type === "TURN_COMPLETED",
        "Claude-initiated TURN_COMPLETED",
      );

      // AC-008: the same entry ends completed with the reported summary, before the notice.
      const completedIndex = await waitForTaskStatus(harness, running.task_id, "completed");
      expect(completedIndex).toBeLessThan(noticeIndex);
      const final = latestSnapshotOf(harness, running.task_id)!;
      expect(final).toMatchObject({ task_id: running.task_id, kind: "shell", command: bashCommand, status: "completed", started_at: running.started_at });
      expect(final.summary ?? "").not.toBe("");
      expect(statusPath(snapshotsOf(harness, running.task_id))).toEqual(["running", "completed"]);
      // REQ-008: only the background task is listed.
      expect(new Set(taskSnapshots(harness).map((snapshot) => snapshot.task_id))).toEqual(new Set([running.task_id]));
      expect(harness.messages.some((message) => message.type === "TODO_LIST_UPDATE")).toBe(false);

      expect(fsSync.readFileSync(markerPath, "utf-8").trim()).toBe("done");
      const reportText = harness.messages
        .slice(noticeIndex)
        .filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => String(message.payload?.delta ?? ""))
        .join("");
      expect(reportText.toLowerCase()).toContain("done");
      expect(JSON.stringify(harness.messages)).not.toContain("[killed]");
      expect(harness.sessionManager.requireRunSession(harness.runContext.runId).processState).toBe("OPEN");
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 2,
  );

  it.each(cases)(
    "shows a failing background command as failed with the CLI's exit-code summary (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("background-fail");
      await sendAndAwaitTurn(harness, [
        "Use the Bash tool with run_in_background set to true to run exactly: sleep 3; echo failing; exit 3",
        "Do not wait for it. Reply only STARTED and end your turn.",
      ].join("\n"));
      const running = taskSnapshots(harness).find((snapshot) => snapshot.status === "running");
      expect(running?.kind).toBe("shell");

      await waitForTaskStatus(harness, running!.task_id, "failed");
      await waitForCondition(() => (latestSnapshotOf(harness, running!.task_id)?.summary ?? null) !== null, "failed summary", 15_000);
      expect(latestSnapshotOf(harness, running!.task_id)?.summary).toMatch(/exit code 3/u);
      // REQ-002: the failed entry keeps the command of its Bash call.
      expect(latestSnapshotOf(harness, running!.task_id)?.command ?? "").toMatch(/sleep 3; echo failing; exit 3/u);
      expect(statusPath(snapshotsOf(harness, running!.task_id))).toEqual(["running", "failed"]);
      const noticeIndex = await waitForStreamMessage(harness, isType("SYSTEM_TASK_NOTIFICATION"), "failure notice");
      expect(String(harness.messages[noticeIndex]!.payload?.content)).toMatch(/\(failed\)$/u);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 2,
  );

  it.each(cases)(
    "lists no entry for foreground work: a foreground Bash command emits CLI task frames but stays only a tool call (REQ-008) (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("foreground-bash");
      const marker = `FG_${randomUUID().slice(0, 8)}`;
      // AutoByteus disallows Claude's Agent/Task/Workflow tools, so foreground Bash is the reachable
      // foreground task: the CLI reports it with task_started (is_backgrounded false) and task_notification.
      await sendAndAwaitTurn(harness, `Use the Bash tool (not in the background) to run exactly: ${longForegroundCommand(3, marker)}. Then reply DONE.`);
      const bashCall = harness.messages.find((message) =>
        message.type === "TOOL_EXECUTION_STARTED" &&
        message.payload?.tool_name === "Bash" &&
        String((message.payload?.arguments as Record<string, unknown> | undefined)?.command ?? "").includes(marker));
      expect(bashCall, "the foreground command ran as a tool call").toBeDefined();
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      expect(taskSnapshots(harness)).toEqual([]);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS,
  );

  it.each(cases)(
    "keeps the entry running across a turn-level Stop and marks it stopped when the run is terminated (MP-003, AC-011) (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("background-stop-terminate");
      const marker = `BG_${randomUUID().slice(0, 8)}`;
      const fgMarker = `FG_${randomUUID().slice(0, 8)}`;
      cleanups.push(async () => { for (const pid of [...findProcessIds(marker), ...findProcessIds(fgMarker)]) process.kill(pid, "SIGTERM"); });
      await sendAndAwaitTurn(harness, [
        `Use the Bash tool with run_in_background set to true to run exactly: sleep 120; echo ${marker}`,
        "Do not wait for it. Reply only STARTED and end your turn.",
      ].join("\n"));
      const running = taskSnapshots(harness).find((snapshot) => snapshot.status === "running");
      expect(running?.kind).toBe("shell");

      // Turn-level Stop during a foreground command: the background task keeps running.
      const stopStart = harness.messages.length;
      sendE2eSendMessageCommand(harness.socket, {
        content: `Use the Bash tool (not in the background) to run exactly: ${longForegroundCommand(60, fgMarker)}`,
      });
      await waitForCondition(() => findProcessIds(fgMarker).length > 0, "foreground command is running", LIVE_CLAUDE_TURN_TIMEOUT_MS);
      harness.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `client_interrupt_${randomUUID()}` } }));
      await waitForStreamMessage(harness, isType("TURN_INTERRUPTED"), "TURN_INTERRUPTED", { fromIndex: stopStart });
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      expect(latestSnapshotOf(harness, running!.task_id)?.status, "Stop leaves the background task running").toBe("running");
      expect(findProcessIds(marker).length, "the background command still runs after Stop").toBeGreaterThan(0);

      // Run terminate ends the process; the entry becomes stopped before terminate() resolves.
      const sessionId = harness.session.sessionId;
      const result = await harness.agentRun.terminate();
      expect(result.accepted).toBe(true);
      await waitForTaskStatus(harness, running!.task_id, "stopped", 5_000);
      expect(statusPath(snapshotsOf(harness, running!.task_id))).toEqual(["running", "stopped"]);
      // REQ-002: the command survives the turn-level Stop and the terminate.
      expect(latestSnapshotOf(harness, running!.task_id)?.command ?? "").toContain(`echo ${marker}`);
      // The interrupted foreground command never became an entry.
      expect(new Set(taskSnapshots(harness).map((snapshot) => snapshot.task_id))).toEqual(new Set([running!.task_id]));
      await waitForCondition(() => findClaudeCliProcessIds(sessionId).length === 0, "Claude CLI process exited", 20_000);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 2,
  );

  it.each(cases)(
    "marks a running entry stopped when the Claude CLI process dies unexpectedly (AC-011) (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("background-crash");
      const marker = `BG_${randomUUID().slice(0, 8)}`;
      cleanups.push(async () => { for (const pid of findProcessIds(marker)) process.kill(pid, "SIGTERM"); });
      await sendAndAwaitTurn(harness, [
        `Use the Bash tool with run_in_background set to true to run exactly: sleep 90; echo ${marker}`,
        "Do not wait for it. Reply only STARTED and end your turn.",
      ].join("\n"));
      const running = taskSnapshots(harness).find((snapshot) => snapshot.status === "running");
      expect(running).toBeDefined();
      const pids = findClaudeCliProcessIds(harness.session.sessionId);
      expect(pids).toHaveLength(1);
      process.kill(pids[0]!, "SIGKILL");
      await waitForTaskStatus(harness, running!.task_id, "stopped", 20_000);
      expect(statusPath(snapshotsOf(harness, running!.task_id))).toEqual(["running", "stopped"]);
      expect(latestSnapshotOf(harness, running!.task_id)?.command ?? "").toContain(`echo ${marker}`);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS,
  );

  it.each(cases)(
    "shows the command of a foreground Bash the CLI moves to the background after it started (UNK-001) (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      // Operator-set CLI switches pass through to the CLI process (no AutoByteus CLI policy env).
      vi.stubEnv("CLAUDE_AUTO_BACKGROUND_TASKS", "1");
      vi.stubEnv("CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS", "5000");
      const { harness } = await startHarness("auto-background");
      const marker = `AUTO_BG_${randomUUID().slice(0, 8)}`;
      cleanups.push(async () => { for (const pid of findProcessIds(marker)) process.kill(pid, "SIGTERM"); });
      await sendAndAwaitTurn(harness, [
        `Use the Bash tool in the foreground (do not set run_in_background, do not set a timeout) to run exactly: ${longForegroundCommand(20, marker)}`,
        "Then reply with what the tool returned and end your turn.",
      ].join("\n"));
      const bashCommand = (harness.messages.find((message) =>
        message.type === "TOOL_EXECUTION_STARTED" &&
        message.payload?.tool_name === "Bash" &&
        String((message.payload?.arguments as Record<string, unknown> | undefined)?.command ?? "").includes(marker))
        ?.payload?.arguments as Record<string, unknown> | undefined)?.command;
      expect(bashCommand, "the foreground Bash call").toEqual(expect.stringContaining(marker));

      const first = taskSnapshots(harness)[0];
      expect(first, "the auto-backgrounded command is listed").toBeDefined();
      // task_started (foreground) carried the tool_use id before the move, so the first snapshot has the command.
      expect(first).toMatchObject({ kind: "shell", status: "running", command: bashCommand });
      await waitForTaskStatus(harness, first!.task_id, "completed", 60_000);
      expect(snapshotsOf(harness, first!.task_id).every((snapshot) => snapshot.command === bashCommand)).toBe(true);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 2,
  );
});
