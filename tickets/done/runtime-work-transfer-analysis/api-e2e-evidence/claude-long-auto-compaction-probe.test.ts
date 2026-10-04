// TEMPORARY API/E2E probe (TMP-01): attempt a >30 s live auto compaction to observe Claude's
// 30 s "compacting" keepalives through AutoByteus. Not durable coverage; removed after the run.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, expect, it, vi } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunMemoryRecorder } from "../../src/agent-memory/services/agent-run-memory-recorder.js";
import { buildClaudeSessionConfig } from "../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { resolveClaudeCliExecutableCandidates } from "../helpers/claude-cli-executable-candidates.js";
import {
  closeClaudeLiveAgentHarness, createClaudeLiveAgentHarness, useStandaloneClaudeCli, waitForStreamMessage,
} from "../e2e/helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../e2e/helpers/websocket-command-helpers.js";

const OUT = process.env.TMP01_OUT!;
const MODEL = process.env.TMP01_MODEL ?? "opus";
const filler = (n: number, salt: string) => Array.from({ length: n }, (_, i) =>
  `Ledger ${salt}-${i}: account ${(i * 7919) % 100003} moved ${(i * 104729) % 9973} units to warehouse ${(i * 31) % 97}; note ${((i * 2654435761) % 1000003).toString(36)}.`).join("\n");

const cleanups: Array<() => Promise<void>> = [];
afterAll(async () => { for (const c of cleanups.reverse()) await c().catch(() => undefined); vi.unstubAllEnvs(); });

it("TMP-01 long auto compaction", async () => {
  const candidate = resolveClaudeCliExecutableCandidates()[0]!;
  useStandaloneClaudeCli(candidate);
  vi.stubEnv("CLAUDE_CODE_AUTO_COMPACT_WINDOW", "60000");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "claude-tmp01-"));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  const workspaceRoot = path.join(root, "workspace"); const memoryDir = path.join(root, "memory");
  await fs.mkdir(workspaceRoot, { recursive: true });
  const runId = `claude-tmp01-${randomUUID()}`;
  const harness = await createClaudeLiveAgentHarness({ runId, workspaceRoot, memoryDir });
  cleanups.push(() => closeClaudeLiveAgentHarness(harness));
  (harness.runContext.runtimeContext as { sessionConfig: unknown }).sessionConfig = buildClaudeSessionConfig({
    model: MODEL, workingDirectory: workspaceRoot, permissionMode: "default", autoExecuteTools: true,
  });
  const recorder = new AgentRunMemoryRecorder();
  const detach = recorder.attachToRun(harness.agentRun); cleanups.push(async () => detach());
  const timeline: Array<{ t: number; type?: string; payload?: unknown }> = [];
  const t0 = Date.now();
  harness.socket.on("message", (data) => {
    try { const m = JSON.parse(data.toString()); if (["COMPACTION_STATUS", "TURN_COMPLETED", "TURN_STARTED", "ERROR"].includes(m.type)) timeline.push({ t: Date.now() - t0, type: m.type, payload: m.type === "COMPACTION_STATUS" ? m.payload : undefined }); } catch { /* ignore */ }
  });
  const send = async (content: string) => {
    const start = harness.messages.length;
    sendE2eSendMessageCommand(harness.socket, { content });
    await waitForStreamMessage(harness, (m) => m.type === "TURN_COMPLETED", "turn", { fromIndex: start, timeoutMs: 600_000 });
  };
  await send(`Archive dump A (distinct ledgers). Do not analyze. Reply with exactly: OK A\n${filler(2200, "A")}`);
  await send(`Archive dump B (distinct ledgers). Do not analyze. Reply with exactly: OK B\n${filler(2200, "B")}`);
  await send("Reply with exactly: OK AFTER");
  await recorder.waitForIdle(runId);
  const store = new RunMemoryFileStore(memoryDir);
  const markers = [...store.listArchiveTurnRawTracesOrdered(), ...store.listTurnRawTracesOrdered()]
    .filter((t) => t.traceType === "provider_compaction_boundary").map((t) => t.toolResult);
  await fs.writeFile(OUT, JSON.stringify({ model: MODEL, cli: candidate, timeline, markers, segments: store.readRawTraceArchiveManifest().segments }, null, 1));
  expect(timeline.length).toBeGreaterThan(0);
}, 1_800_000);
