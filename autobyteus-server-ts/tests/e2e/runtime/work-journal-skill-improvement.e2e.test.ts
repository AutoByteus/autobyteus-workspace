import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Skill Improvement on the Work Journal, end to end through the real Studio server (BEH-W5, AC-W8;
// BEH-W4/SCN-W6 for the start trigger). A native AutoByteus target does one turn; its
// `work_journal/` is then deleted, as for a run recorded before the journal existed. Starting Skill
// Improvement must render the journal, hand the built-in Retrospective Skill Improver a trigger that lists
// the journal manifest, root and files, and the improver (same runtime and model as the target, since the
// built-in has no launch config) must read a listed journal file.
// Gate: RUN_DEEPSEEK_E2E=1 with DEEPSEEK_API_KEY (saved into the test-owned vault; DEEPSEEK_E2E_MODEL, default
// deepseek-v4-flash), or RUN_LMSTUDIO_E2E=1 (local model; LMSTUDIO_TARGET_TEXT_MODEL, default qwen3.6-35b-a3b).
const PROVIDER = process.env.RUN_DEEPSEEK_E2E === "1" && process.env.DEEPSEEK_API_KEY?.trim() ? "DEEPSEEK"
  : process.env.RUN_LMSTUDIO_E2E === "1" ? "LMSTUDIO" : null;
const MODEL = PROVIDER === "DEEPSEEK" ? process.env.DEEPSEEK_E2E_MODEL?.trim() || "deepseek-v4-flash"
  : process.env.LMSTUDIO_TARGET_TEXT_MODEL?.trim() || "qwen3.6-35b-a3b";
const suite = PROVIDER ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.WORK_JOURNAL_E2E_STEP_TIMEOUT_MS || 300_000);
const EVIDENCE_DIR = process.env.WORK_JOURNAL_E2E_EVIDENCE_DIR?.trim() || "";
type RawRecord = { id: string; trace_type: string; content?: string | null; tool_name?: string | null; tool_args?: unknown };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const listRunFolders = async (root: string): Promise<string[]> => {
  const out: string[] = [];
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    if (entries.some((entry) => entry.name === "raw_traces_active.jsonl")) out.push(dir);
    for (const entry of entries) if (entry.isDirectory()) await walk(path.join(dir, entry.name));
  };
  await walk(root);
  return out;
};
const readRaw = async (dir: string): Promise<RawRecord[]> =>
  (await fs.readFile(path.join(dir, "raw_traces_active.jsonl"), "utf8").catch(() => "")).split("\n").filter(Boolean)
    .map((line) => JSON.parse(line) as RawRecord);

suite(`Skill Improvement uses the Work Journal (live, ${PROVIDER})`, () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const previousLmStudioHosts = process.env.LMSTUDIO_HOSTS;
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "work-journal-skill-improvement-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    process.env.LMSTUDIO_HOSTS ??= "http://127.0.0.1:1234";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      await app.close();
    }
    await closeLiveRuntimeSecretVault();
    if (previousLmStudioHosts === undefined) delete process.env.LMSTUDIO_HOSTS; else process.env.LMSTUDIO_HOSTS = previousLmStudioHosts;
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it("renders the journal at start, lists it in the improver's trigger, and the improver reads it", async () => {
    await graphql("mutation($providerId: String!, $runtimeKind: String) { ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { providerId: PROVIDER, runtimeKind: "autobyteus" });
    const available = (await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind: "autobyteus" })).providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier));
    const model = available.find((id) => id.includes(MODEL));
    expect(model, `${PROVIDER} models: ${available.join(", ")}`).toBeTruthy();

    await graphql("mutation { setSkillImprovementEnabled(enabled: true) { enabled } }");
    await graphql("mutation($key: String!, $value: String!) { updateServerSetting(key: $key, value: $value) }",
      { key: "AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID", value: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID });
    const skillName = `journal_probe_${randomUUID().slice(0, 8)}`;
    await graphql("mutation($input: CreateSkillInput!) { createSkill(input: $input) { name } }",
      { input: { name: skillName, description: "Notes on answering briefly.", content: "# Brief answers\n\nAnswer in one short line.\n" } });
    const definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `journal-skill-target-${randomUUID()}`, role: "assistant", description: "Skill improvement target",
        instructions: "Answer briefly.", category: "runtime-e2e", toolNames: ["run_bash"], skillNames: [skillName] } }))
      .createAgentDefinition.id;
    const workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null,
        autoExecuteTools: true, runtimeKind: "autobyteus" } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const targetRunId = created.createAgentRun.runId!;
    runIds.push(targetRunId);

    // One target turn.
    const types: string[] = [];
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${targetRunId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => { try { types.push(String((JSON.parse(String(raw)) as { type?: unknown }).type)); } catch { /* ignore */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: targetRunId, content: "Use run_bash to run `echo journal-probe`, then reply with exactly: READY" });
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    while (Date.now() < deadline && !types.includes("TURN_COMPLETED")) await wait(250);
    expect(types, "target turn").toContain("TURN_COMPLETED");
    const targetDir = (await listRunFolders(path.join(dataDir, "memory"))).find((dir) => path.basename(dir) === targetRunId)!;
    expect(targetDir, "target memory folder").toBeTruthy();
    // Let the turn-end update finish, then remove the journal: an older run without work_journal/.
    const journalDir = path.join(targetDir, "work_journal");
    for (let i = 0; i < 100 && !(await fs.stat(path.join(journalDir, "work_journal_manifest.json")).catch(() => null)); i += 1) await wait(100);
    await fs.rm(journalDir, { recursive: true, force: true });

    // Start Skill Improvement (the mutation waits for the improver; it is observed while it runs).
    const before = new Set(await listRunFolders(path.join(dataDir, "memory")));
    const start = graphql<{ startAgentRunSkillImprovement: { improvementRunId: string; improverRunId: string | null } }>(
      "mutation($input: StartAgentRunSkillImprovementInput!) { startAgentRunSkillImprovement(input: $input) { improvementRunId improverRunId } }",
      { input: { runId: targetRunId } }).catch((error: unknown) => ({ error: String(error) }));

    // The journal is rendered at the start (first need), before the improver launches.
    const manifestPath = path.join(journalDir, "work_journal_manifest.json");
    const activePath = path.join(journalDir, "work_journal_active.md");
    let improverDir = "";
    let trigger = "";
    let readCall: RawRecord | undefined;
    const observeDeadline = Date.now() + STEP_TIMEOUT_MS;
    while (Date.now() < observeDeadline && !readCall) {
      if (!improverDir) {
        for (const dir of await listRunFolders(path.join(dataDir, "memory"))) {
          if (before.has(dir)) continue;
          const first = (await readRaw(dir)).find((record) => record.trace_type === "user" && String(record.content).includes("Work Journal manifest:"));
          if (first) { improverDir = dir; trigger = String(first.content); }
        }
      } else {
        readCall = (await readRaw(improverDir)).find((record) => record.trace_type === "tool_call"
          && JSON.stringify(record.tool_args ?? "").includes("work_journal"));
      }
      await wait(500);
    }
    expect(await fs.readFile(manifestPath, "utf8"), "manifest rendered at start").toContain("\"journal_file\": \"work_journal_active.md\"");
    expect(await fs.readFile(activePath, "utf8"), "active journal rendered at start").toContain("READY");
    expect(trigger, "improver trigger message").toContain("Use the listed Work Journal files as the evidence package.");
    expect(trigger).toContain(`Work Journal manifest: ${manifestPath}`);
    expect(trigger).toContain(`Work Journal root: ${journalDir}`);
    expect(trigger).toContain(activePath);
    expect(trigger.toLowerCase()).not.toContain("work trace");
    expect(readCall, `improver read a journal file (improver folder ${improverDir})`).toBeTruthy();
    if (EVIDENCE_DIR) {
      const out = path.join(EVIDENCE_DIR, "skill-improvement");
      await fs.mkdir(out, { recursive: true });
      await fs.writeFile(path.join(out, "improver-trigger.txt"), trigger);
      await fs.writeFile(path.join(out, "improver-read-call.json"), JSON.stringify(readCall, null, 2));
      await fs.cp(journalDir, path.join(out, "target-work_journal"), { recursive: true });
    }
    // Do not wait for the improver to finish; closing the server ends it.
    void start;
  }, STEP_TIMEOUT_MS * 3);
});
