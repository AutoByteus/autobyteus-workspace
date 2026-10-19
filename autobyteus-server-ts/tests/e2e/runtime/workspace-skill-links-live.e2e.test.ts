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
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

/**
 * Workspace skill links with the real Claude, Codex and Grok CLIs (workspace-skill-collision-fix, REQ-101/102/105).
 *
 * The user's setup: an imported agent package whose agent has a configured skill at
 * `<package>/agents/<agent>/skills/<skill>`, and a workspace whose `.claude/skills/<skill>`, `.codex/skills/<skill>`
 * and `.grok/skills/<skill>` are absolute links to that folder. Everything runs through the real Studio server
 * (GraphQL package import, run create/terminate/restore, team runs with lazy member activation, agent WebSocket).
 * Package, workspace and app data are test-owned temp folders (QR-101); the CLIs use the host sign-in.
 *
 * Gates (one per runtime; paid inference, one short turn per step): RUN_CLAUDE_E2E=1, RUN_CODEX_E2E=1,
 * RUN_GROK_E2E=1. Optional models: CLAUDE_E2E_MODEL (default haiku), CODEX_E2E_MODEL, GROK_E2E_MODEL.
 * Codex runs under a throwaway CODEX_HOME holding only a link to the host `auth.json`.
 * Command (clean environment, real HOME for the CLI logins):
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 \
 *     RUN_GROK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts --no-watch
 * Cases, per enabled runtime:
 *  - AC-101/102: a new run starts in the linked workspace, the link still points at the package skill, the agent
 *    answers from the skill; after terminate and restore ("continue") the run answers from the skill again.
 *  - AC-105: a team run whose skill-configured member starts lazily on its first message (no member memory folder
 *    yet) starts and answers from the skill.
 *  - AC-104: a different same-named skill (real folder) in the workspace refuses a configured-skill agent with the
 *    beta.1 collision error and is left alone; an all-installed agent uses the workspace's own skill.
 * The beta.1 removal of an adopted same-skill link at run end (follow-up F2, DEC-103) is deliberately not asserted.
 */
type RuntimeName = "claude" | "codex" | "grok";
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const RUNTIMES: Record<RuntimeName, { kind: string; enabled: boolean; preferredModels: Array<string | undefined>;
  llmConfig: Record<string, unknown> | null }> = {
  claude: { kind: "claude_agent_sdk", enabled: process.env.RUN_CLAUDE_E2E === "1" && commandReady("claude"),
    preferredModels: [process.env.CLAUDE_E2E_MODEL?.trim(), "haiku", "sonnet"], llmConfig: null },
  codex: { kind: "codex_app_server", enabled: process.env.RUN_CODEX_E2E === "1" && commandReady("codex"),
    preferredModels: [process.env.CODEX_E2E_MODEL?.trim(), "gpt-5.4-mini", "gpt-5.5-mini"], llmConfig: { reasoning_effort: "low" } },
  grok: { kind: "grok_build", enabled: process.env.RUN_GROK_E2E === "1"
      && commandReady(process.env.GROK_BUILD_COMMAND?.trim() || "grok"),
    preferredModels: [process.env.GROK_E2E_MODEL?.trim(), "grok-4.7"], llmConfig: { reasoning_effort: "low" } },
};
const enabledRuntimes = (Object.keys(RUNTIMES) as RuntimeName[]).filter((name) => RUNTIMES[name].enabled);
const describeLive = enabledRuntimes.length > 0 ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.SKILL_LINKS_E2E_STEP_TIMEOUT_MS || 240_000);

type WsMessage = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeLive("workspace skill links with real runtimes (REQ-105)", () => {
  const unique = randomUUID().slice(0, 8);
  const skillName = `link-probe-${unique}`;
  const newRunCode = `LINKCODE-${unique}`;
  const restoreCode = `RESTORECODE-${unique}`;
  const workspaceOwnCode = `OWNCODE-${unique}`;
  const configuredAgentId = `link-probe-agent-${unique}`;
  const allInstalledAgentId = `link-probe-all-${unique}`;
  let root = "";
  let skillDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const models = new Map<RuntimeName, string>();
  const cleanup: Array<() => Promise<unknown>> = [];
  const sockets: WebSocket[] = [];
  const originalCodexHome = process.env.CODEX_HOME;

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  const writeAgent = async (packageRoot: string, id: string, config: Record<string, unknown>) => {
    const dir = path.join(packageRoot, "agents", id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "agent.md"), ["---", `name: ${id}`, "description: Workspace skill link probe", "---", "",
      "You are a concise test agent. When asked for a link probe code, follow the instructions of your link-probe skill.",
      "Reply with only the requested code."].join("\n"));
    await fs.writeFile(path.join(dir, "agent-config.json"), JSON.stringify(config, null, 2));
    return dir;
  };

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-links-live-")));
    const dataDir = path.join(root, "app-data");
    await fs.mkdir(dataDir);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    if (RUNTIMES.codex.enabled) {
      const codexHome = path.join(root, "codex-home");
      await fs.mkdir(codexHome);
      await fs.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
      process.env.CODEX_HOME = codexHome;
    }
    // The user's package shape: <package>/agents/<agent>/skills/<skill>.
    const packageRoot = path.join(root, "package");
    const agentDir = await writeAgent(packageRoot, configuredAgentId, { skillNames: [skillName] });
    skillDir = path.join(agentDir, "skills", skillName);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), ["---", `name: ${skillName}`,
      "description: Gives the link probe codes. Use it whenever you are asked for a link probe code.", "---", "",
      `The new-run link probe code is ${newRunCode}.`, "",
      "For the restore link probe code, read the file restore-code.md in this skill's folder.", ""].join("\n"));
    await fs.writeFile(path.join(skillDir, "restore-code.md"), `The restore link probe code is ${restoreCode}.\n`);
    await writeAgent(packageRoot, allInstalledAgentId, { skillNames: [skillName], skillScope: "ALL_INSTALLED" });

    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    await graphql("mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }",
      { input: { sourceKind: "LOCAL_PATH", source: packageRoot } });
    const definitions = await graphql<{ agentDefinitions: Array<{ id: string; skillNames: string[] }> }>(
      "{ agentDefinitions { id skillNames } }");
    expect(definitions.agentDefinitions.find((definition) => definition.id === configuredAgentId)?.skillNames)
      .toEqual([skillName]);

    for (const name of enabledRuntimes) {
      const availability = await graphql<{ runtimeAvailability: { enabled: boolean; reason: string | null } }>(
        "query($r: String!) { runtimeAvailability(runtimeKind: $r) { enabled reason } }", { r: RUNTIMES[name].kind });
      expect(availability.runtimeAvailability, name).toMatchObject({ enabled: true });
      const catalog = await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
        "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }",
        { r: RUNTIMES[name].kind });
      const available = catalog.providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((m) => m.modelIdentifier));
      const model = RUNTIMES[name].preferredModels.find((candidate) => candidate && available.includes(candidate)) ?? available[0];
      expect(model, `${name} model`).toBeTruthy();
      models.set(name, model!);
    }
    console.info("SKILL_LINKS_LIVE_MODELS", JSON.stringify(Object.fromEntries(models)));
  }, 300_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (app) await app.close();
    if (originalCodexHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = originalCodexHome;
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 120_000);

  const openSocket = async (route: string) => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}${route}`);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload
          === "object" && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    return { socket, messages };
  };

  /** Sends one message and returns the agent's reply text once its turn ends. */
  const ask = async (stream: { socket: WebSocket; messages: WsMessage[] }, runId: string, content: string) => {
    const from = stream.messages.length;
    sendE2eSendMessageCommand(stream.socket, { agent_run_id: runId, content });
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    const ofRun = (m: WsMessage) => !m.payload.agent_run_id || m.payload.agent_run_id === runId;
    while (!stream.messages.slice(from).some((m) => ofRun(m) && (m.type === "TURN_COMPLETED" || m.type === "ERROR"))) {
      if (Date.now() > deadline) {
        const tail = stream.messages.slice(from).slice(-20).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`);
        throw new Error(`Turn did not end for ${runId}. tail=${tail.join(" | ")}`);
      }
      await wait(200);
    }
    await wait(500);
    const turn = stream.messages.slice(from).filter(ofRun);
    // The Team socket coalesces text into SEGMENT_CONTENT_BATCH frames whose items carry their agent_run_id.
    const textParts = turn.flatMap((m) => m.type === "SEGMENT_CONTENT" ? [m.payload]
      : m.type === "SEGMENT_CONTENT_BATCH" ? (m.payload.items as Array<Record<string, unknown>> | undefined ?? [])
        .filter((item) => item.agent_run_id === runId) : []);
    return {
      text: textParts.map((part) => String(part.delta ?? "")).join(""),
      errors: turn.filter((m) => m.type === "ERROR").map((m) => JSON.stringify(m.payload)),
      tools: turn.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => String(m.payload.tool_name)),
    };
  };

  const linkedWorkspace = async (label: string) => {
    const workspace = await fs.mkdtemp(path.join(root, `${label}-ws-`));
    for (const runtimeFolder of [".claude", ".codex", ".grok"]) {
      await fs.mkdir(path.join(workspace, runtimeFolder, "skills"), { recursive: true });
      await fs.symlink(skillDir, path.join(workspace, runtimeFolder, "skills", skillName)); // absolute, as the user does
    }
    return workspace;
  };

  const runConfig = (name: RuntimeName, workspace: string) => ({
    llmModelIdentifier: models.get(name)!, llmConfig: RUNTIMES[name].llmConfig, autoExecuteTools: true,
    runtimeKind: RUNTIMES[name].kind, workspaceRootPath: workspace,
  });

  const createRun = (agentDefinitionId: string, name: RuntimeName, workspace: string) =>
    graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, ...runConfig(name, workspace) } }).then((result) => result.createAgentRun);

  const terminateRun = (agentRunId: string) => graphql<{ terminateAgentRun: { success: boolean } }>(
    "mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId });

  const runtimeLink = (name: RuntimeName, workspace: string) => path.join(workspace, `.${name}`, "skills", skillName);

  describe.each(enabledRuntimes)("%s", (name) => {
    it("starts a new run in the linked workspace and continues it after restore, using the skill both times (AC-101, AC-102)", async () => {
      const workspace = await linkedWorkspace(`${name}-run`);
      const created = await createRun(configuredAgentId, name, workspace);
      expect(created, created.message).toMatchObject({ success: true });
      const runId = created.runId!;
      cleanup.push(() => terminateRun(runId));
      // While the run holds the skill, the user's link is still there and points at the package skill.
      expect((await fs.lstat(runtimeLink(name, workspace))).isSymbolicLink()).toBe(true);
      expect(await fs.realpath(runtimeLink(name, workspace))).toBe(skillDir);

      let stream = await openSocket(`/ws/agent/${runId}`);
      const first = await ask(stream, runId, `What is the new-run link probe code? Use your ${skillName} skill. Reply with only the code.`);
      console.info(`SKILL_LINKS_LIVE_NEW_RUN ${name}`, JSON.stringify({ runId, text: first.text.slice(0, 200), tools: first.tools }));
      expect(first.errors).toEqual([]);
      expect(first.text).toContain(newRunCode);

      stream.socket.close();
      await wait(300);
      expect((await terminateRun(runId)).terminateAgentRun.success).toBe(true);
      const restored = await graphql<{ restoreAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($agentRunId: String!) { restoreAgentRun(agentRunId: $agentRunId) { success message runId } }", { agentRunId: runId });
      expect(restored.restoreAgentRun, restored.restoreAgentRun.message).toMatchObject({ success: true, runId });
      expect(await fs.realpath(runtimeLink(name, workspace))).toBe(skillDir);

      stream = await openSocket(`/ws/agent/${runId}`);
      await wait(1_000);
      const second = await ask(stream, runId,
        `We continue after a restart. What is the restore link probe code? Use your ${skillName} skill. Reply with only the code.`);
      console.info(`SKILL_LINKS_LIVE_RESTORED_RUN ${name}`, JSON.stringify({ runId, text: second.text.slice(0, 200), tools: second.tools }));
      expect(second.errors).toEqual([]);
      expect(second.text).toContain(restoreCode);
      stream.socket.close();
    }, 900_000);

    it("starts a brand-new team member with configured skills on its first message (AC-105)", async () => {
      const workspace = await linkedWorkspace(`${name}-team`);
      const team = await graphql<{ createAgentTeamDefinition: { id: string } }>(
        "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
        { input: { name: `link-probe-team-${name}-${unique}`, description: "Workspace skill link team", instructions: "Answer questions.",
          coordinatorMemberName: "lead", nodes: [
            { memberName: "lead", ref: configuredAgentId, refScope: "SHARED" },
            { memberName: "designer", ref: configuredAgentId, refScope: "SHARED" },
          ] } });
      const teamDefinitionId = team.createAgentTeamDefinition.id;
      cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id: teamDefinitionId }));
      const config = runConfig(name, workspace);
      const run = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
        "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
        { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
          { memberAddress: "/lead", agentDefinitionId: configuredAgentId, ...config },
          { memberAddress: "/designer", agentDefinitionId: configuredAgentId, ...config },
        ] } });
      expect(run.createAgentTeamRun.success, run.createAgentTeamRun.message).toBe(true);
      const teamRunId = run.createAgentTeamRun.teamRunId!;
      cleanup.push(() => graphql("mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }", { teamRunId }));
      const members = flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
        "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }", { teamRunId }))
        .getTeamRunResumeConfig.executionTree);
      const designerRunId = members.find((member) => member.memberName === "designer")!.agentRunId;
      const teamMemoryDir = path.join(root, "app-data", "memory", "agent_teams", teamRunId);
      const memberFoldersBefore = await fs.readdir(teamMemoryDir).catch(() => [] as string[]);
      const designerFolderBefore = memberFoldersBefore.filter((entry) => entry.includes(designerRunId));
      console.info(`SKILL_LINKS_LIVE_TEAM_MEMORY_BEFORE ${name}`, JSON.stringify({ teamRunId, designerRunId, memberFoldersBefore }));
      expect(designerFolderBefore).toEqual([]);

      const stream = await openSocket(`/ws/agent-team/${teamRunId}`);
      const reply = await ask(stream, designerRunId,
        `What is the new-run link probe code? Use your ${skillName} skill. Reply with only the code.`);
      const memberFoldersAfter = await fs.readdir(teamMemoryDir).catch(() => [] as string[]);
      console.info(`SKILL_LINKS_LIVE_TEAM_MEMBER ${name}`, JSON.stringify({ designerRunId, text: reply.text.slice(0, 200),
        tools: reply.tools, memberFoldersAfter }));
      expect(reply.errors).toEqual([]);
      expect(reply.text).toContain(newRunCode);
      stream.socket.close();
    }, 900_000);

    it("refuses a configured-skill run on a different same-named workspace skill and lets an all-installed agent use it (AC-104)", async () => {
      const workspace = await fs.mkdtemp(path.join(root, `${name}-collision-ws-`));
      const ownSkill = runtimeLink(name, workspace);
      await fs.mkdir(ownSkill, { recursive: true });
      await fs.writeFile(path.join(ownSkill, "SKILL.md"), ["---", `name: ${skillName}`,
        "description: Gives the link probe codes. Use it whenever you are asked for a link probe code.", "---", "",
        `The new-run link probe code is ${workspaceOwnCode}.`, ""].join("\n"));

      const refused = await createRun(configuredAgentId, name, workspace);
      let refusal = refused.message;
      if (refused.success) {
        // A runtime that prepares lazily reports the refusal on the first message instead.
        cleanup.push(() => terminateRun(refused.runId!));
        const stream = await openSocket(`/ws/agent/${refused.runId}`);
        refusal = (await ask(stream, refused.runId!, "Reply with OK.")).errors.join(" ");
        stream.socket.close();
      }
      console.info(`SKILL_LINKS_LIVE_COLLISION ${name}`, JSON.stringify({ success: refused.success, refusal: refusal.slice(0, 400) }));
      expect(refusal).toContain("Workspace skill path collision");
      expect(await fs.readFile(path.join(ownSkill, "SKILL.md"), "utf8")).toContain(workspaceOwnCode);

      const allInstalled = await createRun(allInstalledAgentId, name, workspace);
      expect(allInstalled, allInstalled.message).toMatchObject({ success: true });
      cleanup.push(() => terminateRun(allInstalled.runId!));
      const stream = await openSocket(`/ws/agent/${allInstalled.runId}`);
      const reply = await ask(stream, allInstalled.runId!,
        `What is the new-run link probe code? Use your ${skillName} skill. Reply with only the code.`);
      console.info(`SKILL_LINKS_LIVE_ALL_INSTALLED ${name}`, JSON.stringify({ text: reply.text.slice(0, 200), tools: reply.tools }));
      expect(reply.errors).toEqual([]);
      expect(reply.text).toContain(workspaceOwnCode);
      expect(reply.text).not.toContain(newRunCode);
      stream.socket.close();
      expect(await fs.readFile(path.join(ownSkill, "SKILL.md"), "utf8")).toContain(workspaceOwnCode);
    }, 900_000);
  });
});
