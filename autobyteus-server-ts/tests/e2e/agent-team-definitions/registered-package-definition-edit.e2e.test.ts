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
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Teams and Orgs of a registered agent package are edited in the app and saved into the package folder
// (imported-team-defaults-edit SR-003: REQ-001..REQ-003, AC-001..AC-006) through the real Studio HTTP/GraphQL/WebSocket
// server. The package is registered with the real `importAgentPackage` (LOCAL_PATH) mutation, as the user registers
// `autobyteus-agents`; every save goes through the same `update*Definition` mutations and full payload the edit pages send.
// Only the AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs `linked_skills`): `CALL_TOOL:{...}` makes the Manager
// call the real `delegate_task`; `AGY_FAKE_EXTRA_MODELS` offers the models the package Team default names.
// Cases: RPE-001 the Team default runtime/model and description are saved into `team-config.json`/`team.md` of the package;
// its team-local Agents stay; two consecutive saves with the returned revision both pass (no reload race with the package
// folder watcher); no "read-only" text. RPE-002 a stale revision conflicts and changes nothing. RPE-003 an Org of the
// package is saved into `org-config.json`. RPE-004 an Org-owned Team is still refused outside its Org save. RPE-005 a
// folder the disk refuses gives "read-only at source path". RPE-006 a running Manager delegates the package Team: the
// copy records and runs on the saved Team default; after another edit a new copy runs on the new default.
// RPE-007 a package Team is deleted from its package folder. RPE-008 a save keeps a team-local skill's relative link to a
// Team-shared file verbatim (the real Software Engineering Team has such links).
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-definitions/registered-package-definition-edit.e2e.test.ts --no-watch
// `REGISTERED_PACKAGE_EDIT_E2E_EVIDENCE_DIR` keeps a JSON receipt.
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actor's files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "rpe-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const AGY = "antigravity_cli";
const MODEL = "gemini-3.8-flash-low";
const SAVED = "rpe-saved-model";
const EDITED = "rpe-edited-model";
const TEAM_ID = "software-engineering-team";
const TEAM_NAME = "RPE Software Engineering Team";
const SPARE_ID = "spare-team";
const ORG_ID = "studio";
const SHARED_LINK = "../../../../../shared/design-examples.md";
type Rec = Record<string, any>;
type Frame = { type: string; payload: Rec };

const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const f = (record: Rec | null | undefined, key: string): any => !record ? undefined : key in record ? record[key] : record[snake(key)];
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
const teamCopyOf = (tree: unknown, coordinatorRunId: string) => objectsIn(tree).find((record) => f(record, "teamRunId") && f(record, "startedAt")
  && (record.members as Rec[] | undefined)?.some((member) => f(member, "agentRunId") === coordinatorRunId));
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called, isError: raw.isError === true }; }
};
const launchOf = (value: Rec | null | undefined) => value ? { runtimeKind: f(value, "runtimeKind"), model: f(value, "llmModelIdentifier") } : null;

const TEAM_FIELDS = "id name description instructions category coordinatorMemberName avatarUrl revision ownerPackageId "
  + "nodes { memberName ref refScope } handoffs { from to rules } defaultLaunchConfig { runtimeKind llmModelIdentifier llmConfig }";
const ORG_FIELDS = "id name description instructions category avatarUrl revision members { memberName ref refType refScope } "
  + "handoffs { from to rules } defaultLaunchConfig { runtimeKind llmModelIdentifier llmConfig }";

suite("Registered package Teams and Orgs are edited and saved into the package (real HTTP/GraphQL/WS, package import, scoped MCP; scripted AGY)", () => {
  let dataDir = "", pkgRoot = "", workspace = "", argvLog = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const roots: string[] = [];
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  const ids: Record<string, string> = {};
  const teamDir = () => path.join(pkgRoot, "agent-teams", TEAM_ID);
  const orgDir = () => path.join(pkgRoot, "agent-orgs", ORG_ID);

  const request = async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    return await response.json() as { data?: Rec; errors?: Array<{ message: string; extensions?: Rec }> };
  };
  const graphql = async (query: string, variables?: Record<string, unknown>): Promise<Rec> => {
    const body = await request(query, variables);
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const readTeam = async (id: string) => (await graphql(`query($id:String!){agentTeamDefinition(id:$id){${TEAM_FIELDS}}}`, { id })).agentTeamDefinition as Rec;
  const readOrg = async (id: string) => (await graphql(`query($id:String!){agentOrgDefinition(id:$id){${ORG_FIELDS}}}`, { id })).agentOrgDefinition as Rec;
  /** The Team edit page's save: the full current form with the edited fields, and the revision it loaded. */
  const saveTeam = (team: Rec, edits: Rec, expectedRevision = team.revision) => request(
    `mutation($input:UpdateAgentTeamDefinitionInput!){updateAgentTeamDefinition(input:$input){${TEAM_FIELDS}}}`, { input: {
      id: team.id, expectedRevision, name: team.name, description: team.description, instructions: team.instructions, category: team.category,
      coordinatorMemberName: team.coordinatorMemberName, avatarUrl: team.avatarUrl, handoffs: team.handoffs,
      nodes: (team.nodes as Rec[]).map(({ memberName, ref, refScope }) => ({ memberName, ref, refScope })),
      defaultLaunchConfig: team.defaultLaunchConfig, ...edits } });
  const saveOrg = (org: Rec, edits: Rec) => request(
    `mutation($input:UpdateAgentOrgDefinitionInput!){updateAgentOrgDefinition(input:$input){${ORG_FIELDS}}}`, { input: {
      id: org.id, expectedRevision: org.revision, name: org.name, description: org.description, instructions: org.instructions,
      category: org.category, avatarUrl: org.avatarUrl, handoffs: org.handoffs,
      members: (org.members as Rec[]).map(({ memberName, ref, refType, refScope }) => ({ memberName, ref, refType, refScope })),
      defaultLaunchConfig: org.defaultLaunchConfig, ...edits } });
  const fileJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8")) as Rec;
  const snapshot = async (dir: string) => {
    const out: Record<string, string> = {};
    const visit = async (current: string) => {
      for (const entry of await fs.readdir(current, { withFileTypes: true })) {
        const file = path.join(current, entry.name);
        if (entry.isDirectory()) await visit(file); else out[path.relative(dir, file)] = await fs.readFile(file, "utf8");
      }
    };
    await visit(dir);
    return out;
  };
  const writeDefinition = async (base: string, family: "agent" | "team" | "org", id: string, name: string, config: unknown) => {
    const dir = path.join(base, family === "agent" ? "agents" : `agent-${family}s`, id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${family}.md`), `---\nname: ${name}\ndescription: From the package\ncategory: engineering\n`
      + `${family === "agent" ? "role: Engineer\n" : ""}---\n\n${name}: follow the request.\n`);
    await fs.writeFile(path.join(dir, `${family}-config.json`), `${JSON.stringify(config, null, 2)}\n`);
    return dir;
  };
  const agentConfig = { toolNames: [], skillNames: [] };
  const teamConfig = { coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "lead", refScope: "team_local" },
    { memberName: "engineer", ref: "engineer", refScope: "team_local" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null };
  const agyLaunches = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => {
    const entry = JSON.parse(line) as { argv: string[]; cwd: string };
    const index = entry.argv.indexOf("--model");
    return { runId: /([^/]+)\/agy-project$/.exec(entry.cwd)?.[1] ?? entry.cwd, model: index >= 0 ? entry.argv[index + 1] ?? null : null };
  });

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpe-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    // The registered package, laid out like `autobyteus-agents`: a Team with team-local Agents, a spare Team, an Org with
    // an Org-owned Team.
    pkgRoot = path.join(await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "rpe-package-"))), "autobyteus-agents");
    const team = await writeDefinition(pkgRoot, "team", TEAM_ID, TEAM_NAME, teamConfig);
    await writeDefinition(team, "agent", "lead", "Lead", agentConfig);
    const engineer = await writeDefinition(team, "agent", "engineer", "Engineer", agentConfig);
    // Like the real Software Engineering Team: a team-local skill reference is a relative link to a Team-shared file.
    await fs.mkdir(path.join(team, "shared"), { recursive: true });
    await fs.writeFile(path.join(team, "shared", "design-examples.md"), "# Shared design examples\n");
    await fs.mkdir(path.join(engineer, "skills", "engineer", "references"), { recursive: true });
    await fs.writeFile(path.join(engineer, "skills", "engineer", "SKILL.md"), "---\nname: engineer\ndescription: Engineer skill\n---\n\nUse the references.\n");
    await fs.symlink(SHARED_LINK, path.join(engineer, "skills", "engineer", "references", "design-examples.md"));
    const spare = await writeDefinition(pkgRoot, "team", SPARE_ID, "RPE Spare Team", { ...teamConfig, members: [teamConfig.members[0]] });
    await writeDefinition(spare, "agent", "lead", "Spare Lead", agentConfig);
    ids.ownedTeam = buildAgentOrgOwnedDefinitionId("agent_team", ORG_ID, "squad");
    const org = await writeDefinition(pkgRoot, "org", ORG_ID, "RPE Studio", { members: [{ memberName: "group", ref: ids.ownedTeam,
      refType: "agent_team", refScope: "org_local" }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
    const owned = await writeDefinition(org, "team", "squad", "RPE Squad", { ...teamConfig, members: [teamConfig.members[0]] });
    await writeDefinition(owned, "agent", "lead", "Squad Lead", agentConfig);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const [key, value] of Object.entries({ AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: argvLog,
      AGY_FAKE_EXTRA_MODELS: `${SAVED},${EDITED}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: undefined })) {
      savedEnv.set(key, process.env[key]);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const imported = (await graphql(`mutation($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId path sourceKind agentTeamCount isDefault}}`,
      { input: { sourceKind: "LOCAL_PATH", source: pkgRoot } })).importAgentPackage as Rec[];
    evidence.importedPackages = imported;
    expect(imported.some((entry) => entry.path === pkgRoot && !entry.isDefault)).toBe(true);
    // The Manager's home Team lives in app data.
    const agent = async (name: string) => (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: name, instructions: "Follow the user's request.", toolNames: [] } })).createAgentDefinition.id;
    ids.manager = await agent("RPE Manager");
    ids.worker = await agent("RPE Worker");
    ids.home = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `RPE Home ${randomUUID().slice(0, 6)}`, description: "Home", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const rootId of roots) {
      const result = await graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId }).catch((error) => {
        errors.push(String(error)); return null; });
      if (result && !result.terminateAgentTeamRun.success) errors.push(result.terminateAgentTeamRun.message);
    }
    if (app) await app.close();
    await wait(1_000);
    const leftover = spawnSync("pgrep", ["-f", dataDir || "rpe-e2e-unset"], { encoding: "utf8" }).stdout.trim();
    if (dataDir && leftover) errors.push(`processes still referencing the data dir: ${leftover}`);
    if (pkgRoot) { await fs.chmod(teamDir(), 0o755).catch(() => undefined); await fs.rm(path.dirname(pkgRoot), { recursive: true, force: true }); }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    const dir = process.env["REGISTERED_PACKAGE_EDIT_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "registered-package-definition-edit.json"), `${JSON.stringify({ ...evidence, cleanup: {
        dataRemoved: await fs.access(dataDir).then(() => false, () => true), packageRemoved: await fs.access(pkgRoot).then(() => false, () => true),
        homeRemoved: !home || await fs.access(home).then(() => false, () => true), serverClosed: !app?.server.listening, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("RPE-001 (AC-001, REQ-001, REQ-003): the Team edit page's save writes the default runtime/model into the package", async () => {
    const before = await readTeam(TEAM_ID);
    expect(before).toMatchObject({ id: TEAM_ID, name: TEAM_NAME, defaultLaunchConfig: null });
    const teamLocalBefore = await snapshot(path.join(teamDir(), "agents"));
    const saved = await saveTeam(before, { description: "Edited in the app", defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: SAVED, llmConfig: null } });
    expect(saved.errors, JSON.stringify(saved.errors)).toBeUndefined();
    const team = saved.data!.updateAgentTeamDefinition as Rec;
    expect(team).toMatchObject({ id: TEAM_ID, description: "Edited in the app",
      defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: SAVED, llmConfig: null } });
    expect(team.revision).not.toBe(before.revision);
    const config = await fileJson(path.join(teamDir(), "team-config.json"));
    expect(config.defaultLaunchConfig).toMatchObject({ runtimeKind: AGY, llmModelIdentifier: SAVED });
    expect(config.members).toEqual(teamConfig.members);
    expect(await fs.readFile(path.join(teamDir(), "team.md"), "utf8")).toContain("description: Edited in the app");
    expect(await snapshot(path.join(teamDir(), "agents")), "team-local Agents untouched").toEqual(teamLocalBefore);
    // Nothing is written into app data for it.
    await expect(fs.access(path.join(dataDir, "agent-teams", TEAM_ID))).rejects.toThrow();
    // A second save right after, with the revision the first returned, still passes (no reload race with the folder watcher).
    await wait(1_500);
    const again = await saveTeam(team, { instructions: "Ship software, edited twice." });
    expect(again.errors, JSON.stringify(again.errors)).toBeUndefined();
    const reread = await readTeam(TEAM_ID);
    expect(reread).toMatchObject({ description: "Edited in the app", instructions: "Ship software, edited twice.",
      defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: SAVED } });
    expect(JSON.stringify(reread)).not.toMatch(/read-only|readonly/i);
    evidence.rpe001 = { before, saved: team, reread, teamConfig: config };
  });

  it("RPE-002 (AC-003): a stale revision conflicts and leaves the package unchanged", async () => {
    const current = await readTeam(TEAM_ID);
    const files = await snapshot(teamDir());
    const stale = await saveTeam(current, { description: "Concurrent edit" }, "stale-revision");
    expect(stale.errors?.[0]?.extensions, JSON.stringify(stale.errors)).toMatchObject({ code: "DEFINITION_REVISION_CONFLICT" });
    expect(await snapshot(teamDir())).toEqual(files);
    expect((await readTeam(TEAM_ID)).description).toBe("Edited in the app");
    evidence.rpe002 = stale.errors;
  });

  it("RPE-003 (AC-002): the Org edit page's save writes the Org default into the package", async () => {
    const org = await readOrg(ORG_ID);
    expect(org).toMatchObject({ id: ORG_ID, defaultLaunchConfig: null });
    const saved = await saveOrg(org, { description: "Org edited in the app", defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: SAVED, llmConfig: null } });
    expect(saved.errors, JSON.stringify(saved.errors)).toBeUndefined();
    expect(saved.data!.updateAgentOrgDefinition).toMatchObject({ description: "Org edited in the app",
      defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: SAVED } });
    expect((await fileJson(path.join(orgDir(), "org-config.json"))).defaultLaunchConfig).toMatchObject({ runtimeKind: AGY, llmModelIdentifier: SAVED });
    expect(await fs.readFile(path.join(orgDir(), "org.md"), "utf8")).toContain("description: Org edited in the app");
    await expect(fs.access(path.join(orgDir(), "agent-teams", "squad", "team-config.json"))).resolves.toBeUndefined();
    expect((await readOrg(ORG_ID)).defaultLaunchConfig).toMatchObject({ runtimeKind: AGY, llmModelIdentifier: SAVED });
    evidence.rpe003 = saved.data;
  });

  it("RPE-004 (AC-004): an Org-owned Team of the package still changes only through its Org", async () => {
    const owned = await readTeam(ids.ownedTeam!);
    expect(owned, "Org-owned Team is readable").toBeTruthy();
    const files = await snapshot(orgDir());
    const refused = await saveTeam(owned, { description: "Direct edit" });
    expect(JSON.stringify(refused.errors ?? refused.data)).toMatch(/atomic parent AgentOrg save/);
    const deleted = await request(`mutation($id:String!){deleteAgentTeamDefinition(id:$id){success message}}`, { id: ids.ownedTeam });
    // The service refuses deleting any non-shared Team before the provider is reached (its text names application-owned
    // Teams for every non-shared scope; unchanged by this ticket).
    expect(deleted.data?.deleteAgentTeamDefinition, JSON.stringify(deleted)).toMatchObject({ success: false,
      message: expect.stringMatching(/not supported/) });
    expect(await snapshot(orgDir())).toEqual(files);
    evidence.rpe004 = { update: refused.errors ?? refused.data, delete: deleted };
  });

  it.skipIf(process.getuid?.() === 0)("RPE-005 (AC-006): a package folder the disk refuses gives the read-only filesystem error", async () => {
    const current = await readTeam(TEAM_ID);
    await fs.chmod(teamDir(), 0o555);
    try {
      const refused = await saveTeam(current, { description: "Blocked by the disk" });
      expect(JSON.stringify(refused.errors ?? refused.data)).toMatch(/read-only at source path/);
      evidence.rpe005 = refused.errors;
    } finally {
      await fs.chmod(teamDir(), 0o755);
    }
    expect((await readTeam(TEAM_ID)).description).toBe("Edited in the app");
  });

  it("RPE-006 (AC-005, REQ-002): a delegated copy of the package Team runs on its saved default, and on a newly saved one", async () => {
    const config = { workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY };
    const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
        { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config },
        { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const rootId = created.teamRunId as string;
    roots.push(rootId);
    const tree = async () => (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
    const managerRunId = flattenE2eConfiguredAgentExecutions(await tree()).find((member) => member.memberAddress === "/manager")!.agentRunId;
    const socket = new WebSocket(`ws://${url.host}/ws/agent-team/${rootId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), "team stream ready");
    const conversation = async () => (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
      { id: rootId, a: managerRunId })).getTeamMemberRunProjection?.conversation;
    const managerCalls = async (content: string) => {
      const before = calledResults(await conversation()).length;
      sendE2eSendMessageCommand(socket, { agent_run_id: managerRunId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversation()); return results.length > before; }, "manager tool result", 90_000);
      return toolResult(results[before]!);
    };
    const delegatePackageTeam = async () => {
      const from = (await agyLaunches()).length;
      const result = await managerCalls(callTool("delegate_task", { recipient_address: `/${segment(TEAM_NAME)}`, description: "Ship the release notes." }));
      expect(result.delegated, JSON.stringify(result)).toBe(true);
      expect(result.target_kind).toBe("team");
      let copy: Rec | undefined;
      await until(async () => Boolean(copy = teamCopyOf(await tree(), result.target_team_coordinator_agent_run_id)), "copy of the package Team", 60_000);
      const coordinator = result.target_team_coordinator_agent_run_id as string;
      // The coordinator starts on the work it received; its AGY launch carries the model it resolved.
      await until(async () => (await agyLaunches()).slice(from).some((entry) => entry.runId === coordinator), "copy coordinator AGY launch", 60_000);
      const models = (await agyLaunches()).slice(from).filter((entry) => entry.runId === coordinator).map((entry) => entry.model);
      return { result, source: f(copy, "source") as Rec, models };
    };

    const first = await delegatePackageTeam();
    expect(launchOf(f(first.source, "defaultLaunchConfiguration"))).toEqual({ runtimeKind: AGY, model: SAVED });
    expect(f(f(first.source, "defaultLaunchSource"), "origin")).toBe("team_default");
    expect(first.result.launch_notes ?? []).toEqual([]);
    expect(first.models).toEqual([SAVED]);

    // The user edits the default again in the app; a new copy uses the newly saved value.
    const team = await readTeam(TEAM_ID);
    const edited = await saveTeam(team, { defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: EDITED, llmConfig: null } });
    expect(edited.errors, JSON.stringify(edited.errors)).toBeUndefined();
    expect((await fileJson(path.join(teamDir(), "team-config.json"))).defaultLaunchConfig).toMatchObject({ llmModelIdentifier: EDITED });
    const second = await delegatePackageTeam();
    expect(launchOf(f(second.source, "defaultLaunchConfiguration"))).toEqual({ runtimeKind: AGY, model: EDITED });
    expect(second.models).toEqual([EDITED]);
    evidence.rpe006 = { first, second, managerModel: MODEL };
  }, 240_000);

  it("RPE-007 (UC-003): a package Team is deleted from its package folder", async () => {
    const spareDir = path.join(pkgRoot, "agent-teams", SPARE_ID);
    await expect(fs.access(spareDir)).resolves.toBeUndefined();
    const deleted = await graphql(`mutation($id:String!){deleteAgentTeamDefinition(id:$id){success message}}`, { id: SPARE_ID });
    expect(deleted.deleteAgentTeamDefinition.success, deleted.deleteAgentTeamDefinition.message).toBe(true);
    await expect(fs.access(spareDir)).rejects.toThrow();
    expect(await readTeam(SPARE_ID)).toBeNull();
    evidence.rpe007 = deleted;
  });

  it("RPE-008 (AC-001, REQ-001): a save leaves the rest of the package folder as it was; relative links stay relative", async () => {
    const link = path.join(teamDir(), "agents", "engineer", "skills", "engineer", "references", "design-examples.md");
    expect(await fs.readlink(link)).toBe(SHARED_LINK);
    const saved = await saveTeam(await readTeam(TEAM_ID), { description: "Saved with a linked skill reference" });
    expect(saved.errors, JSON.stringify(saved.errors)).toBeUndefined();
    // A package is usually a git checkout shared with others: a save must not rewrite the link to this machine's path.
    const after = await fs.readlink(link);
    evidence.rpe008 = { before: SHARED_LINK, after };
    expect(after).toBe(SHARED_LINK);
    expect(await fs.readFile(link, "utf8")).toBe("# Shared design examples\n");
  });
});
