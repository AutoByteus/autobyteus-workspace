import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Neutral vocabulary on a real runtime path, with no model (autobyteus-331: REQ-001, REQ-004; AC-001, AC-004).
// The scripted AGY CLI tests/fixtures/agy-failure-cli.mjs makes the agent call the platform's real tools
// (case `mcp_calls`) streams the step shapes AGY 1.2.14 uses for the platform's own tools (`call_mcp_tool` with
// `delegate_task`, `send_message_to`, `open_tab`...) and for a user's MCP server. The real server records them
// and the real Work Journal service renders them when the turn ends. Checks: the journal says what was done
// (`Delegate task to /researcher`, `Message to ... → delivered`, `Browser: ...`), names no platform tool, keeps a
// tool of another server as `Tool: <tool> (via <server>)`, holds no `{"accepted"` wrapper, and the raw trace
// still holds the recorded tool names. (A `CALL_TOOL` turn of the `linked_skills` case records only the text of the
// reply, not a tool call, so it cannot show the converters.)
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The run's memory folder: the folder holding `raw_traces_active.jsonl` whose path names the run. */
const findRunMemoryDir = async (root: string, runId: string): Promise<string | null> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  if (path.basename(root) === runId && entries.some((entry) => entry.name === "raw_traces_active.jsonl")) return root;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findRunMemoryDir(path.join(root, entry.name), runId);
    if (found) return found;
  }
  return null;
};

suite("Work Journal neutral vocabulary on a real (scripted) runtime", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  let runId = "";
  const sockets: WebSocket[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    // Set before the first run so the scripted CLI answers `CALL_TOOL:{…}` with the real platform tool's result.
    process.env["AGY_FAKE_CASE"] = "mcp_calls";
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "work-journal-neutral-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "work-journal-neutral-" + randomUUID(), role: "assistant", description: "journal probe",
        instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      if (runId) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  });

  it("the platform and server-qualified tools of AGY call steps are journalled in neutral words", async () => {
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
        llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    runId = created.createAgentRun.runId!;
    const messages: Wire[] = [];
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const completedTurns = () => messages.filter((m) => m.type === "TURN_COMPLETED").length;
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 20_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline && !(await predicate())) await wait(50);
      expect(await predicate(), `${label}: ${JSON.stringify(messages.filter((m) => m.type === "ERROR").map((m) => m.payload).concat(messages.map((m) => m.type).slice(-20) as never))}`).toBe(true);
    };
    const memoryDir = async () => {
      const found = await findRunMemoryDir(path.join(dataDir, "memory"), runId);
      expect(found, "run memory folder").toBeTruthy();
      return found!;
    };
    const journal = async () => fs.readFile(path.join(await memoryDir(), "work_journal", "work_journal_active.md"), "utf8").catch(() => "");

    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Do the scripted calls." });
    await until(() => completedTurns() === 1, "scripted tool-call turn");
    await until(async () => (await journal()).includes("Browser:"), "journal has the browser step");

    const text = await journal();
    const heads = text.split("\n").filter((line) => /^\[\d\d:\d\d:\d\d\] /.test(line)).map((line) => line.replace(/^\[[\d:]+\] /, "").replace(/ \[↗\]\([^)]*\)$/, ""));
    const evidenceDir = process.env["WORK_JOURNAL_E2E_EVIDENCE_DIR"];
    const raw = await fs.readFile(path.join(await memoryDir(), "raw_traces_active.jsonl"), "utf8");
    if (evidenceDir) {
      await fs.mkdir(evidenceDir, { recursive: true });
      await fs.writeFile(path.join(evidenceDir, "antigravity-scripted-journal.md"), text, "utf8");
      await fs.writeFile(path.join(evidenceDir, "antigravity-scripted-raw-tool-records.jsonl"),
        raw.split("\n").filter((line) => /"trace_type":"tool_(call|result)"/.test(line)).join("\n") + "\n", "utf8");
    }
    // The platform's own tools read as what was done, not as the tool AGY called (REQ-001, REQ-004).
    expect(heads, heads.join("\n")).toContain("Delegate task to /researcher → ok");
    expect(heads).toContain("Message to (recipient not recorded) → delivered");
    expect(heads).toContain("Browser: list tabs → ok");
    expect(heads).toContain("Browser: open about:blank → failed: BROWSER-PROBE: navigation failed");
    expect(heads.filter((head) => /^Tool: (delegate_task|send_message_to|get_handoff_rules)\b/.test(head))).toEqual([]);
    // A tool of another server is never mistaken for a platform tool, even one named like a platform tool (REQ-006).
    expect(heads).toContain("Tool: open_tab (via shape-test) url=\"about:blank\" reuse_existing=false → ok");
    expect(heads.some((head) => head.startsWith("Tool: always_fails (via shape-test) ") && head.endsWith("→ failed: PROBE-FAILURE-9920: deliberate failure"))).toBe(true);
    expect(text).not.toMatch(/\{"accepted"/);
    // The raw trace keeps what the runtime recorded; the journal's links point there.
    expect(raw).toContain("delegate_task");
  }, 90_000);
});
