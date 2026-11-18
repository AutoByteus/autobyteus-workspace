/**
 * Native (AutoByteus) background tasks with real models (autobyteus-338). The real studio server runs in process and
 * the run is driven through GraphQL and the agent WebSocket as the desktop app does. The requirement's definition of
 * success, with a real model: the agent starts two builds in the background, checks one build's progress once, ends
 * its turn without polling, and is woken by one notice naming both builds with their exit codes and last lines, after
 * which it reports both results. The builds run until the test releases them after the first turn (a release file),
 * so they end together however far apart the model started them (ends seconds apart are separate notices, REQ-004).
 *
 * Cases (each needs its provider key; a missing key is a skip, never a pass):
 *   BGT-LIVE-ANTHROPIC  claude-sonnet-5-5 (override BACKGROUND_TASK_LIVE_ANTHROPIC_MODEL)
 *   BGT-LIVE-OPENAI     gpt-5.4-mini (override BACKGROUND_TASK_LIVE_OPENAI_MODEL)
 * Each checks: run_in_background starts (< 2 s each); the progress read uses the start result's outputFile with an
 * ordinary command (ASM-002: records whether it was `tail`); no polling in the first turn; exactly one notice naming
 * both pids with exit code 0 and 1 and their last lines; the notice starts a turn that reports both results.
 *
 * Gate: RUN_NATIVE_BACKGROUND_TASK_LIVE_E2E=1 with the provider keys in the test vault (AUTOBYTEUS_TEST_VAULT, see
 * TESTING.md#test-vault). Uses real credits (a few short turns per case). Run with a clean environment:
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault \
 *     RUN_NATIVE_BACKGROUND_TASK_LIVE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-background-task-live.e2e.test.ts --no-watch
 * Optional BACKGROUND_TASK_E2E_EVIDENCE_DIR keeps per-case JSON (tool calls, notice, replies, frame timeline).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { BACKGROUND_TASK_NOTICE_HEADER } from "../../../src/background-task-notices/services/background-task-notice-builder.js";
import { requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";
import { NativeRuntimeLiveHarness, isRecord, wait, type Json, type RunSession } from "../helpers/native-runtime-live-harness.js";

const ENABLED = process.env.RUN_NATIVE_BACKGROUND_TASK_LIVE_E2E === "1" && process.platform !== "win32";
const describeLive = ENABLED ? describe : describe.skip;
const EVIDENCE_DIR = process.env.BACKGROUND_TASK_E2E_EVIDENCE_DIR?.trim() || null;
const STEP_TIMEOUT_MS = 300_000;
const NOTICE_SENDER = "system.background_task_notifier";
const RETIRED_TOOLS = ["start_background_process", "get_background_processes", "get_process_output", "stop_background_process"];

const CASES = [
  { id: "BGT-LIVE-ANTHROPIC", providerId: "ANTHROPIC", secret: "provider.anthropic.api-key",
    model: process.env.BACKGROUND_TASK_LIVE_ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5" },
  { id: "BGT-LIVE-OPENAI", providerId: "OPENAI", secret: "provider.openai.api-key",
    model: process.env.BACKGROUND_TASK_LIVE_OPENAI_MODEL?.trim() || "gpt-5.4-mini" },
];

/** The builds run until the test releases them, so they end together however far apart the model started them. */
const RELEASE_FILE = "release.flag";
const BUILD_A = [
  `i=0; while [ ! -f ${RELEASE_FILE} ]; do i=$((i+1)); echo "compiling module $i"; sleep 0.5; done`,
  "echo 'BUILD A OK: 8 modules'",
].join("\n");
const BUILD_B = [
  `i=0; while [ ! -f ${RELEASE_FILE} ]; do i=$((i+1)); echo "running test suite $i"; sleep 0.5; done`,
  "echo 'TESTS B FAILED: 2 of 8 suites failed' >&2",
  "exit 1",
].join("\n");
const INSTRUCTIONS = "You are a build assistant. Use run_bash for shell work. Keep replies short.";
const TASK = [
  "Start these two builds in the background, each with its own run_bash call: `bash build-a.sh` and `bash build-b.sh`.",
  "While they run, check the progress of build A once by reading the last 3 lines of its output.",
  "Then end your turn without waiting; you will be told when they finish.",
  "When you are told, reply with one line per build: its name, whether it passed, and its exit code.",
].join(" ");

type Timed = { type: string; payload: Json; at: number };
const timeline = (session: RunSession): Timed[] => {
  const frames: Timed[] = [];
  session.socket.on("message", (raw) => {
    try {
      const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
      if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {}, at: Date.now() });
    } catch { /* ignore */ }
  });
  return frames;
};
const until = async <T>(probe: () => T | undefined, label: string, ms: number): Promise<T> => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const value = probe(); if (value !== undefined) return value; await wait(250); }
  throw new Error(`Timed out waiting for ${label}`);
};
const args = (frame: Timed) => (isRecord(frame.payload.arguments) ? frame.payload.arguments : {}) as Json;

describeLive("Native background tasks with real models (live)", () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: null, stepTimeoutMs: STEP_TIMEOUT_MS, tempPrefix: "native-bgt-live" });
  let definitionId = "";

  beforeAll(async () => {
    await harness.start();
    definitionId = await harness.createDefinition("native-bgt-live", INSTRUCTIONS, ["run_bash"]);
  }, 180_000);
  afterAll(async () => { await harness.stop(); }, 180_000);

  it.for(CASES)("$id: two background builds, one progress read, one notice, both results reported", { timeout: 600_000 }, async (spec, context: TestContext) => {
    await requireLiveCapability(context, spec.secret);
    const catalog = await harness.catalogModel(spec.providerId, spec.model);
    const workspace = await fs.realpath(await harness.makeWorkspace({ "build-a.sh": BUILD_A, "build-b.sh": BUILD_B }));
    const session = await harness.startRun(definitionId, catalog.modelIdentifier, null, workspace);
    const frames = timeline(session);
    try {
      const firstTurn = await harness.runTurn(session, `${spec.id}-turn1`, TASK);
      expect(firstTurn.error, JSON.stringify(firstTurn.error?.payload ?? null)).toBeNull();
      const firstTurnEnd = frames.find((frame) => frame.type === "TURN_COMPLETED")!;
      const started = frames.filter((frame) => frame.at <= firstTurnEnd.at && frame.type === "TOOL_EXECUTION_STARTED");
      const succeeded = frames.filter((frame) => frame.at <= firstTurnEnd.at && frame.type === "TOOL_EXECUTION_SUCCEEDED");
      const backgroundCalls = started.filter((frame) => args(frame).run_in_background === true);
      const startResults = succeeded.map((frame) => frame.payload.result).filter((result): result is Json => isRecord(result) && typeof result.outputFile === "string");
      const tools = harness.callsOf(`${spec.id}-turn1`)[0]?.body.tools;
      const toolNames = JSON.stringify(tools ?? []);
      // The model saw run_bash, and none of the retired tools.
      expect(toolNames).toContain("run_bash");
      for (const name of RETIRED_TOOLS) expect(toolNames).not.toContain(name);
      // Both builds started in the background, each returning at once with its pid and output file.
      expect(backgroundCalls.map((frame) => String(args(frame).command))).toEqual(expect.arrayContaining([
        expect.stringContaining("build-a.sh"), expect.stringContaining("build-b.sh")]));
      expect(startResults.length).toBeGreaterThanOrEqual(2);
      for (const call of backgroundCalls) {
        const done = succeeded.find((frame) => frame.payload.invocation_id === call.payload.invocation_id);
        expect(done, "start result").toBeDefined();
        expect(done!.at - call.at).toBeLessThan(2_000);
      }
      const buildA = startResults.find((result, index) => String(args(backgroundCalls[index]!).command).includes("build-a.sh")) ?? startResults[0]!;
      // ASM-002: the progress read is an ordinary command on the start result's output file (no polling loop).
      const reads = started.filter((frame) => args(frame).run_in_background !== true);
      const progressRead = reads.find((frame) => JSON.stringify(args(frame)).includes(path.basename(String(buildA.outputFile))));
      expect(progressRead, `progress read of ${String(buildA.outputFile)}: ${JSON.stringify(reads.map(args))}`).toBeDefined();
      expect(reads.length, "no polling in the first turn").toBeLessThanOrEqual(2);

      // The idle agent's two builds end together: one notice wakes it, naming both with their exit codes and last lines.
      expect(frames.filter((frame) => frame.type === "BACKGROUND_TASK_UPDATED" && frame.payload.status !== "running"), "builds still running").toEqual([]);
      await fs.writeFile(path.join(workspace, RELEASE_FILE), "go");
      const notice = await until(() => frames.find((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === NOTICE_SENDER),
        "background task notice", 120_000);
      const reportTurnEnd = await until(() => frames.find((frame) => frame.at > notice.at && frame.type === "TURN_COMPLETED"), "report turn", STEP_TIMEOUT_MS);
      await until(() => frames.find((frame) => frame.at >= reportTurnEnd.at && frame.type === "AGENT_STATUS" && frame.payload.status === "idle"), "idle", 60_000);
      await wait(5_000);
      const noticeText = String(notice.payload.content);
      const ends = frames.filter((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" && isRecord(frame.payload.result)
        && Array.isArray(frame.payload.result.backgroundTasksEnded)).flatMap((frame) => (frame.payload.result as Json).backgroundTasksEnded as Json[]);
      const notices = frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION" && frame.payload.sender_id === NOTICE_SENDER);
      const reply = frames.filter((frame) => frame.at > notice.at && frame.type === "ASSISTANT_COMPLETE").map((frame) => String(frame.payload.content ?? "")).join("\n");
      const evidence = {
        model: catalog.modelIdentifier, toolNames: JSON.parse(toolNames).map((tool: Json) => isRecord(tool.function) ? tool.function.name : tool.name),
        backgroundCalls: backgroundCalls.map((frame) => ({ args: args(frame), startMs: (succeeded.find((done) => done.payload.invocation_id === frame.payload.invocation_id)?.at ?? 0) - frame.at })),
        startResults, reads: reads.map((frame) => args(frame)), progressReadUsesTail: /\btail\b/.test(String(args(progressRead!).command ?? "")),
        endsReportedInRunBashResults: ends, notices: notices.map((frame) => frame.payload.content), reply,
        timeline: frames.filter((frame) => !["SEGMENT_CONTENT", "AGENT_INPUT_STATE", "TOOL_LOG"].includes(frame.type))
          .map((frame) => ({ type: frame.type, at: frame.at, payload: JSON.stringify(frame.payload).slice(0, 500) })),
      };
      if (EVIDENCE_DIR) {
        await fs.mkdir(EVIDENCE_DIR, { recursive: true });
        await fs.writeFile(path.join(EVIDENCE_DIR, `${spec.id}.json`), JSON.stringify(evidence, null, 2));
      }
      expect(noticeText.startsWith(BACKGROUND_TASK_NOTICE_HEADER)).toBe(true);
      expect(notices, "each end is reported once, in one notice").toHaveLength(1);
      expect(ends, "both ends are in the notice, none in a run_bash result").toEqual([]);
      for (const result of startResults.slice(0, 2)) expect(noticeText).toContain(`- pid ${String(result.pid)} `);
      expect(noticeText).toMatch(/build-a\.sh`: exit code 0 after \d+s/);
      expect(noticeText).toMatch(/build-b\.sh`: exit code 1 after \d+s/);
      expect(noticeText).toContain("BUILD A OK: 8 modules");
      expect(noticeText).toContain("TESTS B FAILED: 2 of 8 suites failed");
      // The woken turn reports both results.
      expect(reply).toMatch(/\bA\b[\s\S]*(pass|ok|succeed)/i);
      expect(reply).toMatch(/\bB\b[\s\S]*(fail)/i);
      expect(reply).toMatch(/\b1\b/);
    } finally {
      await harness.stopRun(session);
    }
  });
});
