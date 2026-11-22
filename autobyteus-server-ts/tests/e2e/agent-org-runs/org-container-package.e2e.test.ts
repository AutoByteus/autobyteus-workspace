import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, calledResults, objectsIn, stringsOf, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { readRunTree } from "../helpers/run-tree-delegated.js";
import { FILE_EVENT_TEST_TIMEOUT_MS, OS_FILE_EVENT_WAIT_MS } from "../../helpers/os-latency-under-load.js";
import { AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-own-runs-v1-app-data-migration.js";
import { ORG_UNITS_FOLLOW_UPS } from "../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/agent-org-units-follow-ups.js";

/**
 * org-teams-follow-definition (Task autobyteus-29), API/E2E round 1: an Org of a local agent package, run by the built server
 * (`dist/app.js`) in its own process on a test-owned data root, whose `team-config.json` and `org-config.json` are edited on
 * disk while the Org runs (the package folder watcher reloads them, as for a package update or the Agent Package Creator's
 * file tools). Agents run on the scripted AGY CLI (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{…}` /
 * `CALL_TOOLS:[…]` make the agent call the real agent tool, `ECHO_INPUT` replies with the exact input the agent got (a pending
 * change notice is its preface); a `CALL_TOOLS` call with `untilFile` keeps the turn busy until the test opens that gate.
 * No provider inference (real runtimes: tests/e2e/runtime/org-container-live.e2e.test.ts).
 * Timing (TESTING.md, "File watching on a busy Mac"): every wait for an outcome of a package-file edit ends when the outcome
 * holds, limited by OS_FILE_EVENT_WAIT_MS; a member is kept busy by a gate, never by a delay. Test timeouts derive from
 * FILE_EVENT_TEST_TIMEOUT_MS.
 *
 * The package Org `/concierge` (agent) + `/team` (Team: lead coordinator, writer, reviewer); Org rules: concierge → /team,
 * concierge → /team/reviewer, /team/writer → /concierge. Cases, in order on one Org run:
 *  - OC-01 (AC-001, REQ-001, REQ-006): started from the package: a container with an agent unit and a Team unit, members
 *    Offline in the Org view, the Org's rows, units not listed as top-level runs.
 *  - OC-02 (AC-003, REQ-003): the concierge hands off to /team/writer, which hands back to /concierge: delivered by Org address
 *    both ways, each message in both units' logs (counterpart = the other's Org address), each shown once in the Org view.
 *  - OC-03 (AC-002, REQ-002): `team-config.json` gains a member: the Team unit follows, the Org shows it Offline at its Org
 *    address, the lead is told with the Org address.
 *  - OC-04 (AC-002, AC-004): the reviewer is removed mid-turn: Leaving (stored marker, Org row tag), refused by its Org address
 *    with the exact text (to a teammate; the Org agent is refused too), the Org rule to it left out and the concierge told; its pending send to /concierge is delivered once
 *    the gate opens; then it is released.
 *  - OC-05 (AC-004): the reviewer is added back: same run, its conversation continues, the Org rule is back, concierge told.
 *  - OC-06 (DEC-006, REQ-005): the Team unit stopped alone (its own terminate) is woken by the concierge's message; the agent
 *    unit stopped alone is woken by the user's message in the Org view.
 *  - OC-07 (S-09, CR-005): /team/lead delegates a copy of /concierge (an ad-hoc Task); DONE: the concierge (another unit) is
 *    refused as closed; back to TODO: the lead's message continues the copy's conversation.
 *  - OC-10 (AC-005, REQ-005): Stop the Org; `team-config.json` gains a member while stopped (no change); reopening (a message
 *    in the Org view) gives the current members; again with a server restart between.
 *  - OC-08 (AC-008, REQ-009): `org-config.json` mounts a second Team and adds an agent: new unit runs, Offline; told who joined.
 *  - OC-09 (AC-008, REQ-009): `org-config.json` unmounts /team while its lead is mid-turn and removes the added agent: /team is
 *    a leaving former unit (stored, Org row tag), refused by name; its lead's send is delivered once the gate opens, then the
 *    unit is released; the concierge is told who left.
 * A second Org (own server and data root):
 *  - OC-11 (AC-006, REQ-007): a hand-built pre-change Org run (released Org tree v1: an agent, a Team, a cross-unit message) is
 *    converted at startup by this build; it opens and is messaged; its Team unit then follows a `team-config.json` edit.
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/org-container-package.e2e.test.ts --no-watch
 * ORG_CONTAINER_E2E_EVIDENCE_DIR keeps one JSON receipt per case and the servers' output.
 */
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.ORG_CONTAINER_E2E_EVIDENCE_DIR?.trim() || null;
const serverDir = path.resolve(__dirname, "../../..");
/** A case's vitest timeout: its package-file events at the OS limit, plus its scripted turns and server starts. */
const caseTimeout = (fileEvents: number, otherMs = 240_000) => fileEvents * FILE_EVENT_TEST_TIMEOUT_MS + otherMs;

type Frame = { type: string; payload: Rec };

/** autobyteus-22 § Exact Texts (unchanged; design § Exact Texts: an Org-level join/leave uses the same lines). */
const NOTICE_HEAD = "Your team changed: its definition was updated.";
const joined = (name: string, address: string) => `Joined: ${name} at ${address}.`;
const left = (name: string, address: string) => `Left: ${name} (${address}); messages to it are no longer delivered.`;
const RULES_CHANGED = "Your handoff rules changed; call get_handoff_rules to read them.";
const refusal = (name: string, address: string) =>
  `${name} (${address}) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.`;

const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fsp.mkdir(evidenceDir, { recursive: true });
  await fsp.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

type TeamConfig = { coordinatorMemberName: string; members: Array<{ memberName: string; ref: string; refScope: string }>;
  handoffs: Array<{ from: string; to: string; rules: string[] }>; avatarUrl: null };
type OrgConfig = { members: Array<{ memberName: string; ref: string; refType: "agent" | "agent_team"; refScope: "shared" }>;
  handoffs: Array<{ from: string; to: string; rules: string[] }>; avatarUrl: null; defaultLaunchConfig: null };
const member = (memberName: string, ref: string) => ({ memberName, ref, refScope: "shared" });
const orgMember = (memberName: string, ref: string, refType: "agent" | "agent_team") => ({ memberName, ref, refType, refScope: "shared" as const });

/** One built server on a data root (restartable on the same root), its GraphQL and its output. */
const startServer = async (root: string, label: string, outputs: string[]) => {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
    USER: process.env.USER ?? "tester", DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ANTIGRAVITY_CLI_COMMAND: cli,
    AGY_FAKE_CASE: "linked_skills", LMSTUDIO_HOSTS: "http://127.0.0.1:1" };
  const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { cwd: serverDir, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
  const index = outputs.push(`===== ${label}\n`) - 1;
  const append = (chunk: unknown) => { outputs[index] += String(chunk); };
  child.stdout!.on("data", append); child.stderr!.on("data", append);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label}: server exited: ${outputs[index]!.slice(-2000)}`);
    return outputs[index]!.includes("Server listening on 127.0.0.1:0");
  }, `${label}: server ready`, 180_000);
  let url = "";
  for (const [, candidate] of outputs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
    const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
    if (probe.ok) { url = candidate!; break; }
  }
  if (!url) throw new Error(`${label}: no listener serves GraphQL: ${outputs[index]!.slice(-1500)}`);
  const graphql = async (query: string, variables: Rec = {}): Promise<Rec> => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: Rec; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 20_000);
    await exited; clearTimeout(force);
  };
  return { url, graphql, stop, output: () => outputs[index]! };
};
type Server = Awaited<ReturnType<typeof startServer>>;

/** The package's files: agents, Teams and the Org, written as an author's file tools do. */
const packageWriter = (packageRoot: string) => ({
  agent: async (id: string, toolNames: string[] = []) => {
    const dir = path.join(packageRoot, "agents", id);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, "agent.md"), `---\nname: ${id}\ndescription: Org container E2E agent\nrole: assistant\n---\n\nInstructions of ${id}.\n`);
    await fsp.writeFile(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames }, null, 2));
  },
  team: async (id: string, config: TeamConfig) => {
    const dir = path.join(packageRoot, "agent-teams", id);
    await fsp.mkdir(dir, { recursive: true });
    if (!fs.existsSync(path.join(dir, "team.md"))) await fsp.writeFile(path.join(dir, "team.md"), `---\nname: ${id}\ndescription: Org container E2E team\n---\n\nWork together.\n`);
    await fsp.writeFile(path.join(dir, "team-config.json"), `${JSON.stringify(config, null, 2)}\n`);
  },
  org: async (id: string, config: OrgConfig) => {
    const dir = path.join(packageRoot, "agent-orgs", id);
    await fsp.mkdir(dir, { recursive: true });
    if (!fs.existsSync(path.join(dir, "org.md"))) await fsp.writeFile(path.join(dir, "org.md"), `---\nname: ${id}\ndescription: Org container E2E org\n---\n\nFollow requests.\n`);
    await fsp.writeFile(path.join(dir, "org-config.json"), `${JSON.stringify(config, null, 2)}\n`);
  },
});

/** One Org run's reads and commands on a server: its container file, units, Org view, members and their conversations. */
const orgHarness = (root: string, getServer: () => Server, orgRunId: string, workspace: string) => {
  const memory = (...parts: string[]) => path.join(root, "memory", ...parts);
  const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8")) as Rec;
  const container = () => json(memory("agent_orgs", orgRunId, "agent_org_run_execution_tree.json"));
  const unitRun = (address: string) => (container().rootOrg.units as Rec[]).find((unit) => unit.address === address)?.runId as string | undefined;
  const formerUnits = () => (container().rootOrg.formerUnits ?? []) as Rec[];
  const teamTreeOf = (teamRunId: string) => json(memory("agent_teams", teamRunId, "team_run_execution_tree.json"));
  const teamMembers = (teamRunId: string) => ((teamTreeOf(teamRunId).rootTeam.members ?? []) as Rec[]).map((entry) => ({ address: String(entry.address), agentRunId: String(entry.agentRunId) }));
  const teamFormer = (teamRunId: string) => ((teamTreeOf(teamRunId).rootTeam.formerMembers ?? []) as Rec[]);
  const lines = (dir: string, base: string) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.startsWith(`${base}_`)).flatMap((name) =>
    fs.readFileSync(path.join(dir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec)) : [];
  const agentLog = (agentRunId: string) => lines(memory("agents", agentRunId), "communication_messages");
  const teamLog = (teamRunId: string) => lines(memory("agent_teams", teamRunId), "team_communication_messages");
  /** The Org's tree as the app reads it (composed from its units), each agent at its Org address. */
  const orgMembers = async (): Promise<Array<{ address: string; agentRunId: string }>> => {
    const tree = (await getServer().graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: orgRunId })).getAgentOrgRunConfig.executionTree as Rec;
    return (tree.rootOrg.members as Rec[]).flatMap((entry) => entry.members
      ? (entry.members as Rec[]).map((agent) => ({ address: String(agent.address), agentRunId: String(agent.agentRunId) }))
      : [{ address: String(entry.address), agentRunId: String(entry.agentRunId) }]);
  };
  const agentAt = async (address: string) => {
    const found = (await orgMembers()).find((entry) => entry.address === address);
    if (!found) throw new Error(`no Org member at ${address}`);
    return found.agentRunId;
  };
  const conversationOf = async (address: string, agentRunId: string) => (await getServer().graphql(
    `query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
    { id: orgRunId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
  const rows = async () => (await readRunTree(getServer().graphql, "agent_org", orgRunId)).rows as Rec[];
  const leavingRows = async () => (await rows()).filter((row) => row.leaving === true)
    .map((row) => ({ kind: row.kind, address: row.address, agentRunId: row.openTarget?.agentRunId as string | undefined, teamRunId: row.openTarget?.teamRunId as string | undefined }));

  let socket: WebSocket | null = null;
  const frames: Frame[] = [];
  const open = async () => {
    socket?.terminate();
    const from = frames.length;
    socket = new WebSocket(`ws://${new URL(getServer().url).host}/ws/agent-org/${orgRunId}`);
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket!.once("open", () => resolve()); socket!.once("error", reject); });
    await until(() => frames.slice(from).some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), "Org view snapshot", 30_000);
  };
  const close = () => { socket?.terminate(); socket = null; };
  /** Every member record of each Org view snapshot sent, in order (in-band ones follow each composition change). */
  const snapshots = () => frames.filter((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT").map((frame) =>
    (((frame.payload.root_org as Rec | undefined)?.agent_statuses ?? []) as Rec[]).map((record) => ({ address: record.member_address as string, agentRunId: record.agent_run_id as string,
      status: record.status as string })));
  /** The Org view's events since `from` (`ROOT_EXECUTION_EVENT`), a presentation batch as its items. */
  const events = (from = 0): Rec[] => frames.slice(from).filter((frame) => frame.type === "ROOT_EXECUTION_EVENT")
    .flatMap((frame) => { const event = frame.payload.event as Rec; return event.kind === "agent_presentation_batch" ? (event.items as Rec[]) : [event]; });
  /** The Org view's message events (`communication`) since `from` whose content holds `marker`. */
  const communications = (marker: string, from = 0) => events(from).filter((event) => event.kind === "communication" && String(event.message?.content ?? "").includes(marker));
  const send = (agentRunId: string, content: string) => socket!.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org",
    root_run_id: orgRunId, target_agent_run_id: agentRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content,
    context_file_paths: [], image_urls: [] } }));
  /** One scripted tool call by an Org agent (a user message on the Org view); returns the tool result. */
  const calls = async (address: string, content: string): Promise<Rec> => {
    const agentRunId = await agentAt(address);
    const before = calledResults(await conversationOf(address, agentRunId)).length;
    send(agentRunId, content);
    let results: string[] = [];
    await until(async () => (results = calledResults(await conversationOf(address, agentRunId))).length > before, `tool result of ${address}`, 90_000);
    return toolResult(results[before]!);
  };
  /** The exact input an Org agent got for one message (`ECHO_INPUT`): a pending change notice is its preface. */
  const echo = async (address: string): Promise<string> => {
    const agentRunId = await agentAt(address);
    const echoes = (conversation: unknown) => stringsOf(conversation).filter((text) => text.startsWith("ECHO:"));
    const before = echoes(await conversationOf(address, agentRunId)).length;
    send(agentRunId, "ECHO_INPUT");
    let found: string[] = [];
    await until(async () => (found = echoes(await conversationOf(address, agentRunId))).length > before, `echo of ${address}`, 90_000);
    return JSON.parse(found[before]!.slice("ECHO:".length)) as string;
  };
  /** Waits until a member's turn runs (an AGENT_STATUS `running` for it on the Org view since `from`). */
  const untilBusy = (agentRunId: string, from: number) => until(() => events(from).some((event) => event.agent_run_id === agentRunId
    && event.message?.type === "AGENT_STATUS" && objectsIn(event.message.payload).some((record) => record.status === "running" || record.new_status === "running")),
  `${agentRunId} is busy`, 60_000);
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  /** Every agent's status of the Org as a window reads it (`/ws/run-status`, by run ID from each unit run). */
  const runStatuses = async (runs: Array<{ kind: string; runId: string }> = [{ kind: "agent_org", runId: orgRunId }]): Promise<Array<{ agentRunId: string; status: string }>> => {
    const status = new WebSocket(`ws://${new URL(getServer().url).host}/ws/run-status`);
    const received: Frame[] = [];
    status.on("message", (raw: unknown) => received.push(JSON.parse(String(raw))));
    try {
      await new Promise<void>((resolve, reject) => { status.once("open", () => resolve()); status.once("error", reject); });
      status.send(JSON.stringify({ type: "SUBSCRIBE", payload: { runs } }));
      await until(() => received.some((frame) => frame.type === "RUN_STATUS_SNAPSHOT"), "Org run-status snapshot", 30_000);
      return ((received.find((frame) => frame.type === "RUN_STATUS_SNAPSHOT")!.payload.runs as Rec[]).flatMap((run) => run.agents as Rec[]))
        .map((agent) => ({ agentRunId: String(agent.agentRunId), status: String(agent.status) }));
    } finally { status.terminate(); }
  };
  return { runStatuses, memory, json, container, unitRun, formerUnits, teamTreeOf, teamMembers, teamFormer, agentLog, teamLog, orgMembers, agentAt, conversationOf,
    rows, leavingRows, open, close, frames, snapshots, events, communications, send, calls, echo, untilBusy, config };
};

suite("An Org of a package is a container whose units follow their definitions (built server, scripted AGY, package files edited)", () => {
  const u = randomUUID().slice(0, 6);
  const ids = { concierge: `oc-concierge-${u}`, scribe: `oc-scribe-${u}`, lead: `oc-lead-${u}`, writer: `oc-writer-${u}`, reviewer: `oc-reviewer-${u}`,
    editor: `oc-editor-${u}`, helper: `oc-helper-${u}`, lead2: `oc-lead2-${u}` };
  const teamName = `oc-team-${u}`;
  const team2Name = `oc-team2-${u}`;
  const orgName = `oc-org-${u}`;
  let root = "";
  let packageRoot = "";
  let workspace = "";
  const outputs: string[] = [];
  let server: Server;
  let orgRunId = "";
  let org: ReturnType<typeof orgHarness>;
  let writer: ReturnType<typeof packageWriter>;
  let teamConfig: TeamConfig;
  let orgConfig: OrgConfig;
  const writeTeam = async (next: TeamConfig) => { teamConfig = next; await writer.team(teamName, next); };
  const writeOrg = async (next: OrgConfig) => { orgConfig = next; await writer.org(orgName, next); };
  const gatePath = (name: string) => path.join(root, "gates", `${name}-${u}`);
  const openGate = (name: string) => fsp.writeFile(gatePath(name), "open\n");
  const teamRun = () => org.unitRun("/team")!;
  const ruleToReviewer = { from: "/concierge", to: "/team/reviewer", rules: ["Ask the reviewer for reviews."] };
  const ruleToTeam = { from: "/concierge", to: "/team", rules: ["Send software requests to the team."] };
  const ruleFromWriter = { from: "/team/writer", to: "/concierge", rules: ["Report every draft to the concierge."] };

  beforeAll(async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "oc-e2e-")));
    workspace = path.join(root, "workspace");
    packageRoot = path.join(root, "package");
    for (const dir of [workspace, path.join(root, "home"), path.join(root, "db"), path.join(root, "gates")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    await fsp.access(path.join(serverDir, "dist", "app.js"));
    writer = packageWriter(packageRoot);
    for (const [name, id] of Object.entries(ids)) await writer.agent(id, name === "lead" ? ["update_task"] : []);
    await writeTeam({ coordinatorMemberName: "lead", members: [member("lead", ids.lead), member("writer", ids.writer), member("reviewer", ids.reviewer)],
      handoffs: [{ from: "/lead", to: "/writer", rules: ["Draft the text."] }], avatarUrl: null });
    await writer.team(team2Name, { coordinatorMemberName: "lead2", members: [member("lead2", ids.lead2)], handoffs: [], avatarUrl: null });
    await writeOrg({ members: [orgMember("concierge", ids.concierge, "agent"), orgMember("team", teamName, "agent_team")],
      handoffs: [ruleToTeam, ruleToReviewer, ruleFromWriter], avatarUrl: null, defaultLaunchConfig: null });
    server = await startServer(root, "server #1", outputs);
    const imported = (await server.graphql(`mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId path } }`,
      { input: { sourceKind: "LOCAL_PATH", source: packageRoot } })).importAgentPackage as Rec[];
    expect(imported.some((entry) => entry.path === packageRoot), JSON.stringify(imported)).toBe(true);
    const orgDefinition = ((await server.graphql("{ agentOrgDefinitions { id name } }")).agentOrgDefinitions as Rec[]).find((entry) => entry.name === orgName);
    expect(orgDefinition, "the package Org is loaded").toBeTruthy();
    const created = (await server.graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: orgDefinition!.id, rootConfiguration: { workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
        autoExecuteTools: true, runtimeKind: "antigravity_cli" }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(created.success, created.message).toBe(true);
    orgRunId = created.agentOrgRunId;
    org = orgHarness(root, () => server, orgRunId, workspace);
    await org.open();
  }, 300_000);

  afterAll(async () => {
    org?.close();
    await server?.stop().catch(() => undefined);
    await keep("server-output.log", outputs.join("\n"));
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  it("OC-01 (AC-001, REQ-001, REQ-006): started from the package, the Org is a container of an agent run and a Team run; members Offline; units are not top-level runs", async () => {
    const file = org.container();
    expect(file.rootOrg.units.map((unit: Rec) => [unit.address, unit.kind])).toEqual([["/concierge", "agent"], ["/team", "agent_team"]]);
    expect(file.rootOrg.formerUnits).toEqual([]);
    expect(file.handoffs).toEqual([ruleToTeam, ruleToReviewer, ruleFromWriter]);
    const concierge = org.json(org.memory("agents", org.unitRun("/concierge")!, "run_metadata.json"));
    expect(concierge).toMatchObject({ containedIn: { orgRunId, address: "/concierge" }, startedAt: null });
    expect(org.teamTreeOf(teamRun())).toMatchObject({ containedIn: { orgRunId, address: "/team" }, rootTeam: { coordinatorAddress: "/lead" } });
    expect((await org.orgMembers()).map((entry) => entry.address)).toEqual(["/concierge", "/team/lead", "/team/writer", "/team/reviewer"]);
    const snapshot = org.snapshots()[0]!;
    expect(snapshot.map((entry) => entry.address).sort()).toEqual(["/concierge", "/team/lead", "/team/reviewer", "/team/writer"]);
    expect(snapshot.every((entry) => entry.status === "offline"), JSON.stringify(snapshot)).toBe(true);
    const rows = await org.rows();
    const history = (await server.graphql(`{ listWorkspaceRunHistory(limitPerAgent:null){ agentDefinitions { agentDefinitionId runs { runId } } teamDefinitions { teamDefinitionId runs { teamRunId } } } }`))
      .listWorkspaceRunHistory as Rec[];
    const listed = JSON.stringify(history);
    await keep("OC-01.json", { container: file, concierge, teamTree: org.teamTreeOf(teamRun()), snapshot, rows, history });
    expect(rows.map((row) => [row.kind, row.address]), JSON.stringify(rows)).toEqual([["org_agent", "/concierge"], ["org_team", "/team"],
      ["team_member", "/team/lead"], ["team_member", "/team/writer"], ["team_member", "/team/reviewer"]]);
    expect(listed.includes(org.unitRun("/concierge")!), "the agent unit is not a top-level agent run").toBe(false);
    expect(listed.includes(teamRun()), "the Team unit is not a top-level Team run").toBe(false);
  }, 120_000);

  it("OC-02 (AC-003, REQ-003): the concierge hands off to /team/writer and the writer hands back to /concierge; both logs; once each in the Org view", async () => {
    const there = `HANDOFF-THERE-${u}`;
    const back = `HANDOFF-BACK-${u}`;
    const framesBefore = org.frames.length;
    const reply = callTool("send_message_to", { recipient_address: "/concierge", content: back });
    const sent = await org.calls("/concierge", callTool("send_message_to", { recipient_address: "/team/writer", content: `${there} ${reply}` }));
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
    const conciergeRun = org.unitRun("/concierge")!;
    const writerRun = await org.agentAt("/team/writer");
    await until(() => org.agentLog(conciergeRun).some((line) => line.senderAgentRunId === writerRun && line.content === back), "the writer's handoff back reached the concierge", 90_000);
    // The receiver's log is written first, then the sender's (CrossRunMessageDelivery): both lines, once each side committed.
    await until(() => org.teamLog(teamRun()).some((line) => line.senderAgentRunId === writerRun && line.content === back), "the Team unit's log holds the handoff back", 30_000);
    const conciergeLog = org.agentLog(conciergeRun);
    const teamLog = org.teamLog(teamRun());
    const outbound = conciergeLog.find((line) => String(line.content).startsWith(there))!;
    const inbound = conciergeLog.find((line) => line.content === back)!;
    const backShown = () => org.communications(back, framesBefore).filter((event) => event.message.content === back);
    await until(() => backShown().length > 0, "the Org view showed the handoff back", 30_000);
    const viewFrames = org.frames.slice(framesBefore).filter((frame) => JSON.stringify(frame).includes(there) || JSON.stringify(frame).includes(back))
      .map((frame) => ({ type: frame.type, kind: (frame.payload.event as Rec | undefined)?.kind ?? null, there: JSON.stringify(frame).includes(there), back: JSON.stringify(frame).includes(back) }));
    const shown = { there: org.communications(there, framesBefore).filter((event) => String(event.message.content).startsWith(there)).map((event) => event.message),
      back: backShown().map((event) => event.message) };
    await keep("OC-02.json", { sent, outbound, inbound, teamLines: teamLog.filter((line) => [outbound?.messageId, inbound?.messageId].includes(line.messageId)), viewFrames, shown });
    expect(outbound).toMatchObject({ senderAgentRunId: conciergeRun, receiverAgentRunId: writerRun, counterpart: { address: "/team/writer", nodeId: null } });
    expect(inbound).toMatchObject({ senderAgentRunId: writerRun, receiverAgentRunId: conciergeRun, counterpart: { address: "/team/writer", nodeId: null } });
    expect(teamLog.find((line) => line.messageId === outbound.messageId)).toMatchObject({ counterpart: { address: "/concierge", nodeId: null } });
    expect(teamLog.find((line) => line.messageId === inbound.messageId)).toMatchObject({ counterpart: { address: "/concierge", nodeId: null } });
    expect(fs.readdirSync(org.memory("agent_orgs", orgRunId)).filter((name) => name.includes("communication_messages"))).toEqual([]);
    // The Org view shows each message once (the receiving unit's publication is relayed, design R-3).
    expect(shown.there.map((message: Rec) => message.messageId), JSON.stringify(viewFrames)).toEqual([outbound.messageId]);
    expect(shown.back.map((message: Rec) => message.messageId), JSON.stringify(viewFrames)).toEqual([inbound.messageId]);
  }, 240_000);

  it("OC-03 (AC-002, REQ-002): team-config.json gains a member: the Team unit follows; the Org shows it Offline at its Org address; the lead is told", async () => {
    const snapshotsBefore = org.snapshots().length;
    await writeTeam({ ...teamConfig, members: [...teamConfig.members, member("editor", ids.editor)] });
    await until(() => org.teamMembers(teamRun()).some((entry) => entry.address === "/editor"), "the Team unit gained the editor", OS_FILE_EVENT_WAIT_MS);
    await until(async () => (await org.orgMembers()).some((entry) => entry.address === "/team/editor"), "the Org's tree shows /team/editor", 30_000);
    await until(() => org.snapshots().slice(snapshotsBefore).some((snap) => snap.some((entry) => entry.address === "/team/editor")), "an in-band Org snapshot with the editor", 30_000);
    const editorInView = org.snapshots().at(-1)!.find((entry) => entry.address === "/team/editor");
    const leadInput = await org.echo("/team/lead");
    await keep("OC-03.json", { members: org.teamMembers(teamRun()), editorInView, leadInput });
    expect(editorInView?.status).toBe("offline");
    expect(leadInput).toContain(`${NOTICE_HEAD}\n${joined("editor", "/team/editor")}`);
  }, caseTimeout(1));

  it("OC-04 (AC-002, AC-004): a reviewer removed mid-turn is Leaving, refused by its Org address, its Org rule is left out; its send lands; then it is released", async () => {
    const reviewerRun = await org.agentAt("/team/reviewer");
    const late = `LATE-REVIEW-${u}`;
    await org.echo("/concierge"); // settles anything pending for the concierge from earlier cases
    const before = await org.calls("/concierge", callTool("get_handoff_rules", {}));
    expect(JSON.stringify(before)).toContain("Ask the reviewer for reviews.");
    const busyFrom = org.frames.length;
    org.send(reviewerRun, `CALL_TOOLS:${JSON.stringify([{ name: "send_message_to", arguments: { recipient_address: "/concierge", content: late }, untilFile: gatePath("oc04") }])}`);
    await org.untilBusy(reviewerRun, busyFrom);
    await writeTeam({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== "reviewer") });
    await until(() => org.teamFormer(teamRun()).some((entry) => entry.agentRunId === reviewerRun), "the reviewer became a former member", OS_FILE_EVENT_WAIT_MS);
    const markerWhileLeaving = org.teamFormer(teamRun()).filter((entry) => entry.leaving === true).map((entry) => entry.agentRunId);
    const rowsWhileLeaving = await org.leavingRows();
    const allRowsWhileLeaving = (await org.rows()).map((row) => ({ kind: row.kind, address: row.address, agentRunId: row.openTarget?.agentRunId, leaving: row.leaving === true }));
    const told = await org.echo("/concierge");
    // A teammate (REQ-002, autobyteus-22 AC-002) addresses it by its Org address; the Org agent's answer is recorded (another unit).
    const refused = await org.calls("/team/lead", callTool("send_message_to", { recipient_address: "/team/reviewer", content: "Stop." }));
    const refusedFromOrgAgent = await org.calls("/concierge", callTool("send_message_to", { recipient_address: "/team/reviewer", content: "Stop." }));
    const without = await org.calls("/concierge", callTool("get_handoff_rules", {}));
    const stillLeaving = org.teamFormer(teamRun()).some((entry) => entry.agentRunId === reviewerRun && entry.leaving === true);
    await openGate("oc04");
    const conciergeRun = org.unitRun("/concierge")!;
    await until(async () => stringsOf(await org.conversationOf("/concierge", conciergeRun)).some((text) => text.includes(late)), "the leaving reviewer's send reached the concierge", 60_000);
    await until(() => !org.teamFormer(teamRun()).some((entry) => entry.leaving === true), "the release write cleared the marker", 60_000);
    const rowsAfterRelease = await org.rows();
    await keep("OC-04.json", { markerWhileLeaving, rowsWhileLeaving, allRowsWhileLeaving, refused, refusedFromOrgAgent, told, without, stillLeaving, rowsAfterRelease,
      former: org.teamFormer(teamRun()) });
    expect(markerWhileLeaving, "the stored leaving marker").toEqual([reviewerRun]);
    expect(stillLeaving, "the refusal and notice came while it was leaving").toBe(true);
    expect(refused.isError, JSON.stringify(refused)).toBe(true);
    expect(JSON.stringify(refused)).toContain(refusal("reviewer", "/team/reviewer"));
    expect(refusedFromOrgAgent.isError, JSON.stringify(refusedFromOrgAgent)).toBe(true);
    expect(told).toContain(RULES_CHANGED);
    expect(JSON.stringify(without)).not.toContain("Ask the reviewer for reviews.");
    expect(JSON.stringify(without)).toContain("Send software requests to the team.");
    expect(rowsAfterRelease.some((row) => row.openTarget?.agentRunId === reviewerRun), "the released member's row is gone").toBe(false);
    // autobyteus-22 AC-003 / SR-010 in the Org view: the leaving member's row stays, tagged leaving, while it finishes.
    expect(rowsWhileLeaving.map((row) => row.agentRunId), "the Org's row of the leaving member is tagged").toEqual([reviewerRun]);
  }, caseTimeout(1));

  it("OC-05 (AC-004): the reviewer is added back: the same run continues its conversation; the Org rule is back and the concierge is told", async () => {
    const reviewerRun = org.teamFormer(teamRun()).find((entry) => entry.address === "/reviewer")!.agentRunId as string;
    await writeTeam({ ...teamConfig, members: [...teamConfig.members, member("reviewer", ids.reviewer)] });
    await until(() => org.teamMembers(teamRun()).some((entry) => entry.address === "/reviewer"), "the reviewer rejoined", OS_FILE_EVENT_WAIT_MS);
    expect(org.teamMembers(teamRun()).find((entry) => entry.address === "/reviewer")!.agentRunId).toBe(reviewerRun);
    const told = await org.echo("/concierge");
    const back = await org.calls("/concierge", callTool("get_handoff_rules", {}));
    org.send(reviewerRun, "Reply OK.");
    await until(async () => okCount(await org.conversationOf("/team/reviewer", reviewerRun)) >= 1, "the rejoined reviewer answered", 90_000);
    const conversation = stringsOf(await org.conversationOf("/team/reviewer", reviewerRun));
    await keep("OC-05.json", { told, back, conversation });
    expect(told).toContain(RULES_CHANGED);
    expect(JSON.stringify(back)).toContain("Ask the reviewer for reviews.");
    expect(conversation.some((text) => text.includes(`LATE-REVIEW-${u}`) || text.includes("CALL_TOOLS:")), "the turn from before it left is in the same conversation").toBe(true);
  }, caseTimeout(1));

  it("OC-06 (DEC-006, REQ-005): a unit the user stopped alone is woken by another unit's message, and by the user's message in the Org view", async () => {
    const leadRun = await org.agentAt("/team/lead");
    const stoppedTeam = (await server.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: teamRun() })).terminateAgentTeamRun;
    expect(stoppedTeam.success, stoppedTeam.message).toBe(true);
    const wake = `WAKE-TEAM-${u}`;
    const sent = await org.calls("/concierge", callTool("send_message_to", { recipient_address: "/team/lead", content: `${wake} Reply OK.` }));
    await until(async () => stringsOf(await org.conversationOf("/team/lead", leadRun)).some((text) => text.includes(wake)), "the stopped Team unit's lead got the message", 90_000);
    const conciergeRun = org.unitRun("/concierge")!;
    const stoppedAgent = (await server.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: conciergeRun })).terminateAgentRun;
    expect(stoppedAgent.success, stoppedAgent.message).toBe(true);
    const okBefore = okCount(await org.conversationOf("/concierge", conciergeRun));
    org.send(conciergeRun, "Reply OK.");
    await until(async () => okCount(await org.conversationOf("/concierge", conciergeRun)) > okBefore, "the stopped agent unit answered the user's message", 90_000);
    await keep("OC-06.json", { stoppedTeam, sent, stoppedAgent });
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
  }, 300_000);

  it("OC-07 (S-09, CR-005): a Team unit member's closed delegation: another unit is refused as closed; back to TODO, the assigner's message continues it", async () => {
    const delegated = await org.calls("/team/lead", callTool("delegate_task", { recipient_address: "/concierge", description: "Reply OK." }));
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copy = String(delegated.target_agent_run_id);
    const taskId = String(delegated.task_id);
    const copyConversation = async () => (await server.graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: copy })).getRunProjection?.conversation;
    await until(async () => okCount(await copyConversation()) >= 1, "the copy answered its Task", 90_000);
    const done = await org.calls("/team/lead", callTool("update_task", { task_id: taskId, status: "DONE" }));
    const otherWhileClosed = await org.calls("/concierge", callTool("send_message_to", { target_agent_run_id: copy, content: "Are you there?" }));
    const reopened = await org.calls("/team/lead", callTool("update_task", { task_id: taskId, status: "TODO" }));
    const continued = await org.calls("/team/lead", callTool("send_message_to", { target_agent_run_id: copy, content: "ECHO_INPUT" }));
    await until(async () => stringsOf(await copyConversation()).some((text) => text.startsWith("ECHO:")), "the copy continued", 90_000);
    const raw = await copyConversation();
    const conversation = stringsOf(raw);
    await keep("OC-07.json", { delegated, done, otherWhileClosed, reopened, continued, conversation });
    expect(JSON.stringify(done)).toContain("DONE");
    expect(otherWhileClosed.isError, JSON.stringify(otherWhileClosed)).toBe(true);
    expect(JSON.stringify(otherWhileClosed)).toContain("TASK_AGENT_RESOURCE_CLOSED");
    expect(JSON.stringify(reopened)).toContain("TODO");
    expect(continued.isError, JSON.stringify(continued)).toBe(false);
    expect(JSON.stringify(continued)).toContain("continues with its conversation");
    expect(okCount(raw), "the same conversation: the first answer is still there").toBeGreaterThanOrEqual(1);
  }, 300_000);

  it("OC-10 (AC-005, REQ-005): Stop the Org; a Team change while stopped is applied on reopen; again across a server restart", async () => {
    const reopenAndEcho = async () => {
      await org.open();
      const first = await org.echo("/team/lead");
      const second = await org.echo("/team/lead");
      return { first, second };
    };
    org.close();
    const statusesBeforeStop = await org.runStatuses();
    const stopped = (await server.graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: orgRunId })).terminateAgentOrgRun;
    expect(stopped.success, stopped.message).toBe(true);
    // A stopped Org reports no statuses of its own; its rows' statuses come from their unit runs (SR-083), as the window reads them.
    const units = (org.container().rootOrg.units as Rec[]).map((unit) => ({ kind: unit.kind === "agent" ? "agent" : "agent_team", runId: String(unit.runId) }));
    const statusesAfterStop = await org.runStatuses(units);
    await writeTeam({ ...teamConfig, members: [...teamConfig.members, member("helper", ids.helper)] });
    const teamDefinitionId = ((await server.graphql("{ agentTeamDefinitions { id name } }")).agentTeamDefinitions as Rec[]).find((entry) => entry.name === teamName)!.id;
    await until(async () => JSON.stringify(((await server.graphql("{ agentTeamDefinitions { id nodes { memberName } } }")).agentTeamDefinitions as Rec[])
      .find((entry) => entry.id === teamDefinitionId)?.nodes ?? []).includes("\"helper\""), "the definition lists the helper", OS_FILE_EVENT_WAIT_MS);
    const whileStopped = org.teamMembers(teamRun()).some((entry) => entry.address === "/helper");
    const reopened = await reopenAndEcho();
    const afterReopen = org.teamMembers(teamRun()).map((entry) => entry.address);
    // Restart: stop the Org and the server, change the Team, start a new server, the user's message reopens the Org.
    org.close();
    expect((await server.graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: orgRunId })).terminateAgentOrgRun.success).toBe(true);
    await server.stop();
    await writeTeam({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== "helper") });
    server = await startServer(root, "server #2", outputs);
    const restarted = await reopenAndEcho();
    const afterRestart = org.teamMembers(teamRun()).map((entry) => entry.address);
    await keep("OC-10.json", { statusesBeforeStop, statusesAfterStop, whileStopped, reopened, afterReopen, restarted, afterRestart });
    expect(statusesBeforeStop.some((entry) => entry.status !== "offline"), JSON.stringify(statusesBeforeStop)).toBe(true);
    expect(statusesAfterStop.length, "every agent of the Org has a status").toBe((await org.orgMembers()).length);
    expect(statusesAfterStop.every((entry) => entry.status === "offline"), JSON.stringify(statusesAfterStop)).toBe(true);
    expect(whileStopped, "a stopped Org's Team changes only when it is reopened").toBe(false);
    expect(afterReopen).toContain("/helper");
    expect([reopened.first, reopened.second].filter((input) => input.includes(joined("helper", "/team/helper"))), "told once after the reopen").toHaveLength(1);
    expect(afterRestart).not.toContain("/helper");
    expect([restarted.first, restarted.second].filter((input) => input.includes(left("helper", "/team/helper"))), "told once after the restart").toHaveLength(1);
  }, caseTimeout(2, 420_000));

  it("OC-08 (AC-008, REQ-009): org-config.json mounts a second Team and adds an agent: new unit runs, Offline; the concierge is told who joined", async () => {
    const snapshotsBefore = org.snapshots().length;
    await writeOrg({ ...orgConfig, members: [...orgConfig.members, orgMember("team2", team2Name, "agent_team"), orgMember("scribe", ids.scribe, "agent")],
      handoffs: [...orgConfig.handoffs, { from: "/concierge", to: "/scribe", rules: ["Ask the scribe to take notes."] }] });
    await until(() => ["/team2", "/scribe"].every((address) => org.unitRun(address)), "the new units joined the container", OS_FILE_EVENT_WAIT_MS);
    const file = org.container();
    const scribe = org.json(org.memory("agents", org.unitRun("/scribe")!, "run_metadata.json"));
    const team2 = org.teamTreeOf(org.unitRun("/team2")!);
    await until(() => org.snapshots().slice(snapshotsBefore).some((snap) => snap.some((entry) => entry.address === "/team2/lead2")), "an in-band Org snapshot with /team2", 30_000);
    const inView = org.snapshots().at(-1)!.filter((entry) => ["/scribe", "/team2/lead2"].includes(entry.address));
    const told = await org.echo("/concierge");
    const rules = await org.calls("/concierge", callTool("get_handoff_rules", {}));
    await keep("OC-08.json", { container: file, scribe, team2, inView, told, rules });
    expect(file.rootOrg.units.map((unit: Rec) => unit.address)).toEqual(["/concierge", "/team", "/team2", "/scribe"]);
    expect(scribe).toMatchObject({ containedIn: { orgRunId, address: "/scribe" }, startedAt: null });
    expect(team2).toMatchObject({ containedIn: { orgRunId, address: "/team2" } });
    expect(inView.map((entry) => entry.status)).toEqual(["offline", "offline"]);
    expect(told).toContain(joined("scribe", "/scribe"));
    expect(told).toContain(joined("team2", "/team2"));
    expect(told).toContain(RULES_CHANGED);
    expect(JSON.stringify(rules)).toContain("Ask the scribe to take notes.");
  }, caseTimeout(1));

  it("OC-09 (AC-008, REQ-009): org-config.json unmounts /team while its lead is mid-turn and removes the scribe: leaving former unit, refused by name; the send lands; released", async () => {
    const teamRunId = teamRun();
    const leadRun = await org.agentAt("/team/lead");
    const scribeRun = org.unitRun("/scribe")!;
    const late = `LATE-UNIT-${u}`;
    await org.echo("/concierge");
    const busyFrom = org.frames.length;
    org.send(leadRun, `CALL_TOOLS:${JSON.stringify([{ name: "send_message_to", arguments: { recipient_address: "/concierge", content: late }, untilFile: gatePath("oc09") }])}`);
    await org.untilBusy(leadRun, busyFrom);
    await writeOrg({ ...orgConfig, members: orgConfig.members.filter((entry) => !["team", "scribe"].includes(entry.memberName)),
      handoffs: orgConfig.handoffs.filter((rule) => !rule.from.startsWith("/team/") && !rule.to.startsWith("/team") && rule.to !== "/scribe") });
    await until(() => org.formerUnits().some((unit) => unit.runId === teamRunId), "/team became a former unit", OS_FILE_EVENT_WAIT_MS);
    const formerWhileLeaving = org.formerUnits().map((unit) => ({ address: unit.address, runId: unit.runId, leaving: unit.leaving === true }));
    const rowsWhileLeaving = await org.leavingRows();
    const told = await org.echo("/concierge");
    const refused = await org.calls("/concierge", callTool("send_message_to", { recipient_address: "/team/writer", content: "Are you there?" }));
    const refusedScribe = await org.calls("/concierge", callTool("send_message_to", { recipient_address: "/scribe", content: "Are you there?" }));
    const stillLeaving = org.formerUnits().some((unit) => unit.runId === teamRunId && unit.leaving === true);
    await openGate("oc09");
    const conciergeRun = org.unitRun("/concierge")!;
    await until(async () => stringsOf(await org.conversationOf("/concierge", conciergeRun)).some((text) => text.includes(late)), "the leaving unit's send reached the concierge", 60_000);
    await until(() => !org.formerUnits().some((unit) => unit.leaving === true), "the leaving unit was released", 60_000);
    const rowsAfterRelease = await org.rows();
    await keep("OC-09.json", { formerWhileLeaving, rowsWhileLeaving, refused, refusedScribe, told, stillLeaving, rowsAfterRelease, container: org.container() });
    expect(org.container().rootOrg.units.map((unit: Rec) => unit.address)).toEqual(["/concierge", "/team2"]);
    expect(formerWhileLeaving).toEqual(expect.arrayContaining([{ address: "/team", runId: teamRunId, leaving: true }, { address: "/scribe", runId: scribeRun, leaving: false }]));
    expect(rowsWhileLeaving.some((row) => row.teamRunId === teamRunId || row.address === "/team"), JSON.stringify(rowsWhileLeaving)).toBe(true);
    expect(stillLeaving, "refusals and the notice came while /team was leaving").toBe(true);
    expect(refused.isError, JSON.stringify(refused)).toBe(true);
    expect(JSON.stringify(refused)).toContain(refusal("writer", "/team/writer"));
    expect(refusedScribe.isError, JSON.stringify(refusedScribe)).toBe(true);
    expect(JSON.stringify(refusedScribe)).toContain(refusal("scribe", "/scribe"));
    expect(told).toContain(left("team", "/team"));
    expect(told).toContain(left("scribe", "/scribe"));
    expect(fs.existsSync(org.memory("agent_teams", teamRunId, "team_run_execution_tree.json")), "the former unit's run and history stay").toBe(true);
    expect(rowsAfterRelease.some((row) => row.leaving === true), "no leaving row after the release").toBe(false);
  }, caseTimeout(1));
});

suite("A pre-change Org run converted at startup opens and its Team unit follows its definition (built server, hand-built released fixture)", () => {
  const u = randomUUID().slice(0, 6);
  const ids = { concierge: `cv-concierge-${u}`, lead: `cv-lead-${u}`, writer: `cv-writer-${u}`, editor: `cv-editor-${u}` };
  const teamName = `cv-team-${u}`;
  const orgName = `cv-org-${u}`;
  const orgRunId = `cv_org_${u}`;
  const teamRunId = `cv_team_${u}`;
  const run = { concierge: `cv_concierge_${u}`, lead: `cv_lead_${u}`, writer: `cv_writer_${u}` };
  let root = "";
  let workspace = "";
  const outputs: string[] = [];
  let server: Server;
  let writer: ReturnType<typeof packageWriter>;
  let teamConfig: TeamConfig;

  afterAll(async () => {
    await server?.stop().catch(() => undefined);
    await keep("converted-server-output.log", outputs.join("\n"));
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  it("OC-11 (AC-006, REQ-007): a released Org run is converted at startup; it opens with its message; its Team unit then follows a team-config.json edit", async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "oc-conv-e2e-")));
    workspace = path.join(root, "workspace");
    const packageRoot = path.join(root, "package");
    for (const dir of [workspace, path.join(root, "home"), path.join(root, "db")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    writer = packageWriter(packageRoot);
    for (const id of Object.values(ids)) await writer.agent(id);
    teamConfig = { coordinatorMemberName: "lead", members: [member("lead", ids.lead), member("writer", ids.writer)], handoffs: [], avatarUrl: null };
    await writer.team(teamName, teamConfig);
    await writer.org(orgName, { members: [orgMember("concierge", ids.concierge, "agent"), orgMember("team", teamName, "agent_team")],
      handoffs: [{ from: "/concierge", to: "/team", rules: ["When a software request arrives."] }], avatarUrl: null, defaultLaunchConfig: null });
    // An install upgraded from the release: this build's first start records every migration; the conversion (and its
    // follow-ups, registered after it) never ran on the data written next.
    server = await startServer(root, "first start (ledger)", outputs);
    await server.graphql(`mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }`, { input: { sourceKind: "LOCAL_PATH", source: packageRoot } });
    const teamDefinitionId = ((await server.graphql("{ agentTeamDefinitions { id name } }")).agentTeamDefinitions as Rec[]).find((entry) => entry.name === teamName)!.id as string;
    const orgDefinitionId = ((await server.graphql("{ agentOrgDefinitions { id name } }")).agentOrgDefinitions as Rec[]).find((entry) => entry.name === orgName)!.id as string;
    const recorded = ((await server.graphql("{getAppDataMigrations{migrationId status}}")).getAppDataMigrations as Rec[]).map((entry) => String(entry.migrationId));
    await server.stop();
    const neverRan = recorded.slice(recorded.indexOf(AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID));
    expect(neverRan).toEqual(expect.arrayContaining([AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID, ...ORG_UNITS_FOLLOW_UPS.map((followUp) => followUp.id)]));
    const db = new DatabaseSync(path.join(root, "db", "production.db"));
    for (const id of neverRan) db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(id);
    db.close();
    // The released Org tree v1 (hand-built in the shape the release wrote; tests/fixtures/app-data-migrations/released-org-tree-v1-fixtures.ts),
    // naming this package's definitions: a direct agent and a Team with two members, one cross-unit message.
    const launch = { runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace,
      skillAccessMode: "PRELOADED_ONLY" };
    const agentNode = (address: string, agentRunId: string, agentDefinitionId: string) => ({ address, agentDefinitionId, role: null, description: null, agentRunId,
      platformAgentRunId: null, launchConfiguration: launch });
    const orgDir = path.join(root, "memory", "agent_orgs", orgRunId);
    await fsp.mkdir(orgDir, { recursive: true });
    await fsp.writeFile(path.join(orgDir, "agent_org_run_execution_tree.json"), JSON.stringify({ subjectKind: "agent_org", createdAt: "2026-09-21T11:47:04.136Z", archivedAt: null,
      applicationBinding: null, handoffs: [{ from: "/concierge", to: "/team", rules: ["When a software request arrives."] }],
      rootOrg: { address: "/", orgDefinitionId, orgDefinitionName: orgName, orgRunId, defaultLaunchConfiguration: launch, members: [
        { address: "/team", teamDefinitionId, role: null, description: null, teamRunId, coordinatorAddress: "/team/lead", defaultLaunchConfiguration: launch,
          members: [agentNode("/team/lead", run.lead, ids.lead), agentNode("/team/writer", run.writer, ids.writer)] },
        agentNode("/concierge", run.concierge, ids.concierge)] } }, null, 2));
    const released = { messageId: `m_cross_${u}`, senderAgentRunId: run.concierge, receiverAgentRunId: run.lead, content: `RELEASED-CROSS-${u}`, messageType: "handoff",
      referenceFiles: [], createdAt: "2026-11-22T10:00:00.000Z" };
    await fsp.writeFile(path.join(orgDir, "agent_org_communication_messages_active.jsonl"), `${JSON.stringify(released)}\n`);
    await fsp.writeFile(path.join(orgDir, "agent_org_task_delegation_records.json"), JSON.stringify({ schemaVersion: 1, subjectKind: "agent_org", orgRunId, records: [] }));
    for (const folder of [path.join(teamRunId, run.lead), path.join(teamRunId, run.writer), run.concierge]) await fsp.mkdir(path.join(orgDir, folder), { recursive: true });

    server = await startServer(root, "upgrade start", outputs);
    const migration = ((await server.graphql("{getAppDataMigrations{migrationId status summary}}")).getAppDataMigrations as Rec[])
      .find((entry) => entry.migrationId === AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID);
    const org = orgHarness(root, () => server, orgRunId, workspace);
    const converted = org.container();
    const teamTree = org.teamTreeOf(teamRunId);
    const conciergeMetadata = org.json(org.memory("agents", run.concierge, "run_metadata.json"));
    const conciergeLine = org.agentLog(run.concierge).find((line) => line.messageId === released.messageId) ?? null;
    const teamLine = org.teamLog(teamRunId).find((line) => line.messageId === released.messageId) ?? null;
    await org.open();
    org.send(run.lead, "Reply OK.");
    await until(async () => okCount(await org.conversationOf("/team/lead", run.lead)) >= 1, "the converted Team unit's lead answered", 90_000);
    await writer.team(teamName, { ...teamConfig, members: [...teamConfig.members, member("editor", ids.editor)] });
    await until(() => org.teamMembers(teamRunId).some((entry) => entry.address === "/editor"), "the converted Team unit gained the editor", OS_FILE_EVENT_WAIT_MS);
    const leadInput = await org.echo("/team/lead");
    await keep("OC-11.json", { migration, converted, teamTree, conciergeMetadata, conciergeLine, teamLine, members: org.teamMembers(teamRunId), leadInput });
    org.close();
    expect(migration).toMatchObject({ status: "SUCCEEDED" });
    expect(converted.rootOrg.units.map((unit: Rec) => [unit.address, unit.kind, unit.runId])).toEqual([["/team", "agent_team", teamRunId], ["/concierge", "agent", run.concierge]]);
    expect(teamTree).toMatchObject({ containedIn: { orgRunId, address: "/team" }, rootTeam: { coordinatorAddress: "/lead" } });
    expect(conciergeMetadata).toMatchObject({ containedIn: { orgRunId, address: "/concierge" } });
    expect(conciergeLine).toMatchObject({ content: released.content, counterpart: { address: "/team/lead" } });
    expect(teamLine).toMatchObject({ content: released.content, counterpart: { address: "/concierge" } });
    expect(leadInput).toContain(`${NOTICE_HEAD}\n${joined("editor", "/team/editor")}`);
  }, caseTimeout(1, 420_000));
});

function okCount(conversation: unknown) { return stringsOf(conversation).filter((text) => text.trim() === "OK").length; }
