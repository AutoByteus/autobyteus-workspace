import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { beginClaudeSdkSessionOpening } from "../../../../../src/runtime-management/claude/client/claude-sdk-session-opening.js";
import { ClaudeSdkClient } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";

afterEach(() => vi.unstubAllEnvs());
describe("retained SDK opening — actual pinned SDK / public hook", () => {
  it("owns an actual test CLI and proves EOF exit/IO; retry is terminal with no new spawn", async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "claude-owned-sdk-test-"));
    const diagnostics: string[] = [];
    let initialization: Promise<unknown> | undefined;
    let acquisitions = 0;
    const opening = beginClaudeSdkSessionOpening({ stderr: text => diagnostics.push(text), createQuery: async control => {
      const q = query({ prompt: control.channel as never, options: {
        cwd: home, env: { HOME: home, PATH: process.env.PATH, CLAUDE_CONFIG_DIR: path.join(home, "claude"), ANTHROPIC_API_KEY: "" },
        settingSources: [], pathToClaudeCodeExecutable: path.resolve("tests/fixtures/claude-owned-sdk-cli.mjs"),
        spawnClaudeCodeProcess: options => { acquisitions++; return control.spawn(options); },
      } });
      control.registerQuery(q);
      initialization = q.initializationResult();
    } });
    try {
      const session = await opening.open();
      await initialization;
      expect(session).toBeDefined();
      expect(await opening.release()).toEqual({ kind: "released" });
      expect(await opening.release()).toEqual({ kind: "released" });
      expect(acquisitions).toBe(1);
      expect(diagnostics.join("")).toContain("final diagnostic €");
      expect(() => session.send({ type: "user", uuid: "late", parent_tool_use_id: null, message: { role: "user", content: [] } })).toThrow("CLAUDE_OPENING_CLOSED");
    } finally { await opening.release(); await fs.rm(home, { recursive: true, force: true }); }
  }, 20_000);

  it("registers before options resolution and rejects a late options result without Query acquisition", async () => {
    let resolve!: (options: never) => void;
    const options = new Promise<never>(r => { resolve = r; });
    const client = new ClaudeSdkClient();
    const acquire = vi.fn();
    client.setCachedModuleForTesting({ query: acquire });
    const opening = client.beginStreamingSession({ resolveOptions: () => options });
    const open = opening.open().catch(error => error);
    expect((await opening.release()).kind).toBe("pending");
    resolve({ systemPrompt: "", sessionBinding: { kind: "create", sessionId: "test" }, model: "test", workingDirectory: null } as never);
    expect(String(await open)).toContain("CLAUDE_OPENING_CLOSED");
    expect(await opening.release()).toEqual({ kind: "released" });
    expect(acquire).not.toHaveBeenCalled();
    await expect(opening.open()).rejects.toThrow("CLAUDE_OPENING_CLOSED");
  });

  it("keeps malformed public initialization as failed, not imaginary settled acquisition", async () => {
    const opening = beginClaudeSdkSessionOpening({ createQuery: async control => control.registerQuery({ close() {} }) });
    await expect(opening.open()).rejects.toThrow("CLAUDE_QUERY_INVALID");
    expect((await opening.release()).kind).toBe("failed");
  });

  it("preserves SDK launch options and uses a distinct explicit debug log under test config root", async () => {
    const home = await fs.mkdtemp(path.join(os.tmpdir(), "claude-debug-owner-test-"));
    const acquire = vi.fn(() => ({ async *[Symbol.asyncIterator]() {}, interrupt: async () => undefined,
      close() {}, initializationResult: async () => ({}) }));
    const client = new ClaudeSdkClient(); client.setCachedModuleForTesting({ query: acquire });
    const opening = client.beginStreamingSession({ resolveOptions: () => ({ systemPrompt: "test instructions",
      sessionBinding: { kind: "resume", sessionId: "exact-resume" }, model: "test-model", workingDirectory: home,
      env: { HOME: home, CLAUDE_AGENT_SDK_AUTH_MODE: "cli", CLAUDE_CONFIG_DIR: path.join(home, "config"), DEBUG_CLAUDE_AGENT_SDK: "1" } }) });
    try {
      await opening.open();
      const options = acquire.mock.calls[0][0].options;
      expect(options).toMatchObject({ resume: "exact-resume", model: "test-model", cwd: home, systemPrompt: "test instructions" });
      expect(options.spawnClaudeCodeProcess).toBeTypeOf("function");
      expect(options.debugFile).toContain(path.join(home, "config", "debug", "autobyteus-cli-"));
      expect(await opening.release()).toEqual({ kind: "released" });
    } finally { await opening.release(); await fs.rm(home, { recursive: true, force: true }); }
  });
});
