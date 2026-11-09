import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

/**
 * Personal tools reach the agents that actually run (autobyteus-95 stage 1, AC-006, AC-001; DS-001, DS-004), through
 * the real Studio HTTP/GraphQL/WebSocket server, the definition services, delegation and each run's scoped Agent Tools
 * MCP. A local agent package (a git checkout) holds an agent and a Team with a team-local coordinator; their personal
 * tools are set through the renderer's update mutation. The runtime is the scripted AGY CLI
 * (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `LIST_TOOLS` replies with the tools the run's Agent Tools MCP
 * session exposes, and `CALL_TOOL:{…}` calls a real tool. No model, no provider.
 * Cases: API-10a a standalone run of the package agent has its effective tools; API-10b a running agent takes a
 * personal change without a restart (the shared announce → tool-list updates); API-10c a delegated copy of the agent;
 * API-10d a delegated copy of the Team, whose team-local coordinator has its effective tools; API-10e the package
 * checkout stays clean (`git status`) and the record is in personal-settings.json.
 * Run (a disposable HOME, as TESTING.md asks for E2E):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *     ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/personal-settings/personal-tools-in-runs.e2e.test.ts --no-watch
 * PERSONAL_TOOLS_E2E_EVIDENCE_DIR keeps a JSON receipt.
 */
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const AGY = "antigravity_cli";
const MODEL = "gemini-3.8-flash-low";
type Rec = Record<string, any>;

const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
const stringsWith = (conversation: unknown, prefix: string): string[] => objectsIn(conversation).flatMap((record) => Object.values(record))
  .filter((value): value is string => typeof value === "string" && value.startsWith(prefix));
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called, isError: raw.isError === true }; }
};

suite("Personal tools in the runs that use them (real HTTP/WS/GraphQL, delegation, scoped Agent Tools MCP; scripted AGY)", () => {
  let base = "", dataDir = "", workspace = "", packageRoot = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  let managerId = "";
  let workerRunId = "";

  const graphql = async <T = any>(query: string, variables?: Rec): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const write = async (file: string, content: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content); };
  const writeAgent = (dir: string, name: string, toolNames: string[]) => Promise.all([
    write(path.join(dir, "agent.md"), `---\nname: ${name}\ndescription: ${name} agent\n---\n\nFollow the user's request.\n`),
    write(path.join(dir, "agent-config.json"), `${JSON.stringify({ toolNames, skillNames: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`),
  ]);
  const git = (...args: string[]) => spawnSync("git", args, { cwd: packageRoot, encoding: "utf8" });
  const conversation = async (runId: string) => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
  const toolsOf = (text: string) => (JSON.parse(text.slice("TOOLS:".length)) as Rec[]).map((tool) => tool.name as string).sort();
  /** Sends one message to a run and returns the run's newest reply starting with `prefix`. */
  const openRun = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Rec[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "run stream ready");
    const ask = async (content: string, prefix: string, ms = 60_000) => {
      const before = stringsWith(await conversation(runId), prefix).length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      let replies: string[] = [];
      await until(async () => { replies = stringsWith(await conversation(runId), prefix); return replies.length > before; }, `${prefix} reply to ${content.slice(0, 60)}`, ms);
      return replies[replies.length - 1]!;
    };
    return { ask };
  };
  const startRun = async (agentDefinitionId: string) => {
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    runIds.push(created.runId);
    return created.runId as string;
  };
  /** The tools a delegated copy's first turn listed (its first message carries `LIST_TOOLS`); read from the host's collaboration. */
  const copyTools = async (hostRunId: string, memberAddress: string, runId: string) => {
    const copyConversation = async () => (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: hostRunId, a: memberAddress, r: runId })).agentRunCollaborationMemberProjection?.conversation;
    let text: string | undefined;
    await until(async () => { text = stringsWith(await copyConversation(), "TOOLS:")[0]; return Boolean(text); }, `the copy ${memberAddress} ${runId}'s tool list`, 90_000);
    return toolsOf(text!);
  };
  const setTools = (id: string, toolNames: string[]) =>
    graphql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id toolNames personalSettings}}`, { input: { id, toolNames } });

  beforeAll(async () => {
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "personal-tools-e2e-")));
    dataDir = path.join(base, "server-data");
    workspace = path.join(base, "workspace");
    packageRoot = path.join(base, "pps-local-package");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    // A local package the author keeps in git: an agent, and a Team whose coordinator is team-local.
    await writeAgent(path.join(packageRoot, "agents", "pps-worker"), "PPS Worker", ["list_projects", "list_project_tasks"]);
    await write(path.join(packageRoot, "agent-teams", "pps-crew", "team.md"), "---\nname: PPS Crew\ndescription: PPS Crew team\n---\n\nCoordinate.\n");
    await write(path.join(packageRoot, "agent-teams", "pps-crew", "team-config.json"), `${JSON.stringify({ coordinatorMemberName: "lead",
      members: [{ memberName: "lead", ref: "lead", refScope: "team_local" }, { memberName: "worker", ref: "pps-worker", refScope: "shared" }],
      handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
    await writeAgent(path.join(packageRoot, "agent-teams", "pps-crew", "agents", "lead"), "PPS Lead", ["list_projects"]);
    for (const args of [["init", "-q"], ["add", "-A"], ["-c", "user.email=e2e@example.invalid", "-c", "user.name=e2e", "commit", "-qm", "package"]]) {
      expect(git(...args).status).toBe(0);
    }
    for (const [key, value] of Object.entries({ AGY_FAKE_CASE: "linked_skills", AUTOBYTEUS_AGENT_PACKAGE_ROOTS: undefined, AUTOBYTEUS_SKILLS_PATHS: undefined })) {
      savedEnv.set(key, process.env[key]);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    await graphql(`mutation($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId}}`, { input: { sourceKind: "LOCAL_PATH", source: packageRoot } });
    managerId = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: "PPS Manager", role: "manager", description: "Delegates (personal tools E2E)", instructions: "Delegate.", toolNames: ["delegate_task"] } })).createAgentDefinition.id;
  }, 120_000);

  afterAll(async () => {
    for (const runId of runIds) await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: runId }).catch(() => undefined);
    for (const socket of sockets) socket.terminate();
    if (app) await app.close();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env.PERSONAL_TOOLS_E2E_EVIDENCE_DIR;
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "personal-tools-in-runs.json"), `${JSON.stringify(evidence, null, 2)}\n`);
    }
    if (base) await fs.rm(base, { recursive: true, force: true });
  }, 120_000);

  it("API-10a (AC-006, AC-001): a run of the package agent has the effective tools: a personal tool added, a package tool removed", async () => {
    // Without personal settings the run has the package's tools.
    const baseline = await startRun("pps-worker");
    expect(toolsOf(await (await openRun(baseline)).ask("LIST_TOOLS", "TOOLS:"))).toEqual(expect.arrayContaining(["list_project_tasks", "list_projects"]));

    const saved = (await setTools("pps-worker", ["list_projects", "create_task"])).updateAgentDefinition;
    expect(saved).toMatchObject({ toolNames: ["list_projects", "create_task"], personalSettings: ["TOOLS"] });
    workerRunId = await startRun("pps-worker");
    const tools = toolsOf(await (await openRun(workerRunId)).ask("LIST_TOOLS", "TOOLS:"));
    expect(tools).toEqual(expect.arrayContaining(["create_task", "list_projects"]));
    expect(tools).not.toContain("list_project_tasks");
    evidence.api10a = { baselineRun: baseline, run: workerRunId, tools };
  }, 120_000);

  it("API-10b (DS-004, RUS-001): a running agent takes a personal tool change without a restart", async () => {
    await setTools("pps-worker", ["list_projects", "create_task", "update_task"]);
    const run = await openRun(workerRunId);
    let tools: string[] = [];
    await until(async () => { tools = toolsOf(await run.ask("LIST_TOOLS", "TOOLS:")); return tools.includes("update_task"); }, "the running agent's tools updated", 60_000);
    expect(tools).toEqual(expect.arrayContaining(["create_task", "list_projects", "update_task"]));
    expect(tools).not.toContain("list_project_tasks");
    evidence.api10b = { run: workerRunId, tools };
  }, 120_000);

  it("API-10c (AC-006): a delegated copy of the package agent has its effective tools", async () => {
    const managerRun = await startRun(managerId);
    const called = await (await openRun(managerRun)).ask(callTool("delegate_task", { recipient_address: `/${segment("PPS Worker")}`, description: "LIST_TOOLS" }), "CALLED:", 90_000);
    const result = toolResult(called.slice("CALLED:".length));
    expect(result.delegated, JSON.stringify(result)).toBe(true);
    runIds.push(result.target_agent_run_id);
    const tools = await copyTools(managerRun, `/${segment("PPS Worker")}`, result.target_agent_run_id);
    expect(tools).toEqual(expect.arrayContaining(["create_task", "list_projects", "update_task"]));
    expect(tools).not.toContain("list_project_tasks");
    evidence.api10c = { copy: result.target_agent_run_id, tools };
  }, 180_000);

  it("API-10d (AC-006): a delegated copy of the Team runs its team-local coordinator with the coordinator's effective tools", async () => {
    const leadId = "team-local-agent:pps-crew:lead";
    expect((await setTools(leadId, ["list_projects", "create_project"])).updateAgentDefinition).toMatchObject({ personalSettings: ["TOOLS"] });
    const managerRun = await startRun(managerId);
    const called = await (await openRun(managerRun)).ask(callTool("delegate_task", { recipient_address: `/${segment("PPS Crew")}`, description: "LIST_TOOLS" }), "CALLED:", 90_000);
    const result = toolResult(called.slice("CALLED:".length));
    expect(result.delegated, JSON.stringify(result)).toBe(true);
    const coordinator = result.target_team_coordinator_agent_run_id as string;
    const tools = await copyTools(managerRun, `/${segment("PPS Crew")}/lead`, coordinator);
    expect(tools).toEqual(expect.arrayContaining(["create_project", "list_projects"]));
    evidence.api10d = { team: result.target_team_run_id, coordinator, tools };
  }, 180_000);

  it("API-10e (AC-001): the package checkout stays clean; the personal tools are in personal-settings.json", async () => {
    expect(git("status", "--porcelain").stdout).toBe("");
    const settings = JSON.parse(await fs.readFile(path.join(dataDir, "agent-packages", "personal-settings.json"), "utf8"));
    expect(settings).toEqual({
      "agent:pps-worker": { toolsAdded: ["create_task", "update_task"], toolsRemoved: ["list_project_tasks"] },
      "agent:team-local-agent:pps-crew:lead": { toolsAdded: ["create_project"] },
    });
    evidence.api10e = { settings };
  }, 30_000);
});
