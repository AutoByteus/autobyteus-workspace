import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// The retired built-in Project Task Manager through both actual built startup entrypoints (Studio
// `dist/app.js`, standalone host `dist/index.js`): the registered STARTUP_ONLY migration
// `20261006_remove_built_in_project_task_manager` over the real SQLite record store, the built-in
// bootstrap, the agent catalog, run history, WebSocket continue and `@` candidates.
// Only the external LM Studio inference service is emulated, and only to create real run history.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
const MIGRATION_ID = "20261006_remove_built_in_project_task_manager";
const RETIRED_ID = "autobyteus-project-task-manager";
const REPOSITORY_ID = "project-task-manager";
const BUILT_IN_IDS = ["autobyteus-daily-assistant", "autobyteus-retrospective-skill-improver"];
const FAILED_MESSAGE = "The retired built-in Project Task Manager folder could not be removed; the cleanup retries on the next start.";
const installedCopyFixture = fileURLToPath(new URL("../../fixtures/app-data-migrations/retired-built-in-project-task-manager", import.meta.url));

type Event = { type: string; payload: Record<string, any> };
type Gql = { errors?: Array<{ message: string }>; data: any };

let root = "";
let provider: http.Server | null = null;
let providerOrigin = "http://127.0.0.1:1";
const children: ChildProcess[] = [];
const logs: string[] = [];

const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-4000)}`);
};
const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  try { await exited; } finally { clearTimeout(force); }
};
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);
const installedCopy = () => path.join(root, "agents", RETIRED_ID);
const packageRoot = () => path.join(root, "agent-repository");

/** Only this test-owned root: private HOME, database, package root and emulated provider; no inherited AUTOBYTEUS_* values. */
const environment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
    .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  return Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: packageRoot(), LMSTUDIO_HOSTS: providerOrigin });
};

/** A beta install's data folder plus a configured agent repository that ships `project-task-manager`. */
const setupRoot = async (options: { installedCopy: boolean }) => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "retired-ptm-startup-e2e-"));
  await fs.mkdir(path.join(root, "home"));
  await fs.mkdir(path.join(root, "workspace"));
  await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
  const repository = path.join(packageRoot(), "agents", REPOSITORY_ID);
  await fs.mkdir(path.join(repository, "skills", "project-task-management"), { recursive: true });
  await fs.writeFile(path.join(repository, "agent.md"), "---\nname: Project Task Manager\ndescription: Agent-repository Project Task Manager.\nrole: Project Task Manager\n---\n\nManage Projects with the project-task-management skill.\n");
  await fs.writeFile(path.join(repository, "agent-config.json"), JSON.stringify({ toolNames: ["list_projects", "list_project_tasks"], skillNames: ["project-task-management"] }));
  await fs.writeFile(path.join(repository, "skills", "project-task-management", "SKILL.md"), "---\nname: project-task-management\ndescription: Manage Project Tasks.\n---\n\n# Project task management\n");
  if (options.installedCopy) {
    // The exact bytes the beta bootstrapper copied into app data (see the fixture README).
    await fs.mkdir(installedCopy(), { recursive: true });
    for (const file of ["agent.md", "agent-config.json"]) await fs.copyFile(path.join(installedCopyFixture, file), path.join(installedCopy(), file));
  }
};

/** The installed copy cannot be removed: its entries cannot be unlinked while the folder is read-only. */
const blockRemoval = (blocked: boolean) => fs.chmod(installedCopy(), blocked ? 0o555 : 0o755);

/** Relative path → sha256 of every file under a directory (directories listed with a trailing slash). */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (current: string) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name), rel = path.relative(dir, full);
      if (entry.isDirectory()) { out[`${rel}/`] = "dir"; await walk(full); }
      else out[rel] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(dir);
  return out;
};

const startProvider = async () => {
  provider = http.createServer(async (req, res) => {
    if (req.url === "/api/v1/models") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: "retired-ptm-fixture", max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] }));
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    if (req.url !== "/v1/chat/completions") { res.writeHead(404); res.end(); return; }
    const last = JSON.parse(body).messages.at(-1);
    const prompt = typeof last?.content === "string" ? last.content : JSON.stringify(last?.content ?? "");
    res.writeHead(200, { "content-type": "text/event-stream" });
    const base = { id: randomUUID(), object: "chat.completion.chunk", created: 1, model: "retired-ptm-fixture" };
    for (const choice of [
      { index: 0, delta: { role: "assistant", content: `Reply to: ${prompt.includes("launch") ? "launch plan" : "field notes"}` }, finish_reason: null },
      { index: 0, delta: {}, finish_reason: "stop" },
    ]) res.write(`data: ${JSON.stringify({ ...base, choices: [choice] })}\n\n`);
    res.end("data: [DONE]\n\n");
  });
  provider.listen(0, "127.0.0.1"); await once(provider, "listening");
  providerOrigin = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;
};

const studio = async () => {
  await fs.access(path.resolve("dist/app.js"));
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { env: environment(), stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Studio startup exited: ${logs[index]}`);
    return logs[index]!.includes("Server listening on 127.0.0.1:0");
  }, "Studio readiness");
  // The private MCP listener appears first; Studio is the last listener.
  const origin = [...logs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const raw = async (query: string, variables: Record<string, unknown> = {}): Promise<Gql> => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    expect(response.status).toBe(200);
    return await response.json() as Gql;
  };
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const result = await raw(query, variables);
    expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
    return result.data;
  };
  const migration = async () => (await gql("{getAppDataMigrations{migrationId status attempts recoveryAction canRetry requiredOnStartup summary errorMessage logPath}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === MIGRATION_ID);
  const catalog = async (): Promise<Array<{ id: string; name: string }>> => (await gql("{agentDefinitions{id name}}")).agentDefinitions;
  const health = async () => (await fetch(`${origin}/rest/health`)).status;
  /** Connects like the Chat view and sends one message; resolves with every event until the outcome settles. */
  const send = async (runId: string, content: string, settled: (events: Event[]) => boolean): Promise<Event[]> => {
    const ws = new WebSocket(`${origin.replace("http:", "ws:")}/ws/agent/${runId}`);
    const events: Event[] = [];
    ws.on("message", data => events.push(JSON.parse(String(data))));
    try {
      await until(() => events.some(e => e.type === "CONNECTED"), "socket connected", 30_000);
      sendE2eSendMessageCommand(ws, { content });
      await until(() => settled(events), `send outcome for ${runId}`, 30_000);
      return events;
    } finally { const closed = once(ws, "close"); ws.close(); await closed; }
  };
  return { child, origin, raw, gql, migration, catalog, health, send, text: () => logs[index]! };
};
type Studio = Awaited<ReturnType<typeof studio>>;

const projectTaskManagers = (catalog: Array<{ id: string; name: string }>) =>
  catalog.filter(definition => definition.name === "Project Task Manager").map(definition => definition.id).sort();
const answered = (events: Event[]) => {
  const error = events.find(e => e.type === "ERROR");
  if (error) throw new Error(JSON.stringify(error));
  return events.some(e => e.type === "ASSISTANT_COMPLETE") && events.some(e => e.type === "AGENT_STATUS" && e.payload.status === "idle");
};
const fixtureModel = async (app: Studio): Promise<string> => {
  await app.gql(`mutation($value:String!){updateServerSetting(key:"LMSTUDIO_HOSTS",value:$value)}`, { value: providerOrigin });
  const reloaded = await app.gql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
  const model = reloaded.reloadProviderModelCatalog.llmModels.find((m: { modelIdentifier: string }) => m.modelIdentifier.startsWith("retired-ptm-fixture:"))?.modelIdentifier;
  expect(model).toBeTruthy();
  return model;
};
const createRun = async (app: Studio, agentDefinitionId: string, model: string) => {
  const created = (await app.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: {
    agentDefinitionId, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: false, runtimeKind: "autobyteus", workspaceRootPath: path.join(root, "workspace") } })).createAgentRun;
  expect(created.success, created.message).toBe(true);
  return created.runId as string;
};
const terminate = async (app: Studio, runId: string) =>
  expect((await app.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: runId })).terminateAgentRun.success).toBe(true);
const historyGroup = async (app: Studio, agentDefinitionId: string) =>
  (await app.gql("{listWorkspaceRunHistory(limitPerAgent:20){agentDefinitions{agentDefinitionId agentName runs{runId status isActive}}}}"))
    .listWorkspaceRunHistory.flatMap((workspace: { agentDefinitions: unknown[] }) => workspace.agentDefinitions)
    .find((group: { agentDefinitionId: string }) => group.agentDefinitionId === agentDefinitionId);
const conversationText = async (app: Studio, runId: string) =>
  JSON.stringify((await app.gql(`query($id:String!){getRunProjection(runId:$id){runId conversation}}`, { id: runId })).getRunProjection.conversation);

const standalone = async (name: string): Promise<{ text: string; projectTaskManagers: string[] }> => {
  const app = path.join(root, "host-fixture-package", "applications", "fixture");
  await fs.mkdir(path.join(app, "ui"), { recursive: true }); await fs.mkdir(path.join(app, "backend"), { recursive: true });
  await fs.writeFile(path.join(app, "ui/index.html"), "<!doctype html><html><body>startup witness</body></html>");
  await fs.writeFile(path.join(app, "application.json"), JSON.stringify({ manifestVersion: "5", id: "fixture", name: "Fixture", ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "6" }, backend: { bundleManifest: "backend/bundle.json" }, executionResourceSlots: [], agentTools: [] }));
  await fs.writeFile(path.join(app, "backend/bundle.json"), JSON.stringify({ contractVersion: "1", entryModule: "backend/entry.mjs", moduleFormat: "esm", distribution: "self-contained", targetRuntime: { engine: "node", semver: ">=22 <23" }, sdkCompatibility: { backendDefinitionContractVersion: "7", frontendSdkContractVersion: "6" }, supportedExposures: { queries: false, commands: false, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
  await fs.writeFile(path.join(app, "backend/entry.mjs"), "export default {definitionContractVersion:'7'};\n");
  const entry = path.join(root, name);
  // The host's own agent catalog (the singleton its startup bootstrapped), read in the host process.
  await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${JSON.stringify(pathToFileURL(path.resolve("dist/index.js")).href)};
    import {AgentDefinitionService} from ${JSON.stringify(pathToFileURL(path.resolve("dist/agent-definition/services/agent-definition-service.js")).href)};
    const host=await startStandaloneApplicationHost(${JSON.stringify({ packageRoot: path.join(root, "host-fixture-package"), localApplicationId: "fixture", appDataDir: root, host: "127.0.0.1", port: 0 })});
    if((await fetch(host.url+'/_autobyteus/health')).status!==200)throw Error('Health failed');
    const visible=await AgentDefinitionService.getInstance().getVisibleAgentDefinitions();
    console.log('PTM_IDS='+JSON.stringify(visible.filter(d=>d.name==='Project Task Manager').map(d=>d.id).sort()));
    await host.close();process.exit(0);`);
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [entry], { env: environment(), timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    const text = stdout + stderr;
    return { text, projectTaskManagers: JSON.parse(/PTM_IDS=(\[.*\])/.exec(text)![1]!) };
  } catch (error) {
    const failed = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`${failed.message}\n${failed.stdout}\n${failed.stderr}`);
  }
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (provider) { const closed = once(provider, "close"); provider.close(); provider.closeAllConnections(); await closed; provider = null; }
  if (root) {
    if (await exists(installedCopy())) await blockRemoval(false);
    await fs.rm(root, { recursive: true, force: true });
  }
  root = "";
});

describe("retired built-in Project Task Manager at the actual startup entrypoints", () => {
  it("E-001 Studio upgrade: removes the installed copy once, lists one Project Task Manager and does not rerun on restart", async () => {
    await setupRoot({ installedCopy: true });
    const userAgent = path.join(root, "agents", "field-notes-writer");
    await fs.mkdir(userAgent, { recursive: true });
    await fs.writeFile(path.join(userAgent, "agent.md"), "---\nname: Field Notes Writer\ndescription: User agent.\nrole: Writer\n---\n\nWrite field notes.\n");
    await fs.writeFile(path.join(userAgent, "agent-config.json"), JSON.stringify({ toolNames: [] }));
    const preserved = { repository: await snapshot(packageRoot()), userAgent: await snapshot(userAgent) };

    const first = await studio();
    expect(await first.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1, requiredOnStartup: true, recoveryAction: "NONE", errorMessage: null,
      summary: "Scanned 1; migrated 1; skipped 0; failed 0." });
    expect(await fs.readFile((await first.migration()).logPath, "utf8")).toContain("Removed.");
    expect(await exists(installedCopy())).toBe(false);
    const catalog = await first.catalog();
    expect(projectTaskManagers(catalog)).toEqual([REPOSITORY_ID]);
    expect(catalog.map(d => d.id)).toEqual(expect.arrayContaining([...BUILT_IN_IDS, "field-notes-writer"]));
    expect(catalog.some(d => d.id === RETIRED_ID)).toBe(false);
    expect({ repository: await snapshot(packageRoot()), userAgent: await snapshot(userAgent) }).toEqual(preserved);
    await stop(first.child);

    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(await exists(installedCopy())).toBe(false);
    expect(projectTaskManagers(await second.catalog())).toEqual([REPOSITORY_ID]);
    expect({ repository: await snapshot(packageRoot()), userAgent: await snapshot(userAgent) }).toEqual(preserved);
  }, 180_000);

  it("E-002 Studio: a failed removal never blocks work and retries on restart; the old conversation stays readable and cannot be continued", async () => {
    await setupRoot({ installedCopy: true });
    await startProvider();
    await blockRemoval(true);

    // 1. Removal fails: the app starts and serves; the failure is recorded with a restart-only recovery.
    const failed = await studio();
    expect(await failed.migration()).toMatchObject({ status: "FAILED", attempts: 1, recoveryAction: "RESTART_TO_RETRY", canRetry: false, errorMessage: FAILED_MESSAGE });
    expect(await fs.readFile((await failed.migration()).logPath, "utf8")).toContain("Could not remove");
    const manual = (await failed.gql(`mutation($id:String!){runAppDataMigration(migrationId:$id){success message migration{status}}}`, { id: MIGRATION_ID })).runAppDataMigration;
    expect(manual).toMatchObject({ success: false, migration: null });
    expect(await failed.health()).toBe(200);
    expect(await exists(path.join(installedCopy(), "agent.md"))).toBe(true);
    // Until a later start succeeds, the copy is still listed (the accepted SCN-003 consequence), and the user can chat with it.
    expect(projectTaskManagers(await failed.catalog())).toEqual([RETIRED_ID, REPOSITORY_ID]);
    const model = await fixtureModel(failed);
    const oldRunId = await createRun(failed, RETIRED_ID, model);
    await failed.send(oldRunId, "Plan my launch Project.", answered);
    await terminate(failed, oldRunId);
    const userAgentId = (await failed.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`, { input: {
      name: "Field Notes Writer", role: "Writer", description: "User agent", instructions: "Reply briefly.", toolNames: [] } })).createAgentDefinition.id;
    const otherRunId = await createRun(failed, userAgentId, model);
    await failed.send(otherRunId, "Write field notes.", answered);
    await terminate(failed, otherRunId);
    const projectId = (await failed.gql(`mutation{createProject(input:{name:"Launch"}){projectId}}`)).createProject.projectId;
    await stop(failed.child);

    // 2. The folder can be removed again: the next start retries and succeeds; everything else is byte-identical.
    await blockRemoval(false);
    const preserved = async () => ({ repository: await snapshot(packageRoot()), userAgent: await snapshot(path.join(root, "agents", userAgentId)),
      projects: await snapshot(path.join(root, "projects")), oldRun: await snapshot(path.join(root, "memory", "agents", oldRunId)),
      otherRun: await snapshot(path.join(root, "memory", "agents", otherRunId)) });
    const before = await preserved();
    const retried = await studio();
    expect(await retried.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 2, recoveryAction: "NONE", errorMessage: null });
    expect(await exists(installedCopy())).toBe(false);
    expect(await preserved()).toEqual(before);
    const catalog = await retried.catalog();
    expect(projectTaskManagers(catalog)).toEqual([REPOSITORY_ID]);
    expect(catalog.map(d => d.id)).toEqual(expect.arrayContaining([...BUILT_IN_IDS, userAgentId]));
    expect((await retried.gql("{projects{projectId name}}")).projects).toEqual([{ projectId, name: "Launch" }]);

    // 3. AC-008: the old conversation is listed under its stored name and its messages read back.
    expect(await historyGroup(retried, RETIRED_ID)).toMatchObject({ agentName: "Project Task Manager", runs: [{ runId: oldRunId, isActive: false }] });
    const oldConversation = await conversationText(retried, oldRunId);
    expect(oldConversation).toContain("Plan my launch Project.");
    expect(oldConversation).toContain("Reply to: launch plan");

    // Continuing it is rejected like any deleted agent (definition not found); nothing else is affected.
    const rejected = await retried.send(oldRunId, "Continue the plan.", events => events.some(e => e.type === "AGENT_COMMAND_ACK"));
    const ack = rejected.find(e => e.type === "AGENT_COMMAND_ACK")!.payload;
    expect(ack).toMatchObject({ accepted: false, state: "failed", code: "RUN_NOT_FOUND", run_id: oldRunId });
    expect(String(ack.message)).toContain(`AgentDefinition with ID ${RETIRED_ID} not found`);
    expect(rejected.some(e => e.type === "ASSISTANT_COMPLETE")).toBe(false);
    expect(await retried.health()).toBe(200);
    expect(await historyGroup(retried, RETIRED_ID)).toMatchObject({ runs: [{ runId: oldRunId, isActive: false }] });
    expect(await conversationText(retried, oldRunId)).toBe(oldConversation);

    // Another stopped conversation continues normally, and new work starts.
    const continued = await retried.send(otherRunId, "Write more field notes.", answered);
    expect(continued.some(e => e.type === "ASSISTANT_COMPLETE")).toBe(true);
    expect(await conversationText(retried, otherRunId)).toContain("Write more field notes.");

    // AC-009: the remaining built-ins stay excluded from `@`; the repository manager is an ordinary candidate.
    const candidates = (await retried.gql(`query($id:String!){collaboratorMentionCandidates(rootSubjectKind:"agent",rootRunId:$id,focusedAgentRunId:$id){availability candidates{kind definitionId}}}`, { id: otherRunId }))
      .collaboratorMentionCandidates;
    expect(candidates.availability).toBe("AVAILABLE");
    const candidateIds = candidates.candidates.map((c: { definitionId: string }) => c.definitionId);
    expect(candidateIds).toContain(REPOSITORY_ID);
    for (const excluded of [...BUILT_IN_IDS, RETIRED_ID]) expect(candidateIds).not.toContain(excluded);
  }, 240_000);

  it("E-003 Studio fresh install: creates no installed copy and records nothing to remove", async () => {
    await setupRoot({ installedCopy: false });

    const first = await studio();
    expect(await first.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1, summary: "Scanned 1; migrated 0; skipped 1; failed 0." });
    expect(await fs.readFile((await first.migration()).logPath, "utf8")).toContain("Not present.");
    expect((await fs.readdir(path.join(root, "agents"))).sort()).toEqual(BUILT_IN_IDS);
    const catalog = await first.catalog();
    expect(catalog.some(d => d.id === RETIRED_ID)).toBe(false);
    expect(projectTaskManagers(catalog)).toEqual([REPOSITORY_ID]);
    await stop(first.child);

    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect((await fs.readdir(path.join(root, "agents"))).sort()).toEqual(BUILT_IN_IDS);
  }, 180_000);

  it("E-004 standalone host first: a failed removal never blocks the host, the next host start removes it, and Studio shares the record", async () => {
    await setupRoot({ installedCopy: true });
    await blockRemoval(true);

    const blocked = await standalone("blocked.mjs");
    expect(await exists(path.join(installedCopy(), "agent.md"))).toBe(true);
    expect(blocked.projectTaskManagers).toEqual([RETIRED_ID, REPOSITORY_ID]);

    await blockRemoval(false);
    const removed = await standalone("removed.mjs");
    expect(await exists(installedCopy())).toBe(false);
    expect(removed.projectTaskManagers).toEqual([REPOSITORY_ID]);

    const app = await studio();
    expect(await app.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 2 });
    expect(projectTaskManagers(await app.catalog())).toEqual([REPOSITORY_ID]);
    expect(await exists(installedCopy())).toBe(false);
  }, 240_000);
});
