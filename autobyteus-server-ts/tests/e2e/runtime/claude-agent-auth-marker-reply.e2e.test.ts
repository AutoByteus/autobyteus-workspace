import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import {
  LIVE_CLAUDE_TURN_TIMEOUT_MS,
  assistantTextSince,
  closeClaudeLiveAgentHarness,
  createClaudeLiveAgentHarness,
  useStandaloneClaudeCli,
  waitForCondition,
  waitForStreamMessage,
  type ClaudeLiveAgentHarness,
  type StreamMessage,
} from "../helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

/**
 * Live proof that the SDK's own error fields decide whether a Claude turn failed, and the
 * words in the agent's reply do not. Runs through the real AgentRun, Claude backend and
 * session, the real SDK and CLI, and the real agent websocket.
 *
 * Gate: RUN_CLAUDE_E2E=1. Runs once per usable Claude CLI (PATH `claude` and the SDK-bundled CLI).
 * Prerequisites: the operator's Claude CLI login, for the normal-reply case only. Each reply
 * case runs one short `haiku` turn. The not-logged-in case points CLAUDE_CONFIG_DIR at an empty
 * temp folder and makes no provider call.
 * Command: RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts --no-watch
 * Cases:
 *  - A logged-in turn whose final reply says "Not logged in · Please run /login" and
 *    "authentication_failed" completes normally and the run returns to idle.
 *  - A turn on a CLI with no credentials ends in a terminal CLAUDE_RUNTIME_AUTHENTICATION_FAILED
 *    error and the run status is error.
 */
const cliCandidates = resolveClaudeCliExecutableCandidates();
const describeLiveClaudeRuntime =
  process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
const cliCases = cliCandidates.map((candidate) => [candidate.label, candidate] as const);

const MARKER_SENTENCE = "The runtime said: Not logged in · Please run /login (error code authentication_failed).";

const isType = (type: string) => (message: StreamMessage) => message.type === type;

const countOf = (harness: ClaudeLiveAgentHarness, type: string, fromIndex = 0): number =>
  harness.messages.slice(fromIndex).filter(isType(type)).length;

const lastStatusSince = (harness: ClaudeLiveAgentHarness, fromIndex: number): unknown =>
  harness.messages.slice(fromIndex).filter(isType("AGENT_STATUS")).at(-1)?.payload?.status;

describeLiveClaudeRuntime("Claude auth-marker reply classification (live E2E)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
    vi.unstubAllEnvs();
  });

  const tempDir = async (label: string): Promise<string> => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), `claude-live-${label}-`));
    cleanups.push(() => fs.rm(directory, { recursive: true, force: true }));
    return directory;
  };

  const startHarness = async (label: string): Promise<ClaudeLiveAgentHarness> => {
    const harness = await createClaudeLiveAgentHarness({
      runId: `claude-live-${label}-${randomUUID()}`,
      workspaceRoot: await tempDir(label),
    });
    cleanups.push(() => closeClaudeLiveAgentHarness(harness));
    return harness;
  };

  it.each(cliCases)(
    "completes a normal turn whose reply mentions not logged in / please run /login / authentication_failed (AC-001) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      const harness = await startHarness("auth-marker-reply");

      sendE2eSendMessageCommand(harness.socket, {
        content: [
          "Do not use any tools. Reply with exactly this sentence and nothing else:",
          MARKER_SENTENCE,
        ].join("\n"),
      });
      // Settles on whichever comes first, so a misclassified reply fails fast with its ERROR frame.
      const settledIndex = await waitForStreamMessage(
        harness,
        (message) => message.type === "TURN_COMPLETED" || message.type === "ERROR",
        "TURN_COMPLETED or ERROR",
      );
      expect(harness.messages[settledIndex], JSON.stringify(harness.messages[settledIndex])).toMatchObject({ type: "TURN_COMPLETED" });
      const completedIndex = settledIndex;
      await waitForCondition(() => harness.agentRun.getStatusSnapshot().status === "idle", "run status idle");
      // Let any late ERROR or status frame arrive before asserting that none came.
      await new Promise((resolve) => setTimeout(resolve, 1_000));

      const reply = assistantTextSince(harness, 0).toLowerCase();
      expect(reply).toContain("not logged in");
      expect(reply).toContain("please run /login");
      expect(reply).toContain("authentication_failed");
      expect(countOf(harness, "ERROR"), JSON.stringify(harness.messages.filter(isType("ERROR")))).toBe(0);
      expect(countOf(harness, "TURN_COMPLETED")).toBe(1);
      expect(lastStatusSince(harness, completedIndex)).toBe("idle");
      expect(harness.agentRun.getStatusSnapshot().status).toBe("idle");
      expect(harness.session.hasCompletedTurn).toBe(true);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS,
  );

  it.each(cliCases)(
    "reports a turn on a CLI without credentials as CLAUDE_RUNTIME_AUTHENTICATION_FAILED (AC-002) [%s]",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);
      vi.stubEnv("CLAUDE_CONFIG_DIR", await tempDir("no-login-config"));
      vi.stubEnv("ANTHROPIC_API_KEY", undefined);
      vi.stubEnv("ANTHROPIC_AUTH_TOKEN", undefined);
      const harness = await startHarness("not-logged-in");

      sendE2eSendMessageCommand(harness.socket, { content: "Say hi." });
      const errorIndex = await waitForStreamMessage(harness, isType("ERROR"), "terminal ERROR");
      await waitForCondition(() => harness.agentRun.getStatusSnapshot().status === "error", "run status error");
      await new Promise((resolve) => setTimeout(resolve, 1_000));

      const error = harness.messages[errorIndex]!.payload ?? {};
      expect(String(error.message)).toContain("CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login");
      expect(error).toMatchObject({ error_scope: "turn", error_effect: "terminal" });
      expect(countOf(harness, "TURN_COMPLETED")).toBe(0);
      // The run streams AGENT_STATUS error before the ERROR frame, so check the last status overall.
      expect(lastStatusSince(harness, 0)).toBe("error");
      expect(harness.agentRun.getStatusSnapshot().status).toBe("error");
      expect(harness.session.hasCompletedTurn).toBe(false);
    },
    LIVE_CLAUDE_TURN_TIMEOUT_MS,
  );
});
