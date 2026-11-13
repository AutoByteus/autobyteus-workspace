import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * Live proof that a running agent takes a skill added to its definition, and hears about a removed one
 * (autobyteus-460: AC-001, AC-002, AC-003, AC-008, AC-011, AC-012; design Risk AR-003).
 *
 * Real Studio server (GraphQL definition save, agent WebSocket) on a temporary app-data folder whose
 * `skills/<probe>/SKILL.md` holds a codeword, and a real runtime with a real model. The run starts with **no
 * skills** (AR-003 for Claude: no `Skill` in its first CLI process's `allowedTools`), then:
 *  1. a first turn (nothing to hear);
 *  2. the probe skill is added on the agents page (`updateAgentDefinition`): on Claude, Codex, Grok and DeepSeek its
 *     link appears in the workspace's skill folder (`.claude/skills`, `.codex/skills`, `.grok/skills`, `.dsh/skills`;
 *     AC-011, AC-012); the next message carries one "now available" notice with the `SKILL.md` path, and the agent
 *     follows the skill without a restart: it answers the skill's codeword (AC-002);
 *     2b (Claude) the agent loads the skill with its own `Skill` tool (AC-011, SR-004);
 *  3. the probe skill is removed and the anchor skill added: the next message carries one notice with both (AC-003);
 *     the probe's link stays until the run ends (DEC-007);
 *  4. the probe skill is added back and the anchor removed while the run is idle, and the run is stopped before the
 *     user writes (AC-008, "stop between the save and the message"): the run's links are released at the stop
 *     (AC-012); the next message resumes the run, which links the probe again at its preparation, carries one notice
 *     with both changes, and answers the probe's new codeword;
 *  5. the run is terminated: its links are released.
 * A second Claude case (AR-003, R-001): the same zero-skills start **without auto-execute**; every tool approval the
 * run asks for is approved, as the user would in the web, and recorded; the `Skill` tool loads the skill added mid-run.
 * The conversation entries (notices, tool calls, approvals, replies) are written as evidence.
 *
 * Gate (spends credits): RUN_LIVE_SKILL_DEFINITION_E2E=1 and LIVE_SKILL_DEFINITION_RUNTIMES (comma list of
 * claude_agent_sdk, autobyteus, codex_app_server, grok_build, deepseek_harness; default claude_agent_sdk,autobyteus).
 * - Claude uses the operator's Claude CLI login. Model: CLAUDE_E2E_TOOL_MODEL (default haiku).
 * - AutoByteus takes provider keys from the test vault (AUTOBYTEUS_TEST_VAULT, see TESTING.md#test-vault).
 *   Model: LIVE_SKILL_DEFINITION_NATIVE_MODEL (default gpt-5.5; with the default, a missing OpenAI key is a skip).
 * - Codex runs with a temporary CODEX_HOME holding only a symlink to ~/.codex/auth.json. Model: CODEX_E2E_TOOL_MODEL
 *   (default gpt-6.1-terra, reasoning effort medium).
 * - Grok runs with a temporary GROK_HOME holding only a symlink to the user's auth.json and no auto-update. Model:
 *   GROK_E2E_MODEL (default grok-4.7, reasoning effort low).
 * - DeepSeek Harness: `DEEPSEEK_HARNESS_COMMAND` or `dsh` (Node.js 24.9+), the DeepSeek key
 *   `provider.deepseek.api-key` from the test vault through the product's relay. Model: DEEPSEEK_HARNESS_E2E_MODEL
 *   (default deepseek-v4-flash, reasoning effort low).
 * Signed-in CLIs need the real HOME, USER and LOGNAME (TESTING.md).
 * Optional LIVE_SKILL_DEFINITION_EVIDENCE_DIR: writes live-skill-definition-<runtime>.json (and
 * live-skill-definition-claude-approval.json).
 * Command: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_SKILL_DEFINITION_E2E=1 \
 *   LIVE_SKILL_DEFINITION_RUNTIMES=<runtimes> \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts --no-watch
 */
type RuntimeKind = "claude_agent_sdk" | "autobyteus" | "codex_app_server" | "grok_build" | "deepseek_harness";
type Frame = { type: string; payload: Record<string, any> };
type Entry = { kind: string; role?: string | null; content?: string | null; toolName?: string; toolArgs?: unknown;
  toolResult?: unknown; toolError?: string | null; senderId?: string | null };

const SENDER = "system.skill_update_notifier";
const PROBE = "codeword-probe";
/** A skill the run starts with (none by default: the AR-003 zero-skills start); later added and removed again. */
const ANCHOR = "anchor-skill";
const INITIAL_SKILLS = process.env.LIVE_SKILL_DEFINITION_START_WITH_ONE_SKILL === "1" ? [ANCHOR] : [];
/** The workspace skill folder each runtime keeps (native has none: its skills are a prompt catalog). */
const SKILL_FOLDER: Partial<Record<RuntimeKind, readonly string[]>> = {
  claude_agent_sdk: [".claude", "skills"], codex_app_server: [".codex", "skills"],
  grok_build: [".grok", "skills"], deepseek_harness: [".dsh", "skills"],
};
const COMMAND: Partial<Record<RuntimeKind, string>> = {
  claude_agent_sdk: "claude", codex_app_server: "codex", grok_build: process.env.GROK_BUILD_COMMAND?.trim() || "grok",
  deepseek_harness: process.env.DEEPSEEK_HARNESS_COMMAND?.trim() || "dsh",
};
/** Runtimes whose model calls take a key from the test vault. */
const VAULT_RUNTIMES: readonly RuntimeKind[] = ["autobyteus", "deepseek_harness"];
const requested = (process.env.LIVE_SKILL_DEFINITION_RUNTIMES ?? "claude_agent_sdk,autobyteus")
  .split(",").map((value) => value.trim()).filter(Boolean) as RuntimeKind[];
const cliReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const runtimes = requested.filter((kind) => !COMMAND[kind] || cliReady(COMMAND[kind]!));
const suite = process.env.RUN_LIVE_SKILL_DEFINITION_E2E === "1" && runtimes.length > 0 ? describe : describe.skip;

const skillMd = (codeword: string) => [
  "---",
  `name: ${PROBE}`,
  "description: Gives the current probe codeword. Use it whenever you are asked for the probe codeword.",
  "---",
  "",
  `The current probe codeword is ${codeword}. Reply with it exactly when asked.`,
  "",
].join("\n");
const newCodeword = (prefix: string) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

suite("a skill added to or removed from a running agent's definition (live E2E)", () => {
  let url: URL;
  let close: (() => Promise<void>) | null = null;
  let root = "";
  let appData = "";
  const usesVault = runtimes.some((kind) => VAULT_RUNTIMES.includes(kind));

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "live-skill-definition-")));
    appData = path.join(root, "app-data");
    await fs.mkdir(path.join(appData, "skills", PROBE), { recursive: true });
    await fs.mkdir(path.join(appData, "skills", ANCHOR), { recursive: true });
    await fs.writeFile(path.join(appData, "skills", ANCHOR, "SKILL.md"),
      `---\nname: ${ANCHOR}\ndescription: A skill the run starts with. Not needed for codewords.\n---\n\nNothing to do.\n`);
    await fs.writeFile(path.join(appData, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    if (runtimes.includes("codex_app_server")) {
      const codexHome = path.join(root, "codex-home");
      await fs.mkdir(codexHome, { recursive: true });
      await fs.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
      vi.stubEnv("CODEX_HOME", codexHome);
    }
    if (runtimes.includes("grok_build")) {
      const grokHome = path.join(root, "grok-home");
      await fs.mkdir(grokHome, { recursive: true });
      await fs.symlink(path.join(process.env.GROK_HOME?.trim() || path.join(os.homedir(), ".grok"), "auth.json"), path.join(grokHome, "auth.json"));
      await fs.writeFile(path.join(grokHome, "config.toml"), "[cli]\nauto_update = false\n");
      vi.stubEnv("GROK_HOME", grokHome);
    }
    appConfigProvider.config.setCustomAppDataDir(appData);
    if (usesVault) await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    url = started.mainUrl;
    close = () => started.fastify.close();
  }, 180_000);

  afterAll(async () => {
    if (close) await close();
    if (usesVault) await closeLiveServerVault();
    vi.unstubAllEnvs();
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: any; errors?: unknown };
    if (body.errors || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  const pickModel = (runtimeKind: RuntimeKind): { model: string; llmConfig: Record<string, unknown> | null } => {
    switch (runtimeKind) {
      case "claude_agent_sdk": return { model: process.env.CLAUDE_E2E_TOOL_MODEL?.trim() || "haiku", llmConfig: null };
      case "codex_app_server": return { model: process.env.CODEX_E2E_TOOL_MODEL?.trim() || "gpt-6.1-terra", llmConfig: { reasoning_effort: "medium" } };
      case "grok_build": return { model: process.env.GROK_E2E_MODEL?.trim() || "grok-4.7", llmConfig: { reasoning_effort: "low" } };
      case "deepseek_harness": return { model: process.env.DEEPSEEK_HARNESS_E2E_MODEL?.trim() || "deepseek-v4-flash", llmConfig: { reasoning_effort: "low" } };
      default: return { model: process.env.LIVE_SKILL_DEFINITION_NATIVE_MODEL?.trim() || "gpt-5.5", llmConfig: null };
    }
  };
  const exists = (file: string) => fs.lstat(file).then(() => true, () => false);
  const writeEvidence = async (name: string, evidence: unknown) => {
    const dir = process.env.LIVE_SKILL_DEFINITION_EVIDENCE_DIR;
    if (!dir) return;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `live-skill-definition-${name}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  };

  /** A new agent and its run on `runtimeKind`, with the run's socket and turn helpers. */
  const startRun = async (runtimeKind: RuntimeKind, label: string, autoExecuteTools: boolean) => {
    const { model, llmConfig } = pickModel(runtimeKind);
    const workspace = path.join(root, `workspace-${label}`);
    await fs.mkdir(workspace, { recursive: true });
    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
      input: {
        name: `skill-definition-${label}-${randomUUID().slice(0, 8)}`, role: "assistant", description: "autobyteus-460 live check",
        instructions: "Answer briefly. Follow the platform's notices about your skills.", category: "runtime-e2e",
        toolNames: runtimeKind === "autobyteus" ? ["read_file"] : [], skillNames: INITIAL_SKILLS,
      },
    })).createAgentDefinition.id as string;
    const saveSkills = async (skillNames: string[]) => {
      await gql("mutation($input: UpdateAgentDefinitionInput!) { updateAgentDefinition(input: $input) { id } }",
        { input: { id: definitionId, skillNames } });
      await new Promise((resolve) => setTimeout(resolve, 3_000)); // the definition change pass runs asynchronously
    };
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
      input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: model,
        autoExecuteTools, runtimeKind, llmConfig },
    })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const conversation = async (): Promise<Entry[]> =>
      ((await gql("query($id:String!){getRunProjection(runId:$id){conversation}}", { id: runId })).getRunProjection?.conversation ?? []) as Entry[];

    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    const frames: Frame[] = [];
    const approvals: Array<Record<string, unknown>> = [];
    socket.on("message", (raw) => {
      let frame: Frame;
      try { frame = JSON.parse(String(raw)) as Frame; } catch { return; }
      frames.push(frame);
      // As the user approving in the web; only runs without auto-execute ask.
      if (frame.type === "TOOL_APPROVAL_REQUESTED") {
        approvals.push({ toolName: frame.payload.tool_name, arguments: frame.payload.arguments ?? null });
        socket.send(JSON.stringify({ type: "APPROVE_TOOL", payload: { invocation_id: frame.payload.invocation_id } }));
      }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const until = async (predicate: () => boolean, what: string, ms = 300_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { if (predicate()) return; await new Promise((r) => setTimeout(r, 200)); }
      throw new Error(`Timed out waiting for ${what}: ${frames.slice(-25).map((f) => f.type).join(",")}`);
    };
    const count = (type: string) => frames.filter((f) => f.type === type).length;
    const idle = () => [...frames].reverse().find((f) => f.type === "AGENT_STATUS")?.payload.status === "idle";
    const notices = () => frames.filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION" && f.payload.sender_id === SENDER);
    const textSince = (index: number) => frames.slice(index).filter((f) => f.type === "SEGMENT_CONTENT")
      .map((f) => String(f.payload.delta ?? "")).join("");
    const steps: unknown[] = [];
    const send = async (stepLabel: string, content: string) => {
      const start = frames.length;
      const completed = count("TURN_COMPLETED");
      sendE2eSendMessageCommand(socket, { content });
      await until(() => count("TURN_COMPLETED") > completed && idle(), `turn "${stepLabel}"`);
      await new Promise((r) => setTimeout(r, 1000));
      const errors = frames.slice(start).filter((f) => f.type === "ERROR");
      if (errors.length > 0) throw new Error(`Run error during "${stepLabel}": ${JSON.stringify(errors.map((f) => f.payload))}`);
      steps.push({ label: stepLabel, content, reply: textSince(start),
        notices: frames.slice(start).filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION").map((f) => f.payload) });
      return start;
    };
    const terminate = async () => (await gql("mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}", { id: runId }))
      .terminateAgentRun as { success: boolean; message: string };
    const folder = SKILL_FOLDER[runtimeKind];
    const link = (name: string) => folder ? path.join(workspace, ...folder, name) : null;
    const waitReleased = async (name: string) => {
      const file = link(name);
      if (!file) return;
      const deadline = Date.now() + 30_000;
      while (await exists(file)) {
        if (Date.now() > deadline) throw new Error(`The run's link ${file} was not released after the run ended.`);
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 30_000);
    return { runId, model, workspace, socket, frames, approvals, steps, notices, textSince, send, saveSkills, conversation,
      terminate, link, waitReleased };
  };

  for (const runtimeKind of runtimes) it(`${runtimeKind}: an added skill is set up and followed without a restart; a removed one is announced; both survive a stop between the save and the message`, async (context) => {
    if (VAULT_RUNTIMES.includes(runtimeKind) && !(runtimeKind === "autobyteus" && process.env.LIVE_SKILL_DEFINITION_NATIVE_MODEL?.trim())) {
      await requireLiveCapability(context, runtimeKind === "autobyteus" ? "provider.openai.api-key" : "provider.deepseek.api-key");
    }
    const codeword = newCodeword("QUOKKA");
    const skillMdPath = path.join(appData, "skills", PROBE, "SKILL.md");
    await fs.writeFile(skillMdPath, skillMd(codeword));
    const run = await startRun(runtimeKind, runtimeKind, true);
    const probeLink = run.link(PROBE);
    const anchorLink = run.link(ANCHOR);
    const evidence: Record<string, unknown> = { runtimeKind, model: run.model, codeword, skillFolder: SKILL_FOLDER[runtimeKind] ?? null,
      initialSkills: INITIAL_SKILLS, steps: run.steps };
    const probeDir = await fs.realpath(path.dirname(skillMdPath));

    try {
      // 1. A run with no skills: nothing to hear.
      await run.send("1 no skills", "Reply with exactly: READY-1");
      expect(run.notices()).toHaveLength(0);
      if (probeLink) expect(await exists(probeLink)).toBe(false);

      // 2. The skill is added while the run is idle: set up on the runtime before the next input (AC-011, AC-012).
      await run.saveSkills([...INITIAL_SKILLS, PROBE]);
      if (probeLink) {
        expect(await fs.realpath(probeLink)).toBe(probeDir);
        evidence.linkAfterAdd = probeLink;
      }
      expect(run.notices()).toHaveLength(0); // an idle run is never woken
      const second = await run.send("2 skill added", "What is the probe codeword? Reply with only the codeword.");
      expect(run.notices()).toHaveLength(1);
      const added = String(run.notices()[0]!.payload.content);
      expect(added).toContain(`Your skill package \`${PROBE}\` is now available: Gives the current probe codeword.`);
      expect(added).toContain(`Read its instructions before work it governs: \`${await fs.realpath(skillMdPath)}\``);
      expect(run.textSince(second), "AC-002: the agent follows the added skill").toContain(codeword);
      const toolCalls = (await run.conversation()).filter((entry) => entry.kind === "tool_call")
        .map((entry) => ({ toolName: entry.toolName, toolArgs: entry.toolArgs, toolError: entry.toolError ?? null }));
      evidence.toolCallsAfterAdd = toolCalls;
      // Whether the agent used its runtime's own skill mechanism or read SKILL.md by path (U-001: recorded only).
      evidence.usedSkillTool = toolCalls.some((call) => call.toolName === "Skill");
      if (runtimeKind === "claude_agent_sdk") {
        // AC-011 / AR-003: the CLI lists the folder linked mid-run in its own Skill tool, even though this run started
        // with no skills (no `Skill` in its first process's allowedTools; auto-execute approves the call).
        const before = (await run.conversation()).length;
        const skillStep = await run.send("2b Skill tool", `Use your Skill tool (not Read) to load the ${PROBE} skill. `
          + "Then reply with SKILLED- followed by the codeword it gives.");
        const calls = (await run.conversation()).slice(before).filter((entry) => entry.kind === "tool_call");
        evidence.skillToolStep = calls.map((entry) => ({ toolName: entry.toolName, toolArgs: entry.toolArgs,
          toolError: entry.toolError ?? null, toolResult: entry.toolResult ?? null }));
        expect(calls.some((entry) => entry.toolName === "Skill" && !entry.toolError), "Claude's Skill tool lists the added skill").toBe(true);
        expect(run.textSince(skillStep)).toContain(`SKILLED-${codeword}`);
      }

      // 3. The probe skill is removed (and the anchor added, when the run did not start with it).
      await run.saveSkills([ANCHOR]);
      if (anchorLink && !INITIAL_SKILLS.includes(ANCHOR)) expect(await exists(anchorLink), "the added anchor is linked").toBe(true);
      await run.send("3 skill removed", "Reply with exactly: DONE-3");
      expect(run.notices()).toHaveLength(2);
      const third = String(run.notices()[1]!.payload.content);
      expect(third).toContain(`Your skill package \`${PROBE}\` is no longer available.`);
      if (!INITIAL_SKILLS.includes(ANCHOR)) expect(third).toContain(`Your skill package \`${ANCHOR}\` is now available`);
      // Removal is a message only: the link stays until the run ends (DEC-007).
      if (probeLink) expect(await exists(probeLink)).toBe(true);

      // 4. AC-008: the probe is added back and the anchor removed while the run is idle; the user stops the run before
      //    writing. The stop releases the run's links (AC-012); the next message resumes the run, which links the
      //    probe again at its preparation, and that message carries one notice with both changes.
      await run.saveSkills([PROBE]);
      const stopped = await run.terminate();
      expect(stopped.success, stopped.message).toBe(true);
      await run.waitReleased(PROBE);
      await run.waitReleased(ANCHOR);
      evidence.linksReleasedAtStop = Boolean(probeLink);
      const resumedCodeword = newCodeword("WOMBAT");
      await fs.writeFile(skillMdPath, skillMd(resumedCodeword));
      const fourth = await run.send("4 resumed after stop", "What is the probe codeword now? Reply with only the codeword.");
      expect(run.notices()).toHaveLength(3);
      const resumedNotice = String(run.notices()[2]!.payload.content);
      expect(resumedNotice).toContain(`Your skill package \`${PROBE}\` is now available: Gives the current probe codeword.`);
      expect(resumedNotice).toContain(`Your skill package \`${ANCHOR}\` is no longer available.`);
      expect(run.textSince(fourth), "the resumed run follows the skill's current text").toContain(resumedCodeword);
      if (probeLink) expect(await fs.realpath(probeLink), "linked again at the resumed run's preparation").toBe(probeDir);
      if (anchorLink) expect(await exists(anchorLink), "a skill no longer in the definition is not linked at resume").toBe(false);
      evidence.resumedCodeword = resumedCodeword;
    } finally {
      run.socket.terminate();
      evidence.terminate = await run.terminate().catch((error) => String(error));
      evidence.conversation = await run.conversation().catch((error) => String(error));
      await writeEvidence(runtimeKind, evidence);
    }
    // 5. Terminated: the run's links are released (AC-011, AC-012).
    await run.waitReleased(PROBE);
  }, 1_200_000);

  it.runIf(runtimes.includes("claude_agent_sdk"))("claude_agent_sdk without auto-execute (AR-003, R-001): the Skill tool loads a skill added mid-run to a zero-skills run; every approval asked is recorded", async () => {
    const codeword = newCodeword("NUMBAT");
    await fs.writeFile(path.join(appData, "skills", PROBE, "SKILL.md"), skillMd(codeword));
    const run = await startRun("claude_agent_sdk", "claude-approval", false);
    const evidence: Record<string, unknown> = { runtimeKind: "claude_agent_sdk", autoExecuteTools: false, model: run.model, codeword,
      initialSkills: INITIAL_SKILLS, steps: run.steps, approvals: run.approvals };
    try {
      await run.send("1 no skills", "Reply with exactly: READY-1");
      expect(run.approvals).toHaveLength(0);
      await run.saveSkills([...INITIAL_SKILLS, PROBE]);
      expect(await fs.realpath(run.link(PROBE)!)).toBe(await fs.realpath(path.join(appData, "skills", PROBE)));
      const before = (await run.conversation()).length;
      const step = await run.send("2 Skill tool without auto-execute", `Use your Skill tool (not Read) to load the ${PROBE} skill. `
        + "Then reply with SKILLED- followed by the codeword it gives.");
      const calls = (await run.conversation()).slice(before).filter((entry) => entry.kind === "tool_call");
      evidence.calls = calls.map((entry) => ({ toolName: entry.toolName, toolArgs: entry.toolArgs,
        toolError: entry.toolError ?? null, toolResult: entry.toolResult ?? null }));
      evidence.skillApprovalAsked = run.approvals.some((approval) => approval.toolName === "Skill");
      expect(calls.some((entry) => entry.toolName === "Skill" && !entry.toolError), "the Skill tool loads the added skill").toBe(true);
      expect(run.textSince(step)).toContain(`SKILLED-${codeword}`);
    } finally {
      run.socket.terminate();
      evidence.terminate = await run.terminate().catch((error) => String(error));
      evidence.conversation = await run.conversation().catch((error) => String(error));
      await writeEvidence("claude-approval", evidence);
    }
    await run.waitReleased(PROBE);
  }, 900_000);
});
