import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputLifecycle } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import type { TokenUsageUpdatedPayload } from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { ClaudeSessionEventName } from "../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import {
  LIVE_CLAUDE_TURN_TIMEOUT_MS,
  assistantTextSince,
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

// Live proof of the one-process-per-run Claude lifecycle (REQ-001/004/005/006/007/008/011)
// through the real AgentRun, Claude backend/session, SDK and CLI. Gated: RUN_CLAUDE_E2E=1.
const cliCandidates = resolveClaudeCliExecutableCandidates();
const describeLiveClaudeRuntime =
  process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
const CASE_TIMEOUT_MS = LIVE_CLAUDE_TURN_TIMEOUT_MS * 3;
const cliCases = cliCandidates.map((candidate) => [candidate.label, candidate] as const);

const isType = (type: string) => (message: StreamMessage) => message.type === type;

const countOf = (harness: ClaudeLiveAgentHarness, type: string, fromIndex = 0): number =>
  harness.messages.slice(fromIndex).filter(isType(type)).length;

/** Sends a websocket user message and waits for the turn it starts to complete. */
const sendAndAwaitTurn = async (
  harness: ClaudeLiveAgentHarness,
  content: string,
  extra: Record<string, unknown> = {},
): Promise<{ startIndex: number; completedIndex: number }> => {
  const startIndex = harness.messages.length;
  sendE2eSendMessageCommand(harness.socket, { content, ...extra });
  const completedIndex = await waitForStreamMessage(harness, isType("TURN_COMPLETED"), `TURN_COMPLETED for "${content.slice(0, 40)}"`, { fromIndex: startIndex });
  return { startIndex, completedIndex };
};

const sendInterrupt = (harness: ClaudeLiveAgentHarness): void => {
  harness.socket.send(JSON.stringify({
    type: "INTERRUPT_GENERATION",
    payload: { command_id: `client_interrupt_${randomUUID()}` },
  }));
};

const waitForBashStart = (harness: ClaudeLiveAgentHarness, commandFragment: string, fromIndex = 0) =>
  waitForStreamMessage(
    harness,
    (message) =>
      message.type === "TOOL_EXECUTION_STARTED" &&
      message.payload?.tool_name === "Bash" &&
      String((message.payload?.arguments as Record<string, unknown> | undefined)?.command ?? "").includes(commandFragment),
    `Bash start for "${commandFragment}"`,
    { fromIndex },
  );

const singleCliPid = (sessionId: string): number => {
  const pids = findClaudeCliProcessIds(sessionId);
  expect(pids, `exactly one Claude CLI process serves session ${sessionId}`).toHaveLength(1);
  return pids[0]!;
};

/**
 * A long foreground command the Claude CLI runs as-is (it blocks `sleep N; …` chains and
 * suggests backgrounding them). The unique marker makes the process findable with pgrep.
 */
const longForegroundCommand = (seconds: number, marker: string): string =>
  `python3 -c "import time; time.sleep(${String(seconds)}); print('${marker}')"`;

const commandLineOf = (pid: number): string =>
  spawnSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf-8" }).stdout.trim();

/** Starts a 60 s foreground Bash command, SIGKILLs the CLI during it, and waits for the turn error. */
const killCliDuringForegroundCommand = async (
  harness: ClaudeLiveAgentHarness,
  pid: number,
): Promise<{ startIndex: number; errorPayload: Record<string, unknown> | undefined }> => {
  const startIndex = harness.messages.length;
  const marker = `SHOULD_NOT_FINISH_${randomUUID().slice(0, 6)}`;
  sendE2eSendMessageCommand(harness.socket, {
    content: `Use the Bash tool (not in the background) to run exactly: ${longForegroundCommand(60, marker)}`,
  });
  await waitForBashStart(harness, marker, startIndex);
  await waitForCondition(() => findProcessIds(marker).length > 0, "foreground command is running before the kill");
  process.kill(pid, "SIGKILL");
  const errorIndex = await waitForStreamMessage(harness, isType("ERROR"), "visible turn-terminal ERROR", { fromIndex: startIndex });
  await waitForCondition(() => harness.session.activeTurnId === null, "crashed turn settles");
  return { startIndex, errorPayload: harness.messages[errorIndex]?.payload };
};

/** A 64x64 solid-color PNG. */
const solidColorPng = (rgb: [number, number, number]): Buffer => {
  const size = 64;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buffer: Buffer): number => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolor RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => rgb).flat())]);
  const pixels = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

describeLiveClaudeRuntime("Claude streaming session lifecycle (live E2E)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
    vi.unstubAllEnvs();
  });

  const startHarness = async (label: string, restore?: { runId: string; sessionId: string; workspaceRoot: string }) => {
    const workspaceRoot = restore?.workspaceRoot ?? await fs.mkdtemp(path.join(os.tmpdir(), `claude-live-${label}-`));
    if (!restore) cleanups.push(() => fs.rm(workspaceRoot, { recursive: true, force: true }));
    const harness = await createClaudeLiveAgentHarness({
      runId: restore?.runId ?? `claude-live-${label}-${randomUUID()}`,
      workspaceRoot,
      restoreSessionId: restore?.sessionId,
    });
    cleanups.push(() => closeClaudeLiveAgentHarness(harness));
    return { harness, workspaceRoot };
  };

  it.each(cliCases)(
    "serves consecutive turns and an idle period from one Claude process with context (AC-001, AC-006) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("one-process");
      const codeword = `LANTERN-${randomUUID().slice(0, 8)}`;
      const sessionId = harness.session.sessionId;
      expect(findClaudeCliProcessIds(sessionId), "no process before the first input (lazy open)").toEqual([]);

      await sendAndAwaitTurn(harness, `Remember the codeword ${codeword}. Reply only OK.`);
      const pid = singleCliPid(sessionId);
      expect(commandLineOf(pid)).toContain(`--session-id=${sessionId}`);

      const second = await sendAndAwaitTurn(harness, "Reply only with the codeword I asked you to remember.");
      expect(assistantTextSince(harness, second.startIndex)).toContain(codeword);
      expect(singleCliPid(sessionId)).toBe(pid);

      // Idle: no turn and no background task. The process must stay the same (no idle close).
      for (let second = 0; second < 15; second += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        expect(findClaudeCliProcessIds(sessionId)).toEqual([pid]);
      }
      expect(harness.session.processState).toBe("OPEN");

      const third = await sendAndAwaitTurn(harness, "Reply with the codeword again, followed by the word DONE.");
      expect(assistantTextSince(harness, third.startIndex)).toContain(codeword);
      expect(singleCliPid(sessionId)).toBe(pid);
      expect(countOf(harness, "TURN_STARTED")).toBe(3);
      expect(countOf(harness, "TURN_COMPLETED")).toBe(3);
      expect(countOf(harness, "ERROR")).toBe(0);
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "delivers a user message sent during a foreground command into the running turn, resolving each input once (AC-003) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("mid-turn");
      const facts = { first: [] as AgentRunInputLifecycle[], second: [] as AgentRunInputLifecycle[] };
      const command = longForegroundCommand(20, "FIRST_DONE");

      await harness.agentRun.postUserMessage(
        new AgentInputUserMessage(
          `Use the Bash tool (not in the background) to run exactly: ${command}\nThen reply with the command output.`,
        ),
        { lifecycleObserver: (fact) => facts.first.push(fact) },
      );
      await waitForBashStart(harness, "FIRST_DONE");
      await waitForCondition(() => findProcessIds("time.sleep.20.*FIRST_DONE").length > 0, "foreground command is running");
      const turnId = harness.session.activeTurnId;
      expect(turnId).toBeTruthy();

      const posted = await harness.agentRun.postUserMessage(
        new AgentInputUserMessage("Also: your final reply must include the word PINEAPPLE."),
        { lifecycleObserver: (fact) => facts.second.push(fact) },
      );
      expect(posted).toMatchObject({ accepted: true, turnId });

      await waitForCondition(
        () => facts.first.some((fact) => fact.kind === "completed") && facts.second.some((fact) => fact.kind === "completed"),
        "both inputs complete",
        LIVE_CLAUDE_TURN_TIMEOUT_MS,
      );
      expect(facts.second).toContainEqual({ kind: "forwarded", dispatchKind: "append_to_active_turn", turnId });
      for (const inputFacts of [facts.first, facts.second]) {
        const terminal = inputFacts.filter((fact) => ["completed", "interrupted", "failed", "cancelled"].includes(fact.kind));
        expect(terminal).toEqual([{ kind: "completed", turnId }]);
      }
      expect(countOf(harness, "TURN_STARTED")).toBe(1);
      expect(countOf(harness, "TURN_COMPLETED")).toBe(1);
      const reply = assistantTextSince(harness);
      expect(reply).toContain("FIRST_DONE");
      expect(reply.toUpperCase()).toContain("PINEAPPLE");
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "Stop ends only the turn: same process, a background task keeps running, the next message is answered (AC-005) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness, workspaceRoot } = await startHarness("stop");
      const sessionId = harness.session.sessionId;
      const backgroundMarker = path.join(workspaceRoot, "background-marker");
      await sendAndAwaitTurn(
        harness,
        [
          `Use the Bash tool with run_in_background set to true to run exactly: sleep 90; echo BG > ${backgroundMarker}`,
          "Do not wait for it. Reply only STARTED.",
        ].join("\n"),
      );
      const pid = singleCliPid(sessionId);
      await waitForCondition(() => findProcessIds(backgroundMarker).length > 0, "background task process is running");

      const foregroundMarker = `FOREGROUND_DONE_${randomUUID().slice(0, 6)}`;
      const stopStart = harness.messages.length;
      sendE2eSendMessageCommand(harness.socket, {
        content: `Use the Bash tool (not in the background) to run exactly: ${longForegroundCommand(60, foregroundMarker)}\nThen reply with its output.`,
      });
      await waitForBashStart(harness, foregroundMarker, stopStart);
      await waitForCondition(() => findProcessIds(foregroundMarker).length > 0, "foreground command is running before the Stop");
      sendInterrupt(harness);
      await waitForStreamMessage(harness, isType("TURN_INTERRUPTED"), "TURN_INTERRUPTED", { fromIndex: stopStart });

      expect(singleCliPid(sessionId)).toBe(pid);
      expect(harness.session.processState).toBe("OPEN");
      expect(findProcessIds(backgroundMarker).length, "the background task survived the Stop").toBeGreaterThan(0);
      expect(fsSync.existsSync(backgroundMarker)).toBe(false);
      await waitForCondition(() => findProcessIds(foregroundMarker).length === 0, "the stopped foreground command ended");

      const next = await sendAndAwaitTurn(harness, "Reply only with the word READY.");
      expect(assistantTextSince(harness, next.startIndex).toUpperCase()).toContain("READY");
      expect(singleCliPid(sessionId)).toBe(pid);
      expect(findProcessIds(backgroundMarker).length).toBeGreaterThan(0);
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "terminating the run closes the Claude process and its background tasks, leaving no orphans (AC-008) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness, workspaceRoot } = await startHarness("terminate");
      const sessionId = harness.session.sessionId;
      const backgroundMarker = path.join(workspaceRoot, "terminate-marker");
      const sleepSeconds = 300 + Math.floor(Math.random() * 600);
      await sendAndAwaitTurn(
        harness,
        [
          `Use the Bash tool with run_in_background set to true to run exactly: sleep ${String(sleepSeconds)}; echo X > ${backgroundMarker}`,
          "Do not wait for it. Reply only STARTED.",
        ].join("\n"),
      );
      const pid = singleCliPid(sessionId);
      await waitForCondition(() => findProcessIds(`sleep ${String(sleepSeconds)}`).length > 0, "background sleep is running");

      const result = await harness.agentRun.terminate();
      expect(result).toMatchObject({ accepted: true });
      await waitForCondition(() => findClaudeCliProcessIds(sessionId).length === 0, "Claude CLI process exited", 20_000);
      await waitForCondition(
        () => findProcessIds(`sleep ${String(sleepSeconds)}`).length === 0 && findProcessIds(backgroundMarker).length === 0,
        "background task processes exited",
        20_000,
      );
      expect(spawnSync("ps", ["-p", String(pid)]).status, "CLI pid is gone").not.toBe(0);
      expect(harness.session.processState).toBe("CLOSED");
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "ends the turn with a visible error when the CLI is killed mid-turn, then resumes with context (AC-009) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness } = await startHarness("crash");
      const sessionId = harness.session.sessionId;
      const codeword = `HARBOR-${randomUUID().slice(0, 8)}`;
      await sendAndAwaitTurn(harness, `Remember the codeword ${codeword}. Reply only OK.`);
      const firstPid = singleCliPid(sessionId);

      const crash = await killCliDuringForegroundCommand(harness, firstPid);
      expect(crash.errorPayload).toMatchObject({
        code: "CLAUDE_RUNTIME_TURN_FAILED",
        error_scope: "turn",
        error_effect: "terminal",
      });
      expect(String(crash.errorPayload?.message)).toContain("CLAUDE_PROCESS_EXITED");
      expect(harness.session.processState).toBe("EXITED");
      expect(countOf(harness, "TURN_COMPLETED", crash.startIndex)).toBe(0);

      const recall = await sendAndAwaitTurn(harness, "Reply only with the codeword I asked you to remember.");
      expect(assistantTextSince(harness, recall.startIndex)).toContain(codeword);
      const reopenedPid = singleCliPid(sessionId);
      expect(reopenedPid).not.toBe(firstPid);
      expect(commandLineOf(reopenedPid)).toContain(sessionId);
      expect(commandLineOf(reopenedPid)).toMatch(/--resume/u);
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "counts every completed turn's usage exactly once across same-process turns, a crash reopen and a restore (RSK-007) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness: first, workspaceRoot } = await startHarness("usage");
      const runId = first.runContext.runId;
      const sessionId = first.session.sessionId;
      type TurnUsage = { mainLoop: number; cumulative: number; seriesRestart: boolean };
      // Raw per-result usage from the Claude session (before the token-usage pipeline) ...
      const raw = new Map<string, TurnUsage>();
      // ... and the persisted, reconciled observation the production event pipeline publishes.
      const persisted = new Map<string, TokenUsageUpdatedPayload[]>();
      const watch = (harness: ClaudeLiveAgentHarness) => {
        harness.session.subscribeRuntimeEvents((event) => {
          if (event.method !== ClaudeSessionEventName.TOKEN_USAGE_UPDATED) return;
          const params = event.params as Record<string, unknown>;
          const rows = (params.claude_sdk_model_usage ?? []) as Array<Record<string, number>>;
          const main = (params.claude_sdk_main_loop_usage ?? {}) as Record<string, number>;
          const sum = (row: Record<string, number>) =>
            (row.inputTokens ?? 0) + (row.outputTokens ?? 0) + (row.cacheReadInputTokens ?? 0) + (row.cacheCreationInputTokens ?? 0);
          raw.set(String(params.turn_id), {
            mainLoop: sum(main),
            cumulative: rows.reduce((total, row) => total + sum(row), 0),
            seriesRestart: params.claude_sdk_series_restart === true,
          });
        });
        const unsubscribe = harness.agentRun.subscribeToEvents((event) => {
          if (event.eventType !== "TOKEN_USAGE_UPDATED") return;
          const payload = event.payload as unknown as TokenUsageUpdatedPayload;
          persisted.set(String(payload.turn_id), [...(persisted.get(String(payload.turn_id)) ?? []), payload]);
        });
        cleanups.push(async () => unsubscribe());
      };
      // Expected: the first observation of every resume-opened process generation is a series
      // restart (admits its main-loop usage); every other turn is a cumulative delta.
      const turns: Array<{ turnId: string; restartExpected: boolean }> = [];
      const completeTurn = async (harness: ClaudeLiveAgentHarness, content: string, restartExpected = false) => {
        const turn = await sendAndAwaitTurn(harness, content);
        turns.push({ turnId: String(harness.messages[turn.completedIndex]?.payload?.turn_id), restartExpected });
      };

      watch(first);
      await completeTurn(first, "Reply only OK.");
      await completeTurn(first, "Reply only OK again.");
      await killCliDuringForegroundCommand(first, singleCliPid(sessionId));
      await completeTurn(first, "Reply only OK after the crash.", true);
      await completeTurn(first, "Reply only OK one more time.");
      await closeClaudeLiveAgentHarness(first); // clean server shutdown
      await waitForCondition(() => findClaudeCliProcessIds(sessionId).length === 0, "process closed at shutdown");
      const { harness: restored } = await startHarness("usage", { runId, sessionId, workspaceRoot });
      watch(restored);
      await completeTurn(restored, "Reply only OK after the restore.", true);
      await completeTurn(restored, "Reply only OK once more.");

      await waitForCondition(() => turns.every(({ turnId }) => persisted.has(turnId)), "usage published for every turn");
      const report = turns.map(({ turnId, restartExpected }) => ({
        turnId: turnId.slice(-8),
        restartExpected,
        raw: raw.get(turnId),
        accounting: persisted.get(turnId)?.map((payload) => payload.accounting_total_tokens),
        flags: persisted.get(turnId)?.flatMap((payload) => payload.quality_flags).filter((flag) => flag.startsWith("claude_sdk_")),
      }));
      console.info(`[RSK-007 ${candidate.label}] per-turn usage:`, JSON.stringify(report));
      for (const { turnId, restartExpected } of turns) {
        const payloads = persisted.get(turnId)!;
        const rawUsage = raw.get(turnId)!;
        const accounting = payloads[0]!.accounting_total_tokens;
        expect(payloads, `one usage observation for turn ${turnId}`).toHaveLength(1);
        expect(payloads[0]!.quality_flags).not.toContain("claude_sdk_selected_regressed");
        expect(rawUsage.seriesRestart, `series-restart mark on turn ${turnId}`).toBe(restartExpected);
        if (restartExpected) {
          // Unknown cumulative origin: the turn's own main-loop usage is admitted.
          expect(payloads[0]!.quality_flags).toContain("claude_sdk_series_restart_main_loop_delta");
          expect(accounting).toBe(rawUsage.mainLoop);
        } else {
          expect(payloads[0]!.quality_flags).not.toContain("claude_sdk_series_restart_main_loop_delta");
          // A cumulative delta: at least the main loop, never more than the process total.
          expect(accounting).toBeGreaterThanOrEqual(rawUsage.mainLoop);
          expect(accounting).toBeLessThanOrEqual(rawUsage.cumulative);
        }
      }
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "a restarted server restores the run, resumes the Claude session in a new process and recalls context (AC-007) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness: original, workspaceRoot } = await startHarness("restore");
      const runId = original.runContext.runId;
      const sessionId = original.session.sessionId;
      const codeword = `ORCHARD-${randomUUID().slice(0, 8)}`;
      await sendAndAwaitTurn(original, `Remember the codeword ${codeword}. Reply only OK.`);
      const originalPid = singleCliPid(sessionId);

      await closeClaudeLiveAgentHarness(original); // server shutdown
      await waitForCondition(() => findClaudeCliProcessIds(sessionId).length === 0, "old process closed at shutdown");

      const { harness: restored } = await startHarness("restore", { runId, sessionId, workspaceRoot });
      expect(restored.session.sessionId).toBe(sessionId);
      expect(findClaudeCliProcessIds(sessionId), "restored run opens its process lazily").toEqual([]);
      const recall = await sendAndAwaitTurn(restored, "Reply only with the codeword I asked you to remember.");
      expect(assistantTextSince(restored, recall.startIndex)).toContain(codeword);
      const restoredPid = singleCliPid(sessionId);
      expect(restoredPid).not.toBe(originalPid);
      expect(commandLineOf(restoredPid)).toMatch(/--resume/u);
    },
    CASE_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "sends an attached image inline so Claude answers without a Read call; a missing image is non-fatal (AC-012, AC-013) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const { harness, workspaceRoot } = await startHarness("image");
      const imagePath = path.join(workspaceRoot, "screenshot.png");
      await fs.writeFile(imagePath, solidColorPng([220, 20, 20]));

      const image = await sendAndAwaitTurn(
        harness,
        "What is the single dominant color of the attached image? Answer with one lowercase color word. Do not use any tools.",
        { context_file_paths: [imagePath] },
      );
      expect(harness.messages.slice(image.startIndex).filter(isType("TOOL_EXECUTION_STARTED"))).toEqual([]);
      expect(assistantTextSince(harness, image.startIndex).toLowerCase()).toContain("red");

      const pid = singleCliPid(harness.session.sessionId);
      const missing = await sendAndAwaitTurn(
        harness,
        "Was an image attached to this message? Answer yes or no, then one short sentence. Do not use any tools.",
        { context_file_paths: [path.join(workspaceRoot, "missing-screenshot.png")] },
      );
      expect(countOf(harness, "ERROR", missing.startIndex)).toBe(0);
      expect(assistantTextSince(harness, missing.startIndex).trim().length).toBeGreaterThan(0);
      expect(harness.session.processState).toBe("OPEN");
      expect(singleCliPid(harness.session.sessionId)).toBe(pid);
    },
    CASE_TIMEOUT_MS,
  );
});
