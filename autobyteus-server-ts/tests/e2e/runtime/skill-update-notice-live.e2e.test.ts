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
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "../helpers/live-runtime-secret-vault-helpers.js";

/**
 * Live proof of active-run skill update notices (AC-001, AC-002 idle, REQ-011 history, R-1).
 *
 * Real Studio server (public GraphQL + agent WebSocket) in a temporary app-data folder whose
 * `skills/notice-probe/SKILL.md` holds a codeword, and real runtimes:
 *  1. The agent reads the codeword (it now has the skill's first version in its conversation).
 *  2. A busy turn runs `sleep`; the codeword changes meanwhile. The run gets one "skill updated"
 *     system notice while busy (Codex/Claude: inside that turn; AutoByteus: the next turn).
 *  3. Asked the same question again, the agent re-reads the absolute SKILL.md path the notice
 *     gives and answers the new codeword (R-1: readable from the runtime).
 *  4. The codeword changes while the run is idle: nothing is sent until the next message, which
 *     is one turn carrying the notice, answered with the newest codeword.
 *  5. The run's history shows both notices as system notices and the user's messages as typed.
 * A second case per runtime (AC-003, DR-001): the seen record appears once the runtime has created
 * the run's memory folder; a run stopped and continued after a change gets one notice and re-reads;
 * a run deleted from history keeps its memory folder deleted.
 *
 * Gate: RUN_SKILL_NOTICE_E2E=1 and SKILL_NOTICE_E2E_RUNTIMES (comma list of codex_app_server,
 * claude_agent_sdk, autobyteus, grok_build; default codex_app_server,claude_agent_sdk).
 * - Codex runs with a temporary CODEX_HOME holding only a symlink to ~/.codex/auth.json; ~/.codex
 *   is never written. Model: CODEX_E2E_TOOL_MODEL (default gpt-5.6-luna).
 * - Claude uses the operator's Claude CLI login (as the other Claude E2E suites). Model:
 *   CLAUDE_E2E_TOOL_MODEL (default haiku).
 * - AutoByteus takes provider keys from credential aliases in the environment (OPENAI_API_KEY, …),
 *   saved into the test-owned vault; run it with a clean `env -i` as the other native live suites.
 *   Model: SKILL_NOTICE_E2E_NATIVE_MODEL (default gpt-5.5).
 * - Grok (ACP backend, next-turn class like AutoByteus) runs with a temporary GROK_HOME holding only a symlink to the
 *   user's auth.json and a config without auto-update; ~/.grok is never written. Model: GROK_E2E_MODEL (default grok-4.7).
 * Command: RUN_SKILL_NOTICE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/skill-update-notice-live.e2e.test.ts --no-watch
 */
type RuntimeKind = "codex_app_server" | "claude_agent_sdk" | "autobyteus" | "grok_build";
/** Runtimes that append input to an active turn (the busy notice arrives inside the busy turn). */
const APPEND_RUNTIMES: readonly RuntimeKind[] = ["codex_app_server", "claude_agent_sdk"];
type Frame = { type: string; payload: Record<string, any> };

const SENDER = "system.skill_update_notifier";
const requested = (process.env.SKILL_NOTICE_E2E_RUNTIMES ?? "codex_app_server,claude_agent_sdk")
  .split(",").map((value) => value.trim()).filter(Boolean) as RuntimeKind[];
const cliReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const enabled = process.env.RUN_SKILL_NOTICE_E2E === "1";
const runtimes = requested.filter((kind) =>
  kind === "codex_app_server" ? cliReady("codex") : kind === "claude_agent_sdk" ? cliReady("claude")
    : kind === "grok_build" ? cliReady(process.env.GROK_BUILD_COMMAND?.trim() || "grok") : kind === "autobyteus");
const suite = enabled && runtimes.length > 0 ? describe : describe.skip;

const skillMd = (codeword: string) => [
  "---",
  "name: notice-probe",
  "description: Holds the current probe codeword. Read this file whenever you are asked for the codeword.",
  "---",
  "",
  `The current codeword is ${codeword}.`,
  "",
].join("\n");

suite("active-run skill update notice (live E2E)", () => {
  let url: URL;
  let close: (() => Promise<void>) | null = null;
  let root = "";
  let skillMdPath = "";

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-live-")));
    const codexHome = path.join(root, "codex-home");
    await fs.mkdir(codexHome, { recursive: true });
    await fs.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
    vi.stubEnv("CODEX_HOME", codexHome);
    if (runtimes.includes("grok_build")) {
      const grokHome = path.join(root, "grok-home");
      await fs.mkdir(grokHome, { recursive: true });
      await fs.symlink(path.join(process.env.GROK_HOME?.trim() || path.join(os.homedir(), ".grok"), "auth.json"), path.join(grokHome, "auth.json"));
      await fs.writeFile(path.join(grokHome, "config.toml"), "[cli]\nauto_update = false\n");
      vi.stubEnv("GROK_HOME", grokHome);
    }
    const appData = path.join(root, "app-data");
    await fs.mkdir(path.join(appData, "skills", "notice-probe"), { recursive: true });
    await fs.writeFile(path.join(appData, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    skillMdPath = path.join(appData, "skills", "notice-probe", "SKILL.md");
    appConfigProvider.config.setCustomAppDataDir(appData);
    if (runtimes.includes("autobyteus")) await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    url = started.mainUrl;
    close = () => started.fastify.close();
  }, 180_000);

  afterAll(async () => {
    if (close) await close();
    if (runtimes.includes("autobyteus")) await closeLiveRuntimeSecretVault();
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

  const pickModel = (runtimeKind: RuntimeKind): string => {
    if (runtimeKind === "codex_app_server") return process.env.CODEX_E2E_TOOL_MODEL?.trim() || "gpt-5.6-luna";
    if (runtimeKind === "claude_agent_sdk") return process.env.CLAUDE_E2E_TOOL_MODEL?.trim() || "haiku";
    if (runtimeKind === "grok_build") return process.env.GROK_E2E_MODEL?.trim() || "grok-4.7";
    return process.env.SKILL_NOTICE_E2E_NATIVE_MODEL?.trim() || "gpt-5.5";
  };

  it.each(runtimes)("%s: busy and idle runs hear about the skill change and re-read it", async (runtimeKind) => {
    await fs.writeFile(skillMdPath, skillMd("APPLE-1111"));
    const workspaceRootPath = path.join(root, `workspace-${runtimeKind}`);
    await fs.mkdir(workspaceRootPath, { recursive: true });
    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
      input: {
        name: `skill-notice-${runtimeKind}-${randomUUID().slice(0, 8)}`, role: "assistant", description: "skill notice probe",
        instructions: "Answer briefly. Use the notice-probe skill for codeword questions.", category: "runtime-e2e",
        toolNames: runtimeKind === "autobyteus" ? ["run_bash", "read_file"] : [], skillNames: ["notice-probe"],
      },
    })).createAgentDefinition.id;
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
      input: {
        agentDefinitionId: definitionId, workspaceRootPath, llmModelIdentifier: pickModel(runtimeKind),
        autoExecuteTools: true, runtimeKind,
        llmConfig: runtimeKind === "codex_app_server" || runtimeKind === "grok_build" ? { reasoning_effort: "low" } : null,
      },
    })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;

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
    const notices = () => frames.filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION" && f.payload.sender_id === SENDER);
    const idle = () => [...frames].reverse().find((f) => f.type === "AGENT_STATUS")?.payload.status === "idle";
    const textSince = (index: number) => frames.slice(index).filter((f) => f.type === "SEGMENT_CONTENT")
      .map((f) => String(f.payload.delta ?? "")).join("");
    /** Sends a message and waits until the run is idle again after at least `turns` completed turns. */
    const send = async (content: string, turns = 1) => {
      const start = frames.length;
      const completed = count("TURN_COMPLETED");
      sendE2eSendMessageCommand(socket, { content });
      await until(() => count("TURN_COMPLETED") >= completed + turns && idle(), `turn "${content.slice(0, 30)}"`);
      await new Promise((r) => setTimeout(r, 1000));
      const errors = frames.slice(start).filter((f) => f.type === "ERROR");
      if (errors.length > 0) throw new Error(`Run error during "${content.slice(0, 30)}": ${JSON.stringify(errors.map((f) => f.payload))}`);
      return start;
    };

    try {
      await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 30_000);
      const question = "What is the current codeword in the notice-probe skill? Reply with only the codeword.";

      // 1. The agent reads the first version.
      const first = await send(question);
      expect(textSince(first)).toContain("APPLE-1111");
      expect(notices()).toHaveLength(0);

      // 2. Busy: the skill changes while a turn runs.
      const busyStart = frames.length;
      const busyCompleted = count("TURN_COMPLETED");
      sendE2eSendMessageCommand(socket, { content: runtimeKind === "autobyteus"
        ? "Call the run_bash tool with the command `sleep 20`, wait for it to finish, then reply with exactly: SLEPT"
        : "Run the shell command `sleep 20` and then reply with exactly: SLEPT" });
      await until(() => frames.slice(busyStart).some((f) => f.type === "TOOL_EXECUTION_STARTED"), "the sleep tool call", 120_000);
      const busyTurnId = [...frames].reverse().find((f) => f.type === "TURN_STARTED")?.payload.turn_id;
      await fs.writeFile(skillMdPath, skillMd("PLUM-7731"));
      await until(() => notices().length === 1, "the busy-run notice", 30_000);
      const busyNotice = notices()[0]!;
      expect(busyNotice.payload.content).toContain("[Platform notice — skill updated]");
      expect(busyNotice.payload.content).toContain(`- notice-probe (${skillMdPath}): SKILL.md`);
      if (APPEND_RUNTIMES.includes(runtimeKind)) expect(busyNotice.payload.turn_id).toBe(busyTurnId); // appended to the busy turn
      // Next-turn runtimes with turn ids (ACP/Grok): the notice is its own turn right after the busy one.
      if (runtimeKind === "grok_build") {
        expect(busyNotice.payload.turn_id).toBeTruthy();
        expect(busyNotice.payload.turn_id).not.toBe(busyTurnId);
      }
      await until(() => count("TURN_COMPLETED") > busyCompleted && idle(), "the busy turn(s)");
      await new Promise((r) => setTimeout(r, 1500));

      // 3. The agent re-reads the updated skill.
      const reread = await send(question);
      expect(textSince(reread)).toContain("PLUM-7731");

      // 4. Idle: the change is only marked, then rides along with the next message (one turn).
      await fs.writeFile(skillMdPath, skillMd("MANGO-4242"));
      await new Promise((r) => setTimeout(r, 5000));
      expect(notices()).toHaveLength(1);
      const turnsBefore = count("TURN_STARTED");
      const idleStart = await send(question);
      expect(count("TURN_STARTED")).toBe(turnsBefore + 1);
      expect(notices()).toHaveLength(2);
      const idleTurnId = frames.slice(idleStart).find((f) => f.type === "TURN_STARTED")?.payload.turn_id;
      // AutoByteus forwards before its turn starts (no turn id yet); its history records the notice
      // in the native turn itself.
      if (runtimeKind !== "autobyteus") expect(notices()[1]!.payload.turn_id).toBe(idleTurnId);
      expect(textSince(idleStart)).toContain("MANGO-4242");

      // 5. History: both notices as system notices; the user's messages as typed.
      const conversation = (await gql(`query($runId: String!) { getRunProjection(runId: $runId) { conversation } }`, { runId }))
        .getRunProjection.conversation as Array<Record<string, any>>;
      const systemNotices = conversation.filter((entry) => entry.kind === "system_task_notification" && entry.senderId === SENDER);
      const userMessages = conversation.filter((entry) => entry.role === "user").map((entry) => String(entry.content ?? ""));
      console.info(`[skill notice ${runtimeKind}]`, JSON.stringify({ notices: systemNotices.length, userMessages }));
      expect(systemNotices).toHaveLength(2);
      expect(userMessages.filter((content) => content === question)).toHaveLength(3);
      expect(userMessages.some((content) => content.includes("[Platform notice"))).toBe(false);
    } finally {
      socket.close();
      await gql("mutation($runId: String!) { terminateAgentRun(agentRunId: $runId) { success } }", { runId }).catch(() => undefined);
    }
  }, 900_000);

  /** The run's memory folder (a folder named after the run under `<app data>/memory`), or null when it does not exist. */
  const findRunMemoryDir = async (runId: string): Promise<string | null> => {
    const search = async (dir: string, depth: number): Promise<string | null> => {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const child = path.join(dir, entry.name);
        if (entry.name === runId) return child;
        if (depth > 0) {
          const found = await search(child, depth - 1);
          if (found) return found;
        }
      }
      return null;
    };
    return search(path.join(root, "app-data", "memory"), 3);
  };

  // AC-003 on a live runtime whose run memory folder appears only with its first trace (DR-001): the
  // seen record is written once that folder exists; a run stopped and continued after a change gets
  // one notice; a deleted run's memory folder is never re-created by a late record write.
  it.each(runtimes)("%s: a stopped run continued after a change gets one notice; a deleted run's memory stays deleted", async (runtimeKind) => {
    await fs.writeFile(skillMdPath, skillMd("CEDAR-1357"));
    const workspaceRootPath = path.join(root, `workspace-restore-${runtimeKind}`);
    await fs.mkdir(workspaceRootPath, { recursive: true });
    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", {
      input: {
        name: `skill-notice-restore-${runtimeKind}-${randomUUID().slice(0, 8)}`, role: "assistant", description: "skill notice probe",
        instructions: "Answer briefly. Use the notice-probe skill for codeword questions.", category: "runtime-e2e",
        toolNames: runtimeKind === "autobyteus" ? ["run_bash", "read_file"] : [], skillNames: ["notice-probe"],
      },
    })).createAgentDefinition.id;
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", {
      input: {
        agentDefinitionId: definitionId, workspaceRootPath, llmModelIdentifier: pickModel(runtimeKind),
        autoExecuteTools: true, runtimeKind,
        llmConfig: runtimeKind === "codex_app_server" || runtimeKind === "grok_build" ? { reasoning_effort: "low" } : null,
      },
    })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;

    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    const frames: Frame[] = [];
    socket.on("message", (raw) => { try { frames.push(JSON.parse(String(raw)) as Frame); } catch { /* ignore */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 300_000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { if (await predicate()) return; await new Promise((r) => setTimeout(r, 200)); }
      throw new Error(`Timed out waiting for ${label}: ${frames.slice(-25).map((f) => f.type).join(",")}`);
    };
    const count = (type: string) => frames.filter((f) => f.type === type).length;
    const notices = () => frames.filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION" && f.payload.sender_id === SENDER);
    const idle = () => [...frames].reverse().find((f) => f.type === "AGENT_STATUS")?.payload.status === "idle";
    const textSince = (index: number) => frames.slice(index).filter((f) => f.type === "SEGMENT_CONTENT")
      .map((f) => String(f.payload.delta ?? "")).join("");
    const terminate = async () => {
      expect((await gql("mutation($runId: String!) { terminateAgentRun(agentRunId: $runId) { success } }", { runId }))
        .terminateAgentRun.success).toBe(true);
    };
    const question = "What is the current codeword in the notice-probe skill? Reply with only the codeword.";

    try {
      await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 30_000);

      // 1. First turn: the runtime creates the run's memory folder; the seen record follows within the
      //    retry schedule (1 s, 5 s, 15 s after the first missing-folder attempt).
      const firstCompleted = count("TURN_COMPLETED");
      const first = frames.length;
      sendE2eSendMessageCommand(socket, { content: question });
      await until(() => count("TURN_COMPLETED") > firstCompleted && idle(), "the first turn");
      expect(textSince(first)).toContain("CEDAR-1357");
      const memoryDir = await findRunMemoryDir(runId);
      expect(memoryDir, "the run's memory folder").toBeTruthy();
      const recordPath = path.join(memoryDir!, "seen_skill_versions.json");
      const turnDoneAt = Date.now();
      await until(async () => (await fs.stat(recordPath).catch(() => null)) !== null, "the seen record", 30_000);
      const record = JSON.parse(await fs.readFile(recordPath, "utf8")) as { skills: Record<string, { skillMdPath: string }> };
      expect(record.skills["notice-probe"]?.skillMdPath).toBe(skillMdPath);
      console.info(`[skill notice restore ${runtimeKind}]`, JSON.stringify({ recordSeenWithinMsOfTurnEnd: Date.now() - turnDoneAt }));

      // 2. Stopped, then the skill changes: nothing is sent to a stopped run.
      await terminate();
      await new Promise((r) => setTimeout(r, 1500));
      await fs.writeFile(skillMdPath, skillMd("BIRCH-8642"));
      await new Promise((r) => setTimeout(r, 5000));
      expect(notices()).toHaveLength(0);

      // 3. Continued: one notice with the message (from the record), then the re-read answer.
      const continueCompleted = count("TURN_COMPLETED");
      const resumed = frames.length;
      sendE2eSendMessageCommand(socket, { content: question });
      await until(() => count("TURN_COMPLETED") > continueCompleted && idle() && notices().length >= 1, "the continued turn");
      await new Promise((r) => setTimeout(r, 1000));
      expect(notices()).toHaveLength(1);
      expect(notices()[0]!.payload.content).toContain(`- notice-probe (${skillMdPath}): SKILL.md`);
      expect(textSince(resumed)).toContain("BIRCH-8642");

      // 4. Stopped and deleted from history: its memory folder is removed and does not come back,
      //    even after the longest retry delay before the 60 s steady state.
      await terminate();
      expect((await gql("mutation($runId: String!) { deleteStoredRun(runId: $runId) { success message } }", { runId }))
        .deleteStoredRun.success).toBe(true);
      await until(async () => (await fs.stat(memoryDir!).catch(() => null)) === null, "the deleted memory folder", 10_000);
      await fs.writeFile(skillMdPath, skillMd("ALDER-9753"));
      await new Promise((r) => setTimeout(r, 22_000));
      expect(await fs.stat(memoryDir!).catch(() => null)).toBeNull();
      expect(notices()).toHaveLength(1);
    } finally {
      socket.close();
      await gql("mutation($runId: String!) { terminateAgentRun(agentRunId: $runId) { success } }", { runId }).catch(() => undefined);
    }
  }, 900_000);
});
