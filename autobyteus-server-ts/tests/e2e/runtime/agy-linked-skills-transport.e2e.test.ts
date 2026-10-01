import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

/**
 * AGY linked skills and always-on auto-approve through the real server (GraphQL, WebSocket, run manager,
 * AGY factory, capsule, team/org/delegation activation) with the scripted CLI in its `linked_skills` case.
 * The CLI runs with the capsule as cwd, reads `.agents/skills/*` there like AGY does, reports
 * `permission_mode` from its argv like AGY does, and calls `delegate_task` over the run's real MCP config.
 *
 * Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts --no-watch
 */
const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, unknown> };
type Launch = { argv: string[]; cwd: string };
type CapsuleSkill = { name: string; symlink: boolean; target: string | null; skillMd: string; marker: string };
const MODEL = "gemini-3.8-flash-low";
const SKIP_PERMISSIONS = "--dangerously-skip-permissions";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("AGY linked skills and always auto-approve through the server (scripted CLI)", () => {
  let dataDir = "";
  let argvLog = "";
  let app: FastifyInstance;
  let url: URL;
  const sockets: WebSocket[] = [];
  const cleanup: Array<() => Promise<unknown>> = [];
  const warnings: string[] = [];
  const previousCase = process.env["AGY_FAKE_CASE"];
  const previousArgvLog = process.env["AGY_FAKE_ARGV_LOG"];

  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };

  const launches = async (): Promise<Launch[]> => {
    const text = await fs.readFile(argvLog, "utf8").catch(() => "");
    return text.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Launch);
  };
  const launchesFor = async (runId: string): Promise<Launch[]> =>
    (await launches()).filter((launch) => launch.cwd.includes(runId));

  /** Creates a skill the way the Skills page does, then adds what a skill's own launcher leaves behind. */
  const createSkill = async (name: string, marker: string): Promise<string> => {
    const created = await graphql<{ createSkill: { rootPath: string } }>(
      "mutation($input: CreateSkillInput!) { createSkill(input: $input) { rootPath } }",
      { input: { name, description: `Fixture skill ${name}`, content: `# ${name}\n\nSKILL-MD-${marker}` } });
    const root = created.createSkill.rootPath;
    await fs.writeFile(path.join(root, "marker.md"), `SIBLING-${marker}\n`);
    return root;
  };
  /** The shape of `browser-automation/.venv` that failed every AGY Chat: outside links, dangling link, >32 MiB file. */
  const addLocalEnvironment = async (skillRoot: string): Promise<void> => {
    await fs.mkdir(path.join(skillRoot, ".venv", "bin"), { recursive: true });
    await fs.mkdir(path.join(skillRoot, ".venv", "lib"), { recursive: true });
    await fs.symlink(process.execPath, path.join(skillRoot, ".venv", "bin", "python"));
    await fs.symlink(path.join(os.tmpdir(), `missing-${randomUUID()}`), path.join(skillRoot, ".venv", "bin", "python3"));
    const handle = await fs.open(path.join(skillRoot, ".venv", "lib", "driver.bin"), "w");
    await handle.truncate(40 * 1024 * 1024);
    await handle.close();
  };
  const createWorkspace = async (label: string): Promise<string> => {
    const workspace = path.join(dataDir, `workspace-${label}`);
    await fs.mkdir(workspace, { recursive: true });
    return fs.realpath(workspace);
  };
  const createAgent = async (name: string, input: { skillScope?: "ALL_INSTALLED" | "CONFIGURED";
    skillNames?: string[]; toolNames?: string[] } = {}): Promise<string> => {
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name}-${randomUUID().slice(0, 8)}`, role: "assistant", description: "AGY linked skills fixture",
        instructions: "Follow the user's instructions.", category: "runtime-e2e", toolNames: input.toolNames ?? [],
        skillNames: input.skillNames ?? [], skillScope: input.skillScope ?? "CONFIGURED" } });
    const id = created.createAgentDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }));
    return id;
  };
  // Stored auto-approve off, as a form seeded from a pre-change run can still submit (CRR-001 CF-03).
  const runInput = (agentDefinitionId: string, workspaceRootPath: string) => ({ agentDefinitionId, workspaceRootPath,
    llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: false, runtimeKind: "antigravity_cli" });
  /** Desktop and Chat launch: prepare the run, then the first WebSocket send activates it. */
  const prepareRun = async (agentDefinitionId: string, workspaceRootPath: string): Promise<string> => {
    const prepared = await graphql<{ prepareAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { prepareAgentRun(input: $input) { success message runId } }",
      { input: runInput(agentDefinitionId, workspaceRootPath) });
    expect(prepared.prepareAgentRun.success, prepared.prepareAgentRun.message).toBe(true);
    const runId = prepared.prepareAgentRun.runId!;
    cleanup.push(() => terminate(runId));
    return runId;
  };
  const terminate = (runId: string) =>
    graphql<{ terminateAgentRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId });

  const open = async (route: string): Promise<{ socket: WebSocket; frames: Frame[] }> => {
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}${route}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") frames.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore malformed diagnostic rows only. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { socket, frames };
  };
  const until = async (frames: Frame[], label: string, predicate: (frame: Frame) => boolean, ms = 30_000): Promise<Frame> => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const found = frames.find(predicate);
      if (found) return found;
      await wait(100);
    }
    throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(frames).slice(-4000)}`);
  };
  /** Sends one standalone-run message and returns the frames of that turn. */
  const ask = async (runId: string, content: string, expectEnd: "TURN_COMPLETED" | "FAILED" = "TURN_COMPLETED") => {
    const { socket, frames } = await open(`/ws/agent/${runId}`);
    await until(frames, "CONNECTED", (f) => f.type === "CONNECTED");
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    if (expectEnd === "TURN_COMPLETED") await until(frames, "TURN_COMPLETED", (f) => f.type === "TURN_COMPLETED");
    else await until(frames, "rejected ACK", (f) => f.type === "AGENT_COMMAND_ACK" && f.payload["state"] !== "accepted");
    await wait(200);
    socket.close();
    return frames;
  };
  const reportedSkills = (frames: Frame[]): CapsuleSkill[] => {
    const text = frames.map((frame) => JSON.stringify(frame.payload)).join("\n");
    const match = /SKILLS:(\[.*?\])(?:\\n|")/.exec(text);
    if (!match) throw new Error(`No skill report in turn: ${text.slice(-3000)}`);
    return JSON.parse(JSON.parse(`"${match[1]}"`)) as CapsuleSkill[];
  };
  const capsule = (runId: string) => path.join(dataDir, "memory", "agents", runId, "agy-project");

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agy-linked-skills-e2e-")));
    argvLog = path.join(dataDir, "agy-launches.jsonl");
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    const originalWarn = console.warn.bind(console);
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
      originalWarn(...args);
    });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  }, 60_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) for (const step of cleanup.reverse()) await step().catch(() => undefined);
    if (app) await app.close();
    vi.restoreAllMocks();
    if (previousCase === undefined) delete process.env["AGY_FAKE_CASE"]; else process.env["AGY_FAKE_CASE"] = previousCase;
    if (previousArgvLog === undefined) delete process.env["AGY_FAKE_ARGV_LOG"]; else process.env["AGY_FAKE_ARGV_LOG"] = previousArgvLog;
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 60_000);

  it("E01: Chat (Daily Assistant, all installed skills) starts with a skill holding a local environment and reads it through the link (AC-001, AC-002, AC-006)", async () => {
    const envRoot = await createSkill("env-skill", "ENV-7731");
    await addLocalEnvironment(envRoot);
    const workspace = await createWorkspace("chat");
    const assistant = await graphql<{ agentDefinition: { id: string; skillScope: string } | null }>(
      `query { agentDefinition(id: "${DAILY_ASSISTANT_AGENT_DEFINITION_ID}") { id skillScope } }`);
    expect(assistant.agentDefinition?.skillScope).toBe("ALL_INSTALLED");

    const runId = await prepareRun(DAILY_ASSISTANT_AGENT_DEFINITION_ID, workspace);
    const frames = await ask(runId, "READ_SKILLS");

    const env = reportedSkills(frames).find((skill) => skill.name === "env-skill");
    expect(env).toMatchObject({ symlink: true, target: await fs.realpath(envRoot),
      skillMd: expect.stringContaining("SKILL-MD-ENV-7731"), marker: "SIBLING-ENV-7731" });
    const [launch] = await launchesFor(runId);
    expect(launch?.argv).toContain(SKIP_PERMISSIONS);
    expect(launch?.argv).toContain("--new-project");
    expect(await fs.realpath(launch!.cwd)).toBe(await fs.realpath(capsule(runId)));
    expect(await fs.readlink(path.join(capsule(runId), ".agents", "skills", "env-skill"))).toBe(await fs.realpath(envRoot));
    // Nothing is written into the selected workspace for skills.
    expect(await fs.readdir(workspace)).toEqual([]);
    expect(JSON.stringify(frames)).not.toContain("Failed to prepare agent run");

    await terminate(runId);
    expect((await fs.stat(path.join(envRoot, ".venv", "lib", "driver.bin"))).size).toBe(40 * 1024 * 1024);
    expect(await fs.readFile(path.join(envRoot, "marker.md"), "utf8")).toBe("SIBLING-ENV-7731\n");
  }, 60_000);

  it("E02: an all-installed run skips a skill the workspace already owns, with a warning, and keeps the others (AC-004)", async () => {
    await createSkill("owned-skill", "OWNED-1180");
    const workspace = await createWorkspace("owned");
    await fs.mkdir(path.join(workspace, ".agents", "skills", "owned-skill"), { recursive: true });
    await fs.writeFile(path.join(workspace, ".agents", "skills", "owned-skill", "SKILL.md"), "# workspace copy\n");
    const agentId = await createAgent("all-installed", { skillScope: "ALL_INSTALLED" });

    const runId = await prepareRun(agentId, workspace);
    const frames = await ask(runId, "READ_SKILLS");

    const names = reportedSkills(frames).map((skill) => skill.name);
    expect(names).toContain("env-skill");
    expect(names).not.toContain("owned-skill");
    expect(warnings.some((line) => line.includes(`run=${runId}`) && line.includes("skill=owned-skill")
      && line.includes("disposition=skipped-workspace-owned"))).toBe(true);
    expect((await launchesFor(runId))[0]?.argv).toContain(SKIP_PERMISSIONS);
  }, 60_000);

  it("E03: a named skill that cannot be used fails the run with the skill and reason, not a generic error (AC-005, REQ-006)", async () => {
    const workspace = await createWorkspace("named");
    await fs.mkdir(path.join(workspace, ".agents", "skills", "env-skill"), { recursive: true });
    const agentId = await createAgent("named", { skillNames: ["env-skill"] });

    const runId = await prepareRun(agentId, workspace);
    const frames = await ask(runId, "hello", "FAILED");

    const wire = JSON.stringify(frames);
    expect(wire).toContain("Antigravity could not use skill 'env-skill': the selected workspace already has a skill with this name.");
    expect(wire).not.toContain("Failed to prepare agent run");
    expect(await launchesFor(runId)).toEqual([]);
    await expect(fs.access(capsule(runId))).rejects.toThrow();

    // Mobile launch creates and activates in one call; its result carries the same reason.
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: runInput(agentId, workspace) });
    expect(created.createAgentRun.success).toBe(false);
    expect(created.createAgentRun.message).toContain(
      "Antigravity could not use skill 'env-skill': the selected workspace already has a skill with this name.");
    expect(created.createAgentRun.message).not.toContain("Failed to prepare agent run");
  }, 60_000);

  it("E04: in a Team with auto-approve stored off, a member's named-skill failure names the skill and reason, and the other member runs with skip-permissions (REQ-006, AC-006)", async () => {
    const workspace = await createWorkspace("team");
    await fs.mkdir(path.join(workspace, ".agents", "skills", "env-skill"), { recursive: true });
    const leadId = await createAgent("lead");
    const blockedId = await createAgent("blocked", { skillNames: ["env-skill"] });
    const team = await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `agy-linked-team-${randomUUID().slice(0, 8)}`, description: "AGY linked skills team",
        instructions: "Coordinate.", coordinatorMemberName: "lead", nodes: [
          { memberName: "lead", ref: leadId, refScope: "SHARED" },
          { memberName: "blocked", ref: blockedId, refScope: "SHARED" }] } });
    const teamDefinitionId = team.createAgentTeamDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id: teamDefinitionId }));
    const off = { llmModelIdentifier: MODEL, llmConfig: {}, autoExecuteTools: false, runtimeKind: "antigravity_cli", workspaceRootPath: workspace };
    const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...off }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: leadId, ...off },
        { memberAddress: "/blocked", agentDefinitionId: blockedId, ...off }] } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    cleanup.push(() => graphql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId }));
    const resume = await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }", { teamRunId });
    const members = new Map(flattenE2eConfiguredAgentExecutions(resume.getTeamRunResumeConfig.executionTree)
      .map((member) => [member.memberName, member.agentRunId]));
    const { socket, frames } = await open(`/ws/agent-team/${teamRunId}`);

    sendE2eSendMessageCommand(socket, { agent_run_id: members.get("blocked"), content: "hello" });
    await until(frames, "member skill failure", (f) => JSON.stringify(f.payload).includes("Antigravity could not use skill"));
    await wait(300);
    const wire = JSON.stringify(frames);
    expect(wire).toContain("Antigravity could not use skill 'env-skill': the selected workspace already has a skill with this name.");
    expect(wire).not.toContain("Failed to prepare agent run");
    expect(await launchesFor(members.get("blocked")!)).toEqual([]);

    const start = frames.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: members.get("lead"), content: "hello lead" });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && !JSON.stringify(frames.slice(start)).includes("TURN_COMPLETED")) await wait(100);
    expect(JSON.stringify(frames.slice(start))).toContain("TURN_COMPLETED");
    const [lead] = await launchesFor(members.get("lead")!);
    expect(lead?.argv).toContain(SKIP_PERMISSIONS);
    socket.close();
  }, 90_000);

  it("E05: an Org member launched with auto-approve stored off runs with skip-permissions (AC-006)", async () => {
    const workspace = await createWorkspace("org");
    const directorId = await createAgent("director");
    const org = await graphql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `agy-linked-org-${randomUUID().slice(0, 8)}`, description: "AGY linked skills org",
        instructions: "Answer.", members: [{ memberName: "director", ref: directorId, refType: "AGENT", refScope: "SHARED" }],
        handoffs: [] } });
    const orgDefinitionId = org.createAgentOrgDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentOrgDefinition(id: $id) }", { id: orgDefinitionId }));
    const created = await graphql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: orgDefinitionId, rootConfiguration: { runtimeKind: "antigravity_cli",
        llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: false, workspaceRootPath: workspace },
      agentOverrides: [], teamOverrides: [] } });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    cleanup.push(() => graphql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId }));
    const config = await graphql<{ getAgentOrgRunConfig: { executionTree: { rootOrg: { members: Array<Record<string, unknown>> } } } }>(
      "query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }", { orgRunId });
    const director = config.getAgentOrgRunConfig.executionTree.rootOrg.members.find((m) => m["address"] === "/director");
    const directorRunId = String(director?.["agentRunId"]);
    const { socket, frames } = await open(`/ws/agent-org/${orgRunId}`);
    await until(frames, "org active", (f) => f.type === "ROOT_LIFECYCLE" && f.payload["is_active"] === true);

    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
      target_agent_run_id: directorRunId, command_id: randomUUID(), content: "hello director", context_file_paths: [],
      image_urls: [], message_id: randomUUID(), dedupe_key: randomUUID() } }));
    await until(frames, "director turn", (f) => f.type === "ROOT_EXECUTION_EVENT"
      && JSON.stringify(f.payload).includes("TURN_COMPLETED") && JSON.stringify(f.payload).includes(directorRunId));
    const [launch] = await launchesFor(directorRunId);
    expect(launch?.argv).toContain(SKIP_PERMISSIONS);
    socket.close();
  }, 90_000);

  it("E06: a child started by an AGY agent's delegate_task call, configured with auto-approve off, runs with skip-permissions (AC-006)", async () => {
    const workspace = await createWorkspace("delegation");
    const coordinatorId = await createAgent("coordinator", { toolNames: ["delegate_task"] });
    const helperId = await createAgent("helper");
    const team = await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `agy-delegation-team-${randomUUID().slice(0, 8)}`, description: "AGY delegation team",
        instructions: "Delegate when asked.", coordinatorMemberName: "coordinator", nodes: [
          { memberName: "coordinator", ref: coordinatorId, refScope: "SHARED" },
          { memberName: "helper", ref: helperId, refScope: "SHARED" }] } });
    const teamDefinitionId = team.createAgentTeamDefinition.id;
    cleanup.push(() => graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id: teamDefinitionId }));
    const off = { llmModelIdentifier: MODEL, llmConfig: {}, autoExecuteTools: false, runtimeKind: "antigravity_cli", workspaceRootPath: workspace };
    const created = await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...off }], memberConfigs: [
        { memberAddress: "/coordinator", agentDefinitionId: coordinatorId, ...off },
        { memberAddress: "/helper", agentDefinitionId: helperId, ...off }] } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    cleanup.push(() => graphql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId }));
    const resume = await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }", { teamRunId });
    const members = new Map(flattenE2eConfiguredAgentExecutions(resume.getTeamRunResumeConfig.executionTree)
      .map((member) => [member.memberName, member.agentRunId]));
    const { socket, frames } = await open(`/ws/agent-team/${teamRunId}`);

    const args = { recipient_address: "/helper", description: "Reply OK." };
    sendE2eSendMessageCommand(socket, { agent_run_id: members.get("coordinator"), content: `DELEGATE:${JSON.stringify(args)}` });
    const reply = await until(frames, "delegation result", (f) => JSON.stringify(f.payload).includes("DELEGATED:"));
    const childRunId = /target_agent_run_id\\+":\\+"([^"\\]+)/.exec(JSON.stringify(reply.payload))?.[1];
    expect(childRunId, JSON.stringify(reply.payload)).toBeTruthy();
    expect(childRunId).not.toBe(members.get("helper"));
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && (await launchesFor(childRunId!)).length === 0) await wait(200);
    const [child] = await launchesFor(childRunId!);
    expect(child?.argv).toContain(SKIP_PERMISSIONS);
    expect((await launchesFor(members.get("coordinator")!))[0]?.argv).toContain(SKIP_PERMISSIONS);
    socket.close();
  }, 90_000);

  it("E07: a linked run resumes after its skill folder was deleted, without that skill and with a warning (AC-008, AC-006)", async () => {
    const doomedRoot = await createSkill("doomed-skill", "DOOMED-5521");
    const workspace = await createWorkspace("resume-deleted");
    const agentId = await createAgent("resume-deleted", { skillNames: ["doomed-skill"] });
    const runId = await prepareRun(agentId, workspace);
    expect(reportedSkills(await ask(runId, "READ_SKILLS")).map((s) => s.name)).toEqual(["doomed-skill"]);
    const [first] = await launchesFor(runId);
    expect((await terminate(runId)).terminateAgentRun.success).toBe(true);

    await fs.rm(doomedRoot, { recursive: true, force: true });
    const frames = await ask(runId, "READ_SKILLS");

    expect(reportedSkills(frames)).toEqual([]);
    await expect(fs.lstat(path.join(capsule(runId), ".agents", "skills", "doomed-skill"))).rejects.toThrow();
    expect(warnings.some((line) => line.includes("skipped on restore") && line.includes(`run=${runId}`)
      && line.includes("skill=doomed-skill") && line.includes("disposition=skipped-missing-source"))).toBe(true);
    const resumed = (await launchesFor(runId))[1];
    expect(first?.argv).toContain("--new-project");
    expect(resumed?.argv).toContain("--conversation");
    expect(resumed?.argv).toContain(SKIP_PERMISSIONS);
  }, 90_000);

  it("E08: a run created before this change, with a copied skill folder and auto-approve stored off, resumes as before (AC-009, AC-006)", async () => {
    const legacyRoot = await createSkill("legacy-skill", "LEGACY-3307");
    const workspace = await createWorkspace("resume-legacy");
    const agentId = await createAgent("resume-legacy", { skillNames: ["legacy-skill"] });
    const runId = await prepareRun(agentId, workspace);
    await ask(runId, "hello");
    expect((await terminate(runId)).terminateAgentRun.success).toBe(true);
    // Pre-change capsule layout: the skill entry is a copied real folder; the manifest shape is unchanged.
    const entry = path.join(capsule(runId), ".agents", "skills", "legacy-skill");
    await fs.unlink(entry);
    await fs.cp(legacyRoot, entry, { recursive: true });
    await fs.writeFile(path.join(entry, "marker.md"), "COPIED-LEGACY-3307\n");

    const frames = await ask(runId, "READ_SKILLS");

    expect(reportedSkills(frames)).toEqual([expect.objectContaining({ name: "legacy-skill", symlink: false,
      skillMd: expect.stringContaining("SKILL-MD-LEGACY-3307"), marker: "COPIED-LEGACY-3307" })]);
    expect(warnings.some((line) => line.includes(`run=${runId}`) && line.includes("skipped"))).toBe(false);
    const resumed = (await launchesFor(runId))[1];
    expect(resumed?.argv).toContain("--conversation");
    expect(resumed?.argv).toContain(SKIP_PERMISSIONS);
    expect(await fs.readFile(path.join(legacyRoot, "marker.md"), "utf8")).toBe("SIBLING-LEGACY-3307\n");
  }, 90_000);
});
