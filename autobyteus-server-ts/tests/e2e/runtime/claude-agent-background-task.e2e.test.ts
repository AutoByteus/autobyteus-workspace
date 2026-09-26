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
  useStandaloneClaudeCli,
  waitForStreamMessage,
} from "../helpers/claude-live-agent-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const cliCandidates = resolveClaudeCliExecutableCandidates();
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeLiveClaudeRuntime =
  liveClaudeTestsEnabled && cliCandidates.length > 0 ? describe : describe.skip;
const BACKGROUND_COMMAND_SECONDS = 20;

describeLiveClaudeRuntime("Claude runtime background tasks (live E2E, AC-002)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
  });

  it.each(cliCandidates.map((candidate) => [candidate.label, candidate] as const))(
    "keeps a background Bash command running after the turn ends and reports it in a turn Claude starts itself (%s)",
    async (_label, candidate) => {
      useStandaloneClaudeCli(candidate);

      const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-live-background-task-"));
      cleanups.push(() => fs.rm(workspaceRoot, { recursive: true, force: true }));
      const markerPath = path.join(workspaceRoot, "marker");
      const command = `sleep ${String(BACKGROUND_COMMAND_SECONDS)}; echo done > ${markerPath}`;
      const harness = await createClaudeLiveAgentHarness({
        runId: `claude-live-background-task-${randomUUID()}`,
        workspaceRoot,
      });
      cleanups.push(() => closeClaudeLiveAgentHarness(harness));

      sendE2eSendMessageCommand(harness.socket, {
        content: [
          "Use the Bash tool with run_in_background set to true to run this exact command:",
          command,
          "Do not wait for it. Reply only STARTED and end your turn.",
          "When you are later notified that it finished, reply with the content of the marker file.",
        ].join("\n"),
      });

      const firstCompleted = await waitForStreamMessage(harness, (message) => message.type === "TURN_COMPLETED", "first TURN_COMPLETED");
      expect(fsSync.existsSync(markerPath), "the command is still running when the first turn ends").toBe(false);
      const bashStart = harness.messages.find((message) =>
        message.type === "TOOL_EXECUTION_STARTED" &&
        message.payload?.tool_name === "Bash" &&
        String((message.payload?.arguments as Record<string, unknown> | undefined)?.command ?? "").includes(markerPath));
      expect((bashStart?.payload?.arguments as Record<string, unknown> | undefined)?.run_in_background).toBe(true);

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
});
