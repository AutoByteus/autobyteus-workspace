import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * Live proof that a running agent takes a skill added to its definition, and hears about a removed one
 * (autobyteus-460: AC-001, AC-002, AC-003, AC-011; design Risk AR-003).
 *
 * Real Studio server (GraphQL definition save, agent WebSocket) on a temporary app-data folder whose
 * `skills/<probe>/SKILL.md` holds a codeword, and a real runtime with a real model. The run starts with **no
 * skills** (AR-003 for Claude: no `Skill` in its first CLI process's `allowedTools`), then:
 *  1. a first turn (nothing to hear);
 *  2. the probe skill is added on the agents page (`updateAgentDefinition`): on Claude its link appears in the
 *     workspace's `.claude/skills` (AC-011); the next message carries one "now available" notice with the
 *     `SKILL.md` path, and the agent follows the skill without a restart: it answers the skill's codeword (AC-002);
 *  3. the skill is removed: the next message carries one "no longer available" notice (AC-003);
 *  4. the run is terminated: Claude's link is released (AC-011).
 * The conversation entries (notices, tool calls, replies) are written as evidence.
 *
 * Gate (spends credits): RUN_LIVE_SKILL_DEFINITION_E2E=1 and LIVE_SKILL_DEFINITION_RUNTIMES (comma list of
 * claude_agent_sdk, autobyteus; default both).
 * - Claude uses the operator's Claude CLI login. Model: CLAUDE_E2E_TOOL_MODEL (default haiku).
 * - AutoByteus takes provider keys from the test vault (AUTOBYTEUS_TEST_VAULT, see TESTING.md#test-vault).
 *   Model: LIVE_SKILL_DEFINITION_NATIVE_MODEL (default gpt-5.5; with the default, a missing OpenAI key is a skip).
 * Optional LIVE_SKILL_DEFINITION_EVIDENCE_DIR: writes live-skill-definition-<runtime>.json.
 * Command: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_SKILL_DEFINITION_E2E=1 \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts --no-watch
 */
type RuntimeKind = "claude_agent_sdk" | "autobyteus";
type Frame = { type: string; payload: Record<string, any> };
type Entry = { kind: string; role?: string | null; content?: string | null; toolName?: string; toolArgs?: unknown;
  toolResult?: unknown; toolError?: string | null; senderId?: string | null };

const SENDER = "system.skill_update_notifier";
const PROBE = "codeword-probe";
/** A skill the run starts with (none by default: the AR-003 zero-skills start). */
const ANCHOR = "anchor-skill";
const INITIAL_SKILLS = process.env.LIVE_SKILL_DEFINITION_START_WITH_ONE_SKILL === "1" ? [ANCHOR] : [];
const requested = (process.env.LIVE_SKILL_DEFINITION_RUNTIMES ?? "claude_agent_sdk,autobyteus")
  .split(",").map((value) => value.trim()).filter(Boolean) as RuntimeKind[];
const cliReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const runtimes = requested.filter((kind) => kind === "autobyteus" || cliReady("claude"));
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

suite("a skill added to or removed from a running agent's definition (live E2E)", () => {
  let url: URL;
  let close: (() => Promise<void>) | null = null;
  let root = "";
  let appData = "";

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "live-skill-definition-")));
    appData = path.join(root, "app-data");
    await fs.mkdir(path.join(appData, "skills", PROBE), { recursive: true });
    await fs.mkdir(path.join(appData, "skills", ANCHOR), { recursive: true });
    await fs.writeFile(path.join(appData, "skills", ANCHOR, "SKILL.md"),
      `---\nname: ${ANCHOR}\ndescription: A skill the run starts with. Not needed for codewords.\n---\n\nNothing to do.\n`);
    await fs.writeFile(path.join(appData, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appData);
    if (runtimes.includes("autobyteus")) await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    url = started.mainUrl;
    close = () => started.fastify.close();
  }, 180_000);

  afterAll(async () => {
    if (close) await close();
    if (runtimes.includes("autobyteus")) await closeLiveServerVault();
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

  const pickModel = (runtimeKind: RuntimeKind): string => runtimeKind === "claude_agent_sdk"
    ? process.env.CLAUDE_E2E_TOOL_MODEL?.trim() || "haiku"
    : process.env.LIVE_SKILL_DEFINITION_NATIVE_MODEL?.trim() || "gpt-5.5";

  for (const runtimeKind of runtimes) it(`${runtimeKind}: an added skill is set up and followed without a restart; a removed one is announced`, async (context) => {
    if (runtimeKind === "autobyteus" && !process.env.LIVE_SKILL_DEFINITION_NATIVE_MODEL?.trim()) {
      await requireLiveCapability(context, "provider.openai.api-key");
    }
    const codeword = `QUOKKA-${Math.floor(1000 + Math.random() * 9000)}`;
    const skillMdPath = path.join(appData, "skills", PROBE, "SKILL.md");
    await fs.writeFile(skillMdPath, skillMd(codeword));
    const workspace = path.join(root, `workspace-${runtimeKind}`);
    await fs.mkdir(workspace, { recursive: true });
    const link = path.join(workspace, ".claude", "skills", PROBE);
    const evidence: Record<string, unknown> = { runtimeKind, model: pickModel(runtimeKind), codeword, steps: [] as unknown[] };

    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
      input: {
        name: `skill-definition-${runtimeKind}-${randomUUID().slice(0, 8)}`, role: "assistant", description: "autobyteus-460 live check",
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
      input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: pickModel(runtimeKind),
        autoExecuteTools: true, runtimeKind, llmConfig: null },
    })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const conversation = async (): Promise<Entry[]> =>
      ((await gql("query($id:String!){getRunProjection(runId:$id){conversation}}", { id: runId })).getRunProjection?.conversation ?? []) as Entry[];

    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    const frames: Frame[] = [];
    socket.on("message", (raw) => { try { frames.push(JSON.parse(String(raw)) as Frame); } catch { /* ignore */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const until = async (predicate: () => boolean, label: string, ms = 300_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { if (predicate()) return; await new Promise((r) => setTimeout(r, 200)); }
      throw new Error(`Timed out waiting for ${label}: ${frames.slice(-25).map((f) => f.type).join(",")}`);
    };
    const count = (type: string) => frames.filter((f) => f.type === type).length;
    const idle = () => [...frames].reverse().find((f) => f.type === "AGENT_STATUS")?.payload.status === "idle";
    const notices = () => frames.filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION" && f.payload.sender_id === SENDER);
    const textSince = (index: number) => frames.slice(index).filter((f) => f.type === "SEGMENT_CONTENT")
      .map((f) => String(f.payload.delta ?? "")).join("");
    const send = async (label: string, content: string) => {
      const start = frames.length;
      const completed = count("TURN_COMPLETED");
      sendE2eSendMessageCommand(socket, { content });
      await until(() => count("TURN_COMPLETED") > completed && idle(), `turn "${label}"`);
      await new Promise((r) => setTimeout(r, 1000));
      const errors = frames.slice(start).filter((f) => f.type === "ERROR");
      if (errors.length > 0) throw new Error(`Run error during "${label}": ${JSON.stringify(errors.map((f) => f.payload))}`);
      (evidence.steps as unknown[]).push({ label, content, reply: textSince(start),
        notices: frames.slice(start).filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION").map((f) => f.payload) });
      return start;
    };

    try {
      await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 30_000);

      // 1. A run with no skills: nothing to hear.
      await send("1 no skills", "Reply with exactly: READY-1");
      expect(notices()).toHaveLength(0);
      if (runtimeKind === "claude_agent_sdk") expect(await fs.lstat(link).then(() => true, () => false)).toBe(false);
      evidence.initialSkills = INITIAL_SKILLS;

      // 2. The skill is added while the run is idle.
      await saveSkills([...INITIAL_SKILLS, PROBE]);
      if (runtimeKind === "claude_agent_sdk") {
        expect(await fs.realpath(link)).toBe(await fs.realpath(path.dirname(skillMdPath))); // AC-011: linked before the next input
        evidence.linkAfterAdd = link;
      }
      expect(notices()).toHaveLength(0); // an idle run is never woken
      const second = await send("2 skill added", "What is the probe codeword? Reply with only the codeword.");
      expect(notices()).toHaveLength(1);
      const added = String(notices()[0]!.payload.content);
      expect(added).toContain(`Your skill package \`${PROBE}\` is now available: Gives the current probe codeword.`);
      expect(added).toContain(`Read its instructions before work it governs: \`${await fs.realpath(skillMdPath)}\``);
      expect(textSince(second), "AC-002: the agent follows the added skill").toContain(codeword);
      const toolCalls = (await conversation()).filter((entry) => entry.kind === "tool_call")
        .map((entry) => ({ toolName: entry.toolName, toolArgs: entry.toolArgs, toolError: entry.toolError ?? null }));
      evidence.toolCallsAfterAdd = toolCalls;
      // Claude: whether it used its own Skill tool (the CLI listed the linked folder) or read SKILL.md by path.
      evidence.usedSkillTool = toolCalls.some((call) => call.toolName === "Skill");
      if (runtimeKind === "claude_agent_sdk") {
        // AC-011 / AR-003: the CLI lists the folder linked mid-run in its own Skill tool, even though this run started
        // with no skills (no `Skill` in its first process's allowedTools; auto-execute approves the call).
        const before = (await conversation()).length;
        const skillStep = await send("2b Skill tool", `Use your Skill tool (not Read) to load the ${PROBE} skill. `
          + "Then reply with SKILLED- followed by the codeword it gives.");
        const calls = (await conversation()).slice(before).filter((entry) => entry.kind === "tool_call");
        evidence.skillToolStep = calls.map((entry) => ({ toolName: entry.toolName, toolArgs: entry.toolArgs,
          toolError: entry.toolError ?? null, toolResult: entry.toolResult ?? null }));
        expect(calls.some((entry) => entry.toolName === "Skill" && !entry.toolError), "Claude's Skill tool lists the added skill").toBe(true);
        expect(textSince(skillStep)).toContain(`SKILLED-${codeword}`);
      }

      // 3. The skill is removed.
      await saveSkills(INITIAL_SKILLS);
      await send("3 skill removed", "Reply with exactly: DONE-3");
      expect(notices()).toHaveLength(2);
      expect(String(notices()[1]!.payload.content)).toContain(`Your skill package \`${PROBE}\` is no longer available.`);
      // Removal is a message only: the link stays until the run ends (DEC-007).
      if (runtimeKind === "claude_agent_sdk") expect(await fs.lstat(link).then(() => true, () => false)).toBe(true);
    } finally {
      socket.terminate();
      evidence.terminate = await gql("mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}", { id: runId })
        .catch((error) => String(error));
      evidence.conversation = await conversation().catch((error) => String(error));
      const dir = process.env.LIVE_SKILL_DEFINITION_EVIDENCE_DIR;
      if (dir) {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `live-skill-definition-${runtimeKind}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
      }
    }
    // 4. Terminated: the run's link is released (AC-011).
    if (runtimeKind === "claude_agent_sdk") {
      const deadline = Date.now() + 30_000;
      while (await fs.lstat(link).then(() => true, () => false)) {
        if (Date.now() > deadline) throw new Error(`The run's link ${link} was not released after terminate.`);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, 900_000);
});
