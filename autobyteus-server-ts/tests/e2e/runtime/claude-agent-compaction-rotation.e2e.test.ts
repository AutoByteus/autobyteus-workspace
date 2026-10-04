import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import {
  LIVE_CLAUDE_TURN_TIMEOUT_MS,
  closeClaudeLiveAgentHarness,
  createClaudeLiveAgentHarness,
  useStandaloneClaudeCli,
  waitForStreamMessage,
  type ClaudeLiveAgentHarness,
  type StreamMessage,
} from "../helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Live proof of Claude compaction detection and raw-trace rotation (REQ-022..024, AC-022c,
// AC-023, AC-024) through the real AgentRun, Claude backend/session, SDK, CLI, websocket and
// memory recorder. `/compact` is sent as a normal user message (investigation E64).
// Gated: RUN_CLAUDE_E2E=1. Costs a few cents per run with haiku.
const cliCandidates = resolveClaudeCliExecutableCandidates();
const describeLiveClaudeRuntime =
  process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
const cliCases = cliCandidates.slice(0, 1).map((candidate) => [candidate.label, candidate] as const);

const isType = (type: string) => (message: StreamMessage) => message.type === type;

const sendAndAwaitTurn = async (harness: ClaudeLiveAgentHarness, content: string): Promise<number> => {
  const startIndex = harness.messages.length;
  sendE2eSendMessageCommand(harness.socket, { content });
  await waitForStreamMessage(harness, isType("TURN_COMPLETED"), `TURN_COMPLETED for "${content}"`, { fromIndex: startIndex });
  return startIndex;
};

describeLiveClaudeRuntime("Claude compaction rotation (live E2E)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
    vi.unstubAllEnvs();
  });

  it.each(cliCases)(
    "records one compaction operation, one rotation-eligible marker and one archive segment for /compact [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const root = await fs.mkdtemp(path.join(os.tmpdir(), "claude-live-compaction-"));
      cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
      const workspaceRoot = path.join(root, "workspace");
      const memoryDir = path.join(root, "memory");
      await fs.mkdir(workspaceRoot, { recursive: true });
      const harness = await createClaudeLiveAgentHarness({
        runId: `claude-live-compaction-${randomUUID()}`,
        workspaceRoot,
        memoryDir,
      });
      cleanups.push(() => closeClaudeLiveAgentHarness(harness));
      const recorder = new AgentRunMemoryRecorder();
      const detachRecorder = recorder.attachToRun(harness.agentRun);
      cleanups.push(async () => detachRecorder());

      await sendAndAwaitTurn(harness, "Reply with exactly: OK ONE");
      const compactStart = await sendAndAwaitTurn(harness, "/compact");
      await recorder.waitForIdle(harness.runContext.runId);

      const compactionStatuses = harness.messages
        .slice(compactStart)
        .filter(isType("COMPACTION_STATUS"))
        .map((message) => message.payload ?? {});
      expect(compactionStatuses.map((payload) => payload.status)).toEqual(["compacting", "compacted"]);
      expect(new Set(compactionStatuses.map((payload) => payload.provider_event_id)).size).toBe(1);
      expect(compactionStatuses[1]).toMatchObject({
        source_surface: "claude.compact_boundary",
        rotation_eligible: true,
        trigger: "manual",
      });

      const store = new RunMemoryFileStore(memoryDir);
      const manifest = store.readRawTraceArchiveManifest();
      expect(manifest.segments).toHaveLength(1);
      expect(manifest.segments[0]).toMatchObject({ boundary_type: "provider_compaction_boundary", status: "complete" });
      const markers = [...store.listArchiveTurnRawTracesOrdered(), ...store.listTurnRawTracesOrdered()]
        .filter((trace) => trace.traceType === "provider_compaction_boundary")
        .map((trace) => trace.toolResult as Record<string, unknown>);
      expect(markers.map((marker) => marker.status)).toEqual(["compacting", "compacted"]);
      const boundary = markers.find((marker) => marker.rotation_eligible === true);
      expect(boundary).toMatchObject({ trigger: "manual" });
      expect(boundary?.pre_tokens).toEqual(expect.any(Number));
      expect(boundary?.post_tokens).toEqual(expect.any(Number));
      expect(boundary?.duration_ms).toEqual(expect.any(Number));
      expect(store.listTurnRawTracesOrdered()[0]?.traceType).toBe("provider_compaction_boundary");
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS * 3,
  );
});
