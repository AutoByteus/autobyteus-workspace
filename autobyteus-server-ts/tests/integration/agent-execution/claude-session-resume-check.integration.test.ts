import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { verifyClaudeSessionResumable } from "../../../src/agent-execution/backends/claude/session/claude-session-resume-check.js";
import { SavedRuntimeSessionMissingError } from "../../../src/agent-execution/errors.js";

/**
 * The Claude check of a restored session (autobyteus-599, DS-003, PRB-007) against the REAL Claude Code CLI and the pinned SDK,
 * on an isolated HOME and CLAUDE_CONFIG_DIR (never the user's ~/.claude) and with no key: the SDK's initialization settles
 * before any input, so no model is ever called. A missing session is the typed lost-session error; a present one (a synthetic
 * transcript in the isolated config) passes.
 *   RUN_CLAUDE_CLI_INTEGRATION=1 [CLAUDE_CODE_CLI=<path to claude>] pnpm exec vitest run \
 *     tests/integration/agent-execution/claude-session-resume-check.integration.test.ts --no-watch
 */
const CLI = process.env.CLAUDE_CODE_CLI || spawnSync("which", ["claude"], { encoding: "utf8" }).stdout.trim();
const ENABLED = process.env.RUN_CLAUDE_CLI_INTEGRATION === "1" && path.isAbsolute(CLI)
  && spawnSync(CLI, ["--version"], { stdio: "ignore", env: { PATH: process.env.PATH, HOME: os.tmpdir() } }).status === 0;

describe.runIf(ENABLED)("the Claude restore check with the real CLI (isolated config, no model call)", () => {
  let home: string;
  let cwd: string;
  let closers: Array<() => void>;
  beforeEach(async () => {
    home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "claude-resume-check-")));
    cwd = path.join(home, "workspace");
    await fs.mkdir(path.join(home, "config"), { recursive: true });
    await fs.mkdir(cwd, { recursive: true });
    closers = [];
  });
  afterEach(async () => {
    closers.forEach((close) => close());
    await fs.rm(home, { recursive: true, force: true });
  });

  /** The server's check over a real SDK query that resumes `sessionId`; its prompt never yields, so no input is ever sent. */
  const check = async (sessionId: string) => {
    let release!: () => void;
    const never = new Promise<void>((resolve) => { release = resolve; });
    async function* prompt() { await never; }
    const q = query({ prompt: prompt() as never, options: {
      resume: sessionId, cwd, settingSources: [], pathToClaudeCodeExecutable: CLI,
      env: { PATH: process.env.PATH, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, "config"), ANTHROPIC_API_KEY: "" },
    } });
    closers.push(() => { release(); q.close?.(); });
    void (async () => { try { for await (const _frame of q) { /* drained */ } } catch { /* the initialization carries the reason */ } })();
    const started = Date.now();
    const initialized = q.initializationResult();
    await verifyClaudeSessionResumable({ ensureInitialized: () => initialized } as never, sessionId);
    return Date.now() - started;
  };

  it("a session the CLI does not have is the typed lost-session error, with the SDK's own reason as its cause", async () => {
    const missing = randomUUID();
    const error = await check(missing).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SavedRuntimeSessionMissingError);
    expect(error).toMatchObject({ code: "SAVED_RUNTIME_SESSION_MISSING", runtimeKind: "claude_agent_sdk", platformAgentRunId: missing });
    expect(((error as Error).cause as Error).message).toBe(`Claude Code returned an error result: No conversation found with session ID: ${missing}`);
  }, 60_000);

  it("a session the CLI has passes the check before any input", async () => {
    const present = randomUUID();
    const projectDir = path.join(home, "config", "projects", cwd.replace(/[^a-zA-Z0-9]/g, "-"));
    await fs.mkdir(projectDir, { recursive: true });
    const at = new Date().toISOString();
    const user = randomUUID();
    await fs.writeFile(path.join(projectDir, `${present}.jsonl`), [
      { type: "user", uuid: user, parentUuid: null, sessionId: present, cwd, timestamp: at, isSidechain: false, userType: "external", version: "2.1.330",
        message: { role: "user", content: "earlier question" } },
      { type: "assistant", uuid: randomUUID(), parentUuid: user, sessionId: present, cwd, timestamp: at, isSidechain: false, userType: "external", version: "2.1.330",
        message: { id: "msg_synthetic", type: "message", role: "assistant", model: "claude-synthetic", content: [{ type: "text", text: "earlier answer" }],
          stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } },
    ].map((line) => JSON.stringify(line)).join("\n") + "\n");

    await expect(check(present)).resolves.toBeGreaterThanOrEqual(0);
  }, 60_000);
});
