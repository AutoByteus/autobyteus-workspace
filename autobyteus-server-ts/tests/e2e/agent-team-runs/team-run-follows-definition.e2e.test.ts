import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, calledResults, objectsIn, segment, stringsOf, taskAgentsIn, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { delegatedRunsTree, readRunTree } from "../helpers/run-tree-delegated.js";
import { FILE_EVENT_TEST_TIMEOUT_MS, OS_FILE_EVENT_WAIT_MS } from "../../helpers/os-latency-under-load.js";

/**
 * team-run-follows-definition (Task autobyteus-22) through the built server (`dist/app.js`) in its own process on a
 * test-owned data root: a local agent package imported through the package API, whose Team's `team-config.json` is edited
 * on disk while its Team runs (the package folder watcher reloads it, as for a package update or the Agent Package
 * Creator's file tools), and a user's own Team saved through the app's GraphQL definition editor. Agents run on the
 * scripted AGY CLI (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{…}` / `CALL_TOOLS:[…]` make the agent
 * call the real agent tool, `ECHO_INPUT` replies with the exact input the agent got (so the change notice is visible),
 * `HOLD_TURN` keeps a turn running, a `CALL_TOOLS` call with `untilFile` waits until the test creates that file. No provider
 * inference. Real runtimes: team-run-follows-definition-live.e2e.test.ts.
 * Timing (TESTING.md, "File watching on a busy Mac"): every wait for an outcome of a package-file edit ends when the outcome
 * holds, limited by OS_FILE_EVENT_WAIT_MS; a member is kept busy by a gate the test releases, never by a delay; "exactly one
 * warning" is counted after a later sentinel edit has visibly landed. Test timeouts derive from FILE_EVENT_TEST_TIMEOUT_MS.
 *
 * Cases (API/E2E IDs of the ticket), in order on one Team run unless named:
 *  - TF-01 (AC-001, AC-006): a member and a rule are added; the open view gets an in-band snapshot with it; the lead's next
 *    input carries the exact notice, the other member's says its rules are unchanged; get_handoff_rules lists the rule; a
 *    message starts the new member, which gets no notice.
 *  - TF-02 (AC-002, AC-010, AC-006): an idle member is removed: refused by address and by run ID with the exact text,
 *    dropped from the view, its conversation still readable, the remaining members told once.
 *  - TF-03 (AC-003, DEC-002): a member removed mid-turn is shown "leaving", is refused at once, its delayed send is still
 *    delivered, and it is released (dropped from the view) once quiet.
 *  - TF-04 (DEC-007, AC-003): the removed member is added back: the same run ID, its conversation continues; removed again
 *    while a turn is held, the user's interrupt of the leaving member works and it is then released.
 *  - TF-05 (DEC-006): another agent at the address of a busy member: the old one finishes (its send delivered), the new run
 *    is reached at the address.
 *  - TF-06 (AC-008): the coordinator changes: the live tree and the open view name the new coordinator.
 *  - TF-07 (AC-007): an unparsable team-config.json, a member whose agent does not exist, and a Team definition that is
 *    gone leave the run unchanged; each logs one warning naming the run and the reason (again after a valid edit and a
 *    new breakage); the unparsable file is also a load issue on the definition.
 *  - TF-08 (AC-004): a change made while the run is stopped is applied when it is reopened, and again after a server
 *    restart; the lead is told at its next input.
 *  - TF-09 (AC-005): a Team copy started by an agent's delegate_task (copiedFrom team_definition) follows the same edits.
 *  - TF-10 (AC-001 by the app's editor): a user's own Team saved with updateAgentTeamDefinition: its run follows.
 *  - TF-11, TF-12 (AC-003, design SR-010): a member removed while its turn is held is leaving (stored marker, tagged
 *    run-tree row); a Stop, and a server restart, while it is leaving show no leaving row; reopening clears the marker.
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts --no-watch
 * TEAM_FOLLOWS_E2E_EVIDENCE_DIR keeps one JSON receipt per case and the servers' output.
 */
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.TEAM_FOLLOWS_E2E_EVIDENCE_DIR?.trim() || null;
const serverDir = path.resolve(__dirname, "../../..");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** A case's vitest timeout: its package-file events at the OS limit, plus its scripted turns and server starts. */
const caseTimeout = (fileEvents: number, otherMs = 180_000) => fileEvents * FILE_EVENT_TEST_TIMEOUT_MS + otherMs;

type Frame = { type: string; payload: Rec };
type Member = { address: string; agentRunId: string; agentDefinitionId: string; leaving: boolean };

/** design § Exact Texts (copied from the design, not the source). */
const NOTICE_HEAD = "Your team changed: its definition was updated.";
const joined = (name: string, address: string) => `Joined: ${name} at ${address}.`;
const left = (name: string, address: string) => `Left: ${name} (${address}); messages to it are no longer delivered.`;
const RULES_CHANGED = "Your handoff rules changed; call get_handoff_rules to read them.";
const RULES_UNCHANGED = "Your handoff rules are unchanged.";
const refusal = (name: string, address: string) =>
  `${name} (${address}) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.`;

const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fsp.mkdir(evidenceDir, { recursive: true });
  await fsp.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

suite("A Team run follows its Team definition (built server, scripted AGY)", () => {
  const u = randomUUID().slice(0, 6);
  const ids = { lead: `tf-lead-${u}`, writer: `tf-writer-${u}`, reviewer: `tf-reviewer-${u}`, alt: `tf-alt-${u}`, host: `tf-host-${u}` };
  const teamName = `tf-team-${u}`;
  let root = "";
  let packageRoot = "";
  let configFile = "";
  let workspace = "";
  let server: Awaited<ReturnType<typeof startServer>>;
  const servers: Array<{ child: ChildProcess; output: () => string }> = [];
  let teamDefinitionId = "";
  let teamRunId = "";
  const memberRun: Record<string, string> = {};
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true,
    runtimeKind: "antigravity_cli" });

  const startServer = async (label: string) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      USER: process.env.USER ?? "tester", DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ANTIGRAVITY_CLI_COMMAND: cli,
      AGY_FAKE_CASE: "linked_skills", LMSTUDIO_HOSTS: "http://127.0.0.1:1" };
    const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    servers.push({ child, output: () => output });
    await until(() => {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label}: server exited: ${output.slice(-2000)}`);
      return output.includes("Server listening on 127.0.0.1:0");
    }, `${label}: server ready`, 180_000).catch(async (error) => {
      // Diagnostics for a start that does not finish: the data root's lock-like files and this root's processes.
      const locks = spawnSync("find", [root, "-maxdepth", "3", "(", "-name", "*.lock", "-o", "-name", "*lock*", "-o", "-name", "*.pid", ")"], { encoding: "utf8" }).stdout;
      const processes = spawnSync("ps", ["-axo", "pid=,ppid=,stat=,etime=,command="], { encoding: "utf8" }).stdout.split("\n").filter((line) => line.includes(root) || line.includes("dist/app.js")).join("\n");
      await keep(`${label.replace(/\W+/g, "-")}-start-timeout.txt`, `${String(error)}\n--- locks\n${locks}\n--- processes\n${processes}\n--- output tail\n${output.slice(-4000)}`);
      throw error;
    });
    let url = "";
    for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
      const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
      if (probe.ok) { url = candidate!; break; }
    }
    if (!url) throw new Error(`${label}: no listener serves GraphQL: ${output.slice(-1500)}`);
    const graphql = async (query: string, variables: Rec = {}): Promise<Rec> => {
      const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
      const body = await response.json() as { data?: Rec; errors?: unknown[] };
      if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
      return body.data;
    };
    return { label, child, url, graphql, output: () => output };
  };
  type Server = Awaited<ReturnType<typeof startServer>>;
  const stops: Rec[] = [];
  const stopServer = async (target: { child: ChildProcess }, signal: NodeJS.Signals) => {
    if (target.child.exitCode !== null || target.child.signalCode !== null) return;
    const started = Date.now();
    const exited = new Promise<[number | null, string | null]>((resolve) => target.child.once("exit", (code, sig) => resolve([code, sig])));
    target.child.kill(signal);
    let forced = false;
    const force = setTimeout(() => { forced = true; target.child.kill("SIGKILL"); }, 20_000);
    try { const [code, sig] = await exited; stops.push({ signal, code, exitSignal: sig, forced, ms: Date.now() - started }); } finally { clearTimeout(force); }
  };

  /** A Team run's own stream: the user's commands to its agents, and every frame (view snapshots included). */
  const openTeam = async (id: string = teamRunId) => {
    const socket = new WebSocket(`ws://${new URL(server.url).host}/ws/agent-team/${id}`);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), `team stream snapshot of ${id}`, 30_000);
    const conversationOf = async (agentRunId: string) => (await server.graphql(
      `query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id, a: agentRunId })).getTeamMemberRunProjection?.conversation;
    const send = (agentRunId: string, content: string) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content });
    const interrupt = (agentRunId: string) => socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { agent_run_id: agentRunId, command_id: randomUUID() } }));
    const acks = (from = 0) => frames.slice(from).filter((frame) => frame.type === "AGENT_COMMAND_ACK");
    /** The members of every view snapshot the stream sent, in order (the in-band ones follow each committed change). */
    const snapshots = () => frames.filter((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT").map((frame) => ({
      coordinator: objectsIn(frame.payload).find((record) => typeof record.coordinator_address === "string")?.coordinator_address as string | undefined,
      members: objectsIn(frame.payload).filter((record) => record.kind === "configured_agent" && typeof record.agent_run_id === "string")
        .map((record) => ({ address: record.address as string, agentRunId: record.agent_run_id as string, leaving: record.leaving === true })),
    }));
    const errors = (from = 0) => frames.slice(from).filter((frame) => frame.type === "ERROR");
    return { socket, frames, conversationOf, send, interrupt, acks, snapshots, errors, close: () => socket.terminate() };
  };
  type TeamStream = Awaited<ReturnType<typeof openTeam>>;
  let view: TeamStream;

  /** One scripted tool call by a member (a user message on the team stream); returns the tool result. */
  const calls = async (stream: TeamStream, agentRunId: string, content: string): Promise<Rec> => {
    const before = calledResults(await stream.conversationOf(agentRunId)).length;
    stream.send(agentRunId, content);
    let results: string[] = [];
    await until(async () => { results = calledResults(await stream.conversationOf(agentRunId)); return results.length > before; },
      `tool result of ${agentRunId} for ${content.slice(0, 100)}`, 90_000);
    return toolResult(results[before]!);
  };
  /** The exact input a member got for one message (`ECHO_INPUT`): a pending change notice is its preface. */
  const echo = async (stream: TeamStream, agentRunId: string): Promise<string> => {
    const echoes = (conversation: unknown) => stringsOf(conversation).filter((text) => text.startsWith("ECHO:"));
    const before = echoes(await stream.conversationOf(agentRunId)).length;
    stream.send(agentRunId, "ECHO_INPUT");
    let found: string[] = [];
    await until(async () => { found = echoes(await stream.conversationOf(agentRunId)); return found.length > before; }, `echo of ${agentRunId}`, 90_000);
    return JSON.parse(found[before]!.slice("ECHO:".length)) as string;
  };
  const okCount = (conversation: unknown) => stringsOf(conversation).filter((text) => text.trim() === "OK").length;
  /** Waits until a member's turn runs (its AGENT_STATUS `running` on the stream since `from`). */
  const untilBusy = (stream: TeamStream, agentRunId: string, from: number) => until(() => stream.frames.slice(from)
    .some((frame) => frame.type === "AGENT_STATUS" && frame.payload.agent_run_id === agentRunId && frame.payload.status === "running"), `${agentRunId} is busy`, 60_000);
  /** A gate file: a `CALL_TOOLS` call with `untilFile` waits until the test opens it. */
  const gatePath = (name: string) => path.join(root, "gates", `${name}-${u}`);
  const openGate = (name: string) => fsp.writeFile(gatePath(name), "open\n");
  /** The Memory page's read of one member run of a Team run (raw traces included): works for current and former members. */
  const memoryViewOf = async (id: string, agentRunId: string) => (await server.graphql(
    `query($t:String!,$a:String!){getTeamMemberRunMemoryView(teamRunId:$t,agentRunId:$a,includeRawTraces:true){runId rawTraces{ traceType content }}}`,
    { t: id, a: agentRunId })).getTeamMemberRunMemoryView as Rec;
  /** A read that may be refused: its result, or the error text. */
  const attempt = async <T>(read: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> => {
    try { return { ok: true, value: await read() }; } catch (error) { return { ok: false, error: String((error as Error).message ?? error).slice(0, 600) }; }
  };

  /** The run's stored tree (`team_run_execution_tree.json`), current and former members. */
  const treeFile = (id: string) => {
    const found = spawnSync("find", [path.join(root, "memory"), "-name", "team_run_execution_tree.json", "-path", `*${id}*`], { encoding: "utf8" })
      .stdout.trim().split("\n").filter(Boolean);
    expect(found, `tree file of ${id}`).toHaveLength(1);
    return JSON.parse(fs.readFileSync(found[0]!, "utf8")) as Rec;
  };
  const membersOf = (members: Rec[] | undefined): Member[] => (members ?? []).map((member) => ({ address: String(member.address),
    agentRunId: String(member.agentRunId ?? member.agent_run_id), agentDefinitionId: String(member.agentDefinitionId ?? member.agent_definition_id), leaving: false }));
  const stored = (id: string = teamRunId) => {
    const tree = treeFile(id);
    return { tree, members: membersOf(tree.rootTeam.members), former: membersOf(tree.rootTeam.formerMembers),
      coordinator: tree.rootTeam.coordinatorAddress as string, handoffs: (tree.handoffs ?? tree.rootTeam.handoffs ?? []) as Rec[] };
  };
  const addresses = (members: Member[]) => members.map((member) => member.address).sort();
  /** The stored leaving marker (design SR-010): `formerMembers[i].leaving: true` while the member finishes its turn. */
  const storedLeaving = (id: string = teamRunId) => ((treeFile(id).rootTeam.formerMembers ?? []) as Rec[]).filter((entry) => entry.leaving === true)
    .map((entry) => String(entry.agentRunId));
  /** The run-tree rows the app's member list renders (`runTree`), and which of them are tagged leaving. */
  const runTreeRows = async (kind: string, id: string) => (await readRunTree(server.graphql, kind, id)).rows as Rec[];
  const leavingRows = async (kind: string, id: string) => (await runTreeRows(kind, id)).filter((row) => row.leaving === true)
    .map((row) => ({ key: row.key, kind: row.kind, address: row.address, agentRunId: row.openTarget?.agentRunId as string | undefined }));

  type TeamConfig = { coordinatorMemberName: string; members: Array<{ memberName: string; ref: string; refScope: string }>;
    handoffs: Array<{ from: string; to: string; rules: string[] }>; avatarUrl: null };
  let teamConfig: TeamConfig;
  /** Writes the Team's `team-config.json` as an author's file tools do (the package folder watcher reloads it). */
  const writeConfig = async (next: TeamConfig) => {
    teamConfig = next;
    await fsp.writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`);
  };
  const member = (memberName: string, ref: string) => ({ memberName, ref, refScope: "shared" });

  const writeAgent = async (id: string) => {
    const dir = path.join(packageRoot, "agents", id);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, "agent.md"), `---\nname: ${id}\ndescription: Team follows definition E2E agent\nrole: assistant\n---\n\nInstructions of ${id}.\n`);
    await fsp.writeFile(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [] }, null, 2));
  };

  beforeAll(async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "tf-e2e-")));
    workspace = path.join(root, "workspace");
    packageRoot = path.join(root, "package");
    for (const dir of [workspace, path.join(root, "home"), path.join(root, "db"), path.join(root, "gates")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    await fsp.access(path.join(serverDir, "dist", "app.js"));
    for (const id of Object.values(ids)) await writeAgent(id);
    const teamDir = path.join(packageRoot, "agent-teams", teamName);
    await fsp.mkdir(teamDir, { recursive: true });
    await fsp.writeFile(path.join(teamDir, "team.md"), `---\nname: ${teamName}\ndescription: Team follows definition E2E\n---\n\nWork together.\n`);
    configFile = path.join(teamDir, "team-config.json");
    await writeConfig({ coordinatorMemberName: "lead", members: [member("lead", ids.lead), member("writer", ids.writer)],
      handoffs: [{ from: "/lead", to: "/writer", rules: ["Draft the text."] }], avatarUrl: null });
    server = await startServer("server #1");
    const imported = (await server.graphql(`mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId path } }`,
      { input: { sourceKind: "LOCAL_PATH", source: packageRoot } })).importAgentPackage as Rec[];
    expect(imported.some((entry) => entry.path === packageRoot), JSON.stringify(imported)).toBe(true);
    teamDefinitionId = ((await server.graphql("{ agentTeamDefinitions { id name } }")).agentTeamDefinitions as Rec[]).find((team) => team.name === teamName)!.id;
    const created = (await server.graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: ids.lead, ...config() }, { memberAddress: "/writer", agentDefinitionId: ids.writer, ...config() }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    teamRunId = created.teamRunId;
    for (const entry of stored().members) memberRun[entry.address] = entry.agentRunId;
    view = await openTeam();
    for (const address of ["/lead", "/writer"]) {
      view.send(memberRun[address]!, "Reply OK.");
      await until(async () => okCount(await view.conversationOf(memberRun[address]!)) >= 1, `${address} started`, 90_000);
    }
  }, 300_000);

  afterAll(async () => {
    view?.close();
    for (const entry of servers) await stopServer(entry, "SIGTERM").catch(() => undefined);
    await keep("server-stops.json", stops);
    await keep("server-output.log", servers.map((entry, index) => `===== server #${index + 1}\n${entry.output()}`).join("\n"));
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  it("TF-01 (AC-001, AC-006): an added member and rule reach the running team; the lead is told, the new member starts on its first message", async () => {
    const snapshotsBefore = view.snapshots().length;
    await writeConfig({ ...teamConfig, members: [...teamConfig.members, member("reviewer", ids.reviewer)],
      handoffs: [...teamConfig.handoffs, { from: "/lead", to: "/reviewer", rules: ["Review every draft."] }] });
    await until(() => stored().members.some((entry) => entry.address === "/reviewer"), "reviewer joined the stored tree", OS_FILE_EVENT_WAIT_MS);
    memberRun["/reviewer"] = stored().members.find((entry) => entry.address === "/reviewer")!.agentRunId;
    await until(() => view.snapshots().slice(snapshotsBefore).some((snap) => snap.members.some((entry) => entry.address === "/reviewer")),
      "the open view got an in-band snapshot with the reviewer", 30_000);
    const reviewerStatus = (await server.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: teamRunId }));
    const leadInput = await echo(view, memberRun["/lead"]!);
    const writerInput = await echo(view, memberRun["/writer"]!);
    expect(leadInput).toContain(`${NOTICE_HEAD}\n${joined("reviewer", "/reviewer")}\n${RULES_CHANGED}`);
    expect(writerInput).toContain(`${NOTICE_HEAD}\n${joined("reviewer", "/reviewer")}\n${RULES_UNCHANGED}`);
    const rules = await calls(view, memberRun["/lead"]!, callTool("get_handoff_rules", {}));
    expect(JSON.stringify(rules)).toContain("/reviewer");
    expect(JSON.stringify(rules)).toContain("Review every draft.");
    const sent = await calls(view, memberRun["/lead"]!, callTool("send_message_to", { recipient_address: "/reviewer", content: "ECHO_INPUT" }));
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
    let reviewerConversation: unknown;
    await until(async () => stringsOf(reviewerConversation = await view.conversationOf(memberRun["/reviewer"]!)).some((text) => text.startsWith("ECHO:")),
      "the reviewer started and answered", 90_000);
    const reviewerInput = stringsOf(reviewerConversation).find((text) => text.startsWith("ECHO:"))!;
    expect(reviewerInput).not.toContain(NOTICE_HEAD);
    const secondLeadInput = await echo(view, memberRun["/lead"]!);
    expect(secondLeadInput).not.toContain(NOTICE_HEAD);
    await keep("TF-01.json", { stored: stored(), snapshots: view.snapshots().slice(snapshotsBefore), resumeTree: reviewerStatus, leadInput, writerInput,
      rules, sent, reviewerInput, secondLeadInput });
  }, caseTimeout(1));

  it("TF-02 (AC-002, AC-010, AC-006): a removed idle member is refused by address and run ID, leaves the view, keeps its history", async () => {
    const writerRunId = memberRun["/writer"]!;
    const snapshotsBefore = view.snapshots().length;
    await writeConfig({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== "writer"),
      handoffs: teamConfig.handoffs.filter((rule) => rule.to !== "/writer") });
    await until(() => stored().former.some((entry) => entry.agentRunId === writerRunId), "writer became a former member", OS_FILE_EVENT_WAIT_MS);
    expect(addresses(stored().members)).toEqual(["/lead", "/reviewer"]);
    await until(() => { const last = view.snapshots().at(-1)!; return view.snapshots().length > snapshotsBefore && !last.members.some((entry) => entry.agentRunId === writerRunId); },
      "the open view dropped the writer", 30_000);
    const byAddress = await calls(view, memberRun["/lead"]!, callTool("send_message_to", { recipient_address: "/writer", content: "Are you there?" }));
    const byRunId = await calls(view, memberRun["/lead"]!, callTool("send_message_to", { target_agent_run_id: writerRunId, content: "Are you there?" }));
    expect(byAddress.isError, JSON.stringify(byAddress)).toBe(true);
    expect(JSON.stringify(byAddress)).toContain(refusal("writer", "/writer"));
    expect(JSON.stringify(byAddress)).toContain("COLLABORATION_TARGET_NOT_FOUND");
    // By run ID (design § Member States: the same refusal).
    expect(byRunId.isError, JSON.stringify(byRunId)).toBe(true);
    expect(JSON.stringify(byRunId), "by run ID: the former-member refusal").toContain(refusal("writer", "/writer"));
    expect(JSON.stringify(byRunId)).toContain("COLLABORATION_TARGET_NOT_FOUND");
    expect(storedLeaving(), "an idle member leaves no leaving marker").toEqual([]);
    // The lead's first input after the change was the send above: its notice came with it. The reviewer has its own.
    const leadConversation = stringsOf(await view.conversationOf(memberRun["/lead"]!));
    const reviewerInput = await echo(view, memberRun["/reviewer"]!);
    expect(reviewerInput).toContain(`${NOTICE_HEAD}\n${left("writer", "/writer")}\n${RULES_UNCHANGED}`);
    const leadAgain = await echo(view, memberRun["/lead"]!);
    expect(leadAgain).not.toContain(NOTICE_HEAD);
    const rules = await calls(view, memberRun["/lead"]!, callTool("get_handoff_rules", {}));
    expect(JSON.stringify(rules)).not.toContain("/writer");
    // Its history (REQ-002): the Memory page's read of the member run; the live member projection is recorded too.
    const memory = await attempt(() => memoryViewOf(teamRunId, writerRunId));
    const projection = await attempt(() => view.conversationOf(writerRunId));
    const lastSnapshotFrame = view.frames.filter((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT").at(-1)!;
    await keep("TF-02.json", { stored: stored(), lastSnapshot: view.snapshots().at(-1), snapshotPayloadKeys: Object.keys(lastSnapshotFrame.payload),
      byAddress, byRunId, reviewerInput, leadAgain, rules, memory, projection,
      leadNoticeSeen: leadConversation.some((text) => text.includes(left("writer", "/writer"))) });
    expect(memory.ok, JSON.stringify(memory)).toBe(true);
    expect(JSON.stringify(memory)).toContain("Reply OK.");
    // A stopped former member's conversation opens by run ID (REQ-002; IR-003), and the Memory page lists it under its own
    // agent definition.
    expect(projection.ok, `the former member's conversation opens: ${projection.ok ? "" : projection.error}`).toBe(true);
    expect(JSON.stringify(projection)).toContain("Reply OK.");
    const memoryPage = (await server.graphql(`query($t:String!){listAgentTeamRunsWithMemory(teamDefinitionId:$t, page:1, pageSize:50){
      entries { teamRunId memberTargets { memberAddress agentRunId agentDefinitionId } } } }`, { t: teamDefinitionId })).listAgentTeamRunsWithMemory.entries as Rec[];
    const writerTarget = memoryPage.find((entry) => entry.teamRunId === teamRunId)?.memberTargets?.find((target: Rec) => target.agentRunId === writerRunId) ?? null;
    await keep("TF-02-memory-page.json", { writerTarget, entries: memoryPage });
    expect(writerTarget, "the Memory page lists the former member").toMatchObject({ agentDefinitionId: ids.writer });
  }, caseTimeout(1));

  it("TF-03 (AC-003, DEC-002): a member removed mid-turn is leaving, refused at once, its send is delivered, then it is released", async () => {
    const reviewerRunId = memberRun["/reviewer"]!;
    const late = `LATE-REVIEW-${u}`;
    const snapshotsBefore = view.snapshots().length;
    // Busy until the test opens the gate (after it has seen the member leaving): its send then goes out.
    const busyFrom = view.frames.length;
    view.send(reviewerRunId, `CALL_TOOLS:${JSON.stringify([{ name: "send_message_to", arguments: { recipient_address: "/lead", content: late }, untilFile: gatePath("tf03") }])}`);
    await untilBusy(view, reviewerRunId, busyFrom);
    await writeConfig({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== "reviewer"),
      handoffs: teamConfig.handoffs.filter((rule) => rule.to !== "/reviewer") });
    await until(() => stored().former.some((entry) => entry.agentRunId === reviewerRunId), "reviewer became a former member", OS_FILE_EVENT_WAIT_MS);
    await until(() => view.snapshots().slice(snapshotsBefore).some((snap) => snap.members.some((entry) => entry.agentRunId === reviewerRunId && entry.leaving)),
      "the open view shows the reviewer leaving", 30_000);
    const refused = await calls(view, memberRun["/lead"]!, callTool("send_message_to", { recipient_address: "/reviewer", content: "Stop." }));
    const refusedByRunId = await calls(view, memberRun["/lead"]!, callTool("send_message_to", { target_agent_run_id: reviewerRunId, content: `BYRUNID-${u}` }));
    const stillLeaving = view.snapshots().at(-1)!.members.some((entry) => entry.agentRunId === reviewerRunId && entry.leaving);
    expect(JSON.stringify(refused)).toContain(refusal("reviewer", "/reviewer"));
    expect(JSON.stringify(refusedByRunId), "by run ID while leaving: the former-member refusal").toContain(refusal("reviewer", "/reviewer"));
    expect(JSON.stringify(refusedByRunId)).toContain("COLLABORATION_TARGET_NOT_FOUND");
    const markerWhileLeaving = storedLeaving();
    const rowsWhileLeaving = await leavingRows("team", teamRunId);
    expect(markerWhileLeaving, "the stored leaving marker while it finishes its turn").toEqual([reviewerRunId]);
    expect(rowsWhileLeaving.map((row) => row.agentRunId), "the run-tree row of the leaving member is tagged").toEqual([reviewerRunId]);
    // Its row still opens it (design SR-010): the member's own reads the app makes when the row is opened.
    const openedProjection = await attempt(() => view.conversationOf(reviewerRunId));
    const openedFileChanges = await attempt(() => server.graphql(`query($id:String!,$a:String!){getTeamMemberFileChanges(teamRunId:$id,agentRunId:$a){__typename}}`,
      { id: teamRunId, a: reviewerRunId }));
    await openGate("tf03");
    await until(async () => stringsOf(await view.conversationOf(memberRun["/lead"]!)).some((text) => text.includes(late)), "the leaving member's send reached the lead", 60_000);
    await until(() => !view.snapshots().at(-1)!.members.some((entry) => entry.agentRunId === reviewerRunId), "the reviewer was released from the view", 60_000);
    await until(() => storedLeaving().length === 0, "the release write cleared the marker", 30_000);
    const rowsAfterRelease = await runTreeRows("team", teamRunId);
    expect(rowsAfterRelease.some((row) => row.openTarget?.agentRunId === reviewerRunId), "the released member's row is gone").toBe(false);
    // The leaving member received nothing new (its memory holds no message sent to it after the removal).
    const reviewerMemory = JSON.stringify(await memoryViewOf(teamRunId, reviewerRunId));
    await keep("TF-03.json", { stored: stored(), snapshots: view.snapshots().slice(snapshotsBefore), refused, refusedByRunId, stillLeavingWhenRefused: stillLeaving,
      markerWhileLeaving, rowsWhileLeaving, markerAfterRelease: storedLeaving(),
      openedProjection: openedProjection.ok ? "ok" : openedProjection.error, openedFileChanges: openedFileChanges.ok ? "ok" : openedFileChanges.error,
      reviewerGotStop: reviewerMemory.includes("Stop."), reviewerGotByRunId: reviewerMemory.includes(`BYRUNID-${u}`) });
    expect(openedProjection.ok, `the leaving member opens (getTeamMemberRunProjection): ${openedProjection.ok ? "" : openedProjection.error}`).toBe(true);
    expect(openedFileChanges.ok, `the leaving member opens (getTeamMemberFileChanges): ${openedFileChanges.ok ? "" : openedFileChanges.error}`).toBe(true);
    expect(reviewerMemory.includes("Stop.")).toBe(false);
    expect(reviewerMemory.includes(`BYRUNID-${u}`), "a leaving member receives nothing").toBe(false);
    expect(stillLeaving, "the refusal came while the member was still leaving").toBe(true);
  }, caseTimeout(1));

  it("TF-04 (DEC-007, AC-003): a removed member added back keeps its run and conversation; its interrupt works while leaving", async () => {
    const writerRunId = stored().former.find((entry) => entry.address === "/writer")!.agentRunId;
    const okBefore = (JSON.stringify(await memoryViewOf(teamRunId, writerRunId)).match(/"OK"/g) ?? []).length;
    await writeConfig({ ...teamConfig, members: [...teamConfig.members, member("writer", ids.writer)],
      handoffs: [...teamConfig.handoffs, { from: "/lead", to: "/writer", rules: ["Draft the text."] }] });
    await until(() => stored().members.some((entry) => entry.address === "/writer"), "writer rejoined", OS_FILE_EVENT_WAIT_MS);
    expect(stored().members.find((entry) => entry.address === "/writer")!.agentRunId).toBe(writerRunId);
    expect(stored().former.some((entry) => entry.agentRunId === writerRunId)).toBe(false);
    view.send(writerRunId, "Reply OK.");
    await until(async () => okCount(await view.conversationOf(writerRunId)) >= 2, "the rejoined writer answered in its own conversation", 90_000);
    // Its conversation continues: the turn from before it left and the new one are in the same conversation.
    const conversation = stringsOf(await view.conversationOf(writerRunId));
    expect(conversation.filter((text) => text === "Reply OK.").length).toBeGreaterThanOrEqual(2);
    // Held turn, then removed: the user's interrupt of the leaving member is accepted, then it is released.
    const busyFrom = view.frames.length;
    view.send(writerRunId, "HOLD_TURN");
    await untilBusy(view, writerRunId, busyFrom);
    const snapshotsBefore = view.snapshots().length;
    await writeConfig({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== "writer"),
      handoffs: teamConfig.handoffs.filter((rule) => rule.to !== "/writer") });
    await until(() => view.snapshots().slice(snapshotsBefore).some((snap) => snap.members.some((entry) => entry.agentRunId === writerRunId && entry.leaving)),
      "the held writer is leaving", OS_FILE_EVENT_WAIT_MS);
    // A short quiet window (TESTING.md: proving something does not happen keeps its own window): a held turn keeps it leaving.
    await wait(3_000);
    const stillLeavingWhileHeld = view.snapshots().at(-1)!.members.some((entry) => entry.agentRunId === writerRunId && entry.leaving);
    const errorsFrom = view.frames.length;
    view.interrupt(writerRunId);
    const released = await until(() => !view.snapshots().at(-1)!.members.some((entry) => entry.agentRunId === writerRunId),
      "the interrupted leaving writer was released", 60_000).then(() => true, () => false);
    const interruptErrors = view.errors(errorsFrom).filter((frame) => frame.payload.agent_run_id === writerRunId);
    const interruptAck = view.acks(errorsFrom).find((frame) => frame.payload.command_type === "INTERRUPT_GENERATION")?.payload ?? null;
    const writerFrames = view.frames.slice(errorsFrom).filter((frame) => JSON.stringify(frame.payload).includes(writerRunId))
      .map((frame) => `${frame.type} ${JSON.stringify(frame.payload).slice(0, 200)}`);
    await keep("TF-04.json", { stored: stored(), okBefore, conversation: conversation.slice(-6), stillLeavingWhileHeld, interruptErrors, interruptAck, released,
      writerFramesAfterInterrupt: writerFrames.slice(0, 40), snapshots: view.snapshots().slice(snapshotsBefore) });
    expect(interruptAck, "the leaving member's interrupt is accepted").toMatchObject({ state: "accepted", agent_run_id: writerRunId });
    expect(released, "the interrupted leaving writer was released").toBe(true);
    expect(stillLeavingWhileHeld, "a held turn keeps the member leaving").toBe(true);
    expect(interruptErrors).toEqual([]);
  }, caseTimeout(2));

  it("TF-05 (DEC-006): another agent at a busy member's address: the old one finishes, the new one is reached at the address", async () => {
    // A member at /scout, busy, swapped for another agent.
    await writeConfig({ ...teamConfig, members: [...teamConfig.members, member("scout", ids.reviewer)],
      handoffs: [...teamConfig.handoffs, { from: "/lead", to: "/scout", rules: ["Scout the sources."] }] });
    await until(() => stored().members.some((entry) => entry.address === "/scout"), "scout joined", OS_FILE_EVENT_WAIT_MS);
    const oldScout = stored().members.find((entry) => entry.address === "/scout")!.agentRunId;
    const late = `LATE-SCOUT-${u}`;
    // Busy until the test opens the gate (after the swap is committed and the new run answered): its send then goes out.
    const busyFrom = view.frames.length;
    view.send(oldScout, `CALL_TOOLS:${JSON.stringify([{ name: "send_message_to", arguments: { recipient_address: "/lead", content: late }, untilFile: gatePath("tf05") }])}`);
    await untilBusy(view, oldScout, busyFrom);
    await writeConfig({ ...teamConfig, members: teamConfig.members.map((entry) => entry.memberName === "scout" ? member("scout", ids.alt) : entry) });
    await until(() => { const now = stored().members.find((entry) => entry.address === "/scout"); return Boolean(now && now.agentRunId !== oldScout); }, "a new run at /scout", OS_FILE_EVENT_WAIT_MS);
    expect(storedLeaving(), "the swapped-out member is leaving while its turn runs").toContain(oldScout);
    const newScout = stored().members.find((entry) => entry.address === "/scout")!;
    expect(newScout.agentDefinitionId).toBe(ids.alt);
    expect(stored().former.some((entry) => entry.agentRunId === oldScout)).toBe(true);
    const sent = await calls(view, memberRun["/lead"]!, callTool("send_message_to", { recipient_address: "/scout", content: "Reply OK." }));
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
    await until(async () => okCount(await view.conversationOf(newScout.agentRunId)) >= 1, "the new scout started and answered", 90_000);
    const oldConversation = stringsOf(JSON.parse(JSON.stringify(await memoryViewOf(teamRunId, oldScout))));
    await openGate("tf05");
    await until(async () => stringsOf(await view.conversationOf(memberRun["/lead"]!)).some((text) => text.includes(late)), "the old scout's send reached the lead", 60_000);
    await until(() => !view.snapshots().at(-1)!.members.some((entry) => entry.agentRunId === oldScout), "the old scout was released", 60_000);
    await keep("TF-05.json", { stored: stored(), oldScout, newScout, sent, oldConversationTail: oldConversation.slice(-4), lastSnapshot: view.snapshots().at(-1) });
    expect(oldConversation.some((text) => text.includes("Reply OK."))).toBe(false);
  }, caseTimeout(2));

  it("TF-06 (AC-008): a new coordinator is the run's coordinator in the stored tree and the open view", async () => {
    const snapshotsBefore = view.snapshots().length;
    await writeConfig({ ...teamConfig, coordinatorMemberName: "scout" });
    await until(() => stored().coordinator === "/scout", "the stored tree names the new coordinator", OS_FILE_EVENT_WAIT_MS);
    await until(() => view.snapshots().slice(snapshotsBefore).some((snap) => snap.coordinator === "/scout"), "the open view names the new coordinator", 30_000);
    const resume = (await server.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: teamRunId })).getTeamRunResumeConfig;
    expect(JSON.stringify(resume)).toContain("/scout");
    await keep("TF-06.json", { coordinator: stored().coordinator, snapshot: view.snapshots().at(-1) });
    await writeConfig({ ...teamConfig, coordinatorMemberName: "lead" });
    await until(() => stored().coordinator === "/lead", "coordinator back to the lead", OS_FILE_EVENT_WAIT_MS);
  }, caseTimeout(2));

  it("TF-07 (AC-007): an unusable Team definition leaves the run unchanged; the problem is reported", async () => {
    const before = stored();
    /** The valid configuration every settled state starts from (writeConfig also records broken ones in teamConfig). */
    const valid = teamConfig;
    const teamIssues = async () => ((await server.graphql(`{ agentTeamDefinitions { id name loadIssues { code reason usingLastGood } } }`))
      .agentTeamDefinitions as Rec[]).find((team) => team.id === teamDefinitionId) ?? null;
    const linesSince = (from: number) => server.output().slice(from).split("\n")
      .filter((line) => /TEAM_RUN_DEFINITION_NOT_FOLLOWED|TEAM_MEMBER_NOT_ADDED|team-config|load ?issue|invalid|last.good/i.test(line));
    /** The planner's warning for this run (IR-002: once per run and reason). */
    const runWarnings = (lines: string[]) => lines.filter((line) => line.includes(`TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '${teamRunId}' keeps its members: `));
    /**
     * A settled valid state the run has visibly followed: a valid config whose lead → scout rule carries `marker`, waited for
     * in the stored tree. The run's planner has then read a valid definition (which resets warn-once) before the next breakage.
     */
    const settleValid = async (marker: string) => {
      await writeConfig({ ...valid, handoffs: valid.handoffs.map((rule) => rule.to === "/scout" ? { ...rule, rules: [`Scout the sources. ${marker}`] } : rule) });
      await until(() => JSON.stringify(stored().handoffs).includes(marker), `the run followed the valid definition ${marker}`, OS_FILE_EVENT_WAIT_MS);
      return server.output().length;
    };
    /**
     * After the breakage's warning: another definition announcement (an unrelated agent's file changes) that has visibly
     * landed (GraphQL shows it), then the warnings are counted: warn-once means still exactly one.
     */
    let sentinels = 0;
    const sentinelLanded = async () => {
      const text = `Sentinel ${u}-${++sentinels}.`;
      await fsp.writeFile(path.join(packageRoot, "agents", ids.alt, "agent.md"),
        `---\nname: ${ids.alt}\ndescription: Team follows definition E2E agent\nrole: assistant\n---\n\nInstructions of ${ids.alt}. ${text}\n`);
      await until(async () => JSON.stringify(((await server.graphql("{ agentDefinitions { id instructions } }")).agentDefinitions as Rec[])
        .find((agent) => agent.id === ids.alt)).includes(text), `sentinel ${sentinels} landed`, OS_FILE_EVENT_WAIT_MS);
    };
    const untilWarned = (from: number, label: string) => until(() => runWarnings(linesSince(from)).length >= 1, `${label}: the warning`, OS_FILE_EVENT_WAIT_MS);
    // (a) An unparsable file: one warning and a load issue; another announcement while it is still broken: still one.
    let from = await settleValid("V1");
    await fsp.writeFile(configFile, "{ \"coordinatorMemberName\": \"lead\", \"members\": [ oops");
    await untilWarned(from, "unparsable");
    await until(async () => ((await teamIssues())?.loadIssues ?? []).length > 0, "the unparsable file is a load issue", OS_FILE_EVENT_WAIT_MS);
    await sentinelLanded();
    const broken = { stored: stored(), definition: await teamIssues(), serverLines: linesSince(from) };
    // (a2) A valid edit the run follows, then a new breakage: one more warning.
    from = await settleValid("V2");
    await fsp.writeFile(configFile, "not json at all");
    await untilWarned(from, "unparsable again");
    await sentinelLanded();
    const brokenAgain = { stored: stored(), serverLines: linesSince(from) };
    // (b) A member whose agent does not exist, with a rule to it.
    from = await settleValid("V3");
    await writeConfig({ ...valid, members: [...valid.members, member("ghost", `tf-no-such-agent-${u}`)],
      handoffs: [...valid.handoffs, { from: "/lead", to: "/ghost", rules: ["Ask the ghost."] }] });
    await untilWarned(from, "unknown agent");
    await sentinelLanded();
    const ghost = { stored: stored(), definition: await teamIssues(), serverLines: linesSince(from),
      rules: await calls(view, memberRun["/lead"]!, callTool("get_handoff_rules", {})) };
    // (c) The Team definition is gone (its folder moved away, as when an author renames or deletes it).
    from = await settleValid("V4");
    const teamDir = path.dirname(configFile);
    await fsp.rename(teamDir, path.join(root, "moved-team"));
    await untilWarned(from, "definition gone");
    await sentinelLanded();
    const gone = { stored: stored(), definition: await teamIssues(), serverLines: linesSince(from) };
    await fsp.rename(path.join(root, "moved-team"), teamDir);
    await until(async () => Boolean(await teamIssues()), "the definition is back", OS_FILE_EVENT_WAIT_MS);
    await settleValid("V5");
    const back = { stored: stored(), definition: await teamIssues() };
    await keep("TF-07.json", { before: { members: before.members, coordinator: before.coordinator }, broken, brokenAgain, ghost, gone, back });
    for (const [label, after] of [["unparsable", broken.stored], ["unparsable again", brokenAgain.stored], ["unknown agent", ghost.stored], ["definition gone", gone.stored], ["back", back.stored]] as const) {
      expect(after.members, label).toEqual(before.members);
      expect(after.coordinator, label).toBe(before.coordinator);
    }
    expect(JSON.stringify(ghost.rules)).not.toContain("/ghost");
    expect(JSON.stringify(broken.definition?.loadIssues ?? []), "the unparsable file is reported on the definition").not.toBe("[]");
    // Each unusable definition: exactly one warning naming the run and the reason (IR-002 O-1/O-2), counted after a later
    // announcement had landed.
    for (const [label, lines] of [["unparsable (and a later announcement)", broken.serverLines], ["unparsable again after a valid edit", brokenAgain.serverLines],
      ["unknown agent", ghost.serverLines], ["definition gone", gone.serverLines]] as const) {
      expect(runWarnings(lines), `${label}: ${lines.join(" | ").slice(0, 1200)}`).toHaveLength(1);
    }
    // The run keeps working.
    const rules = await calls(view, memberRun["/lead"]!, callTool("get_handoff_rules", {}));
    expect(JSON.stringify(rules)).toContain("/scout");
  }, caseTimeout(14));

  it("TF-08 (AC-004): a change made while the run is stopped is applied when it is reopened, also after a server restart", async () => {
    /** The user's message reopens a stopped Team run (the app's path); the notice comes with that input or the next. */
    const reopenAndEcho = async () => {
      view = await openTeam();
      const first = await echo(view, memberRun["/lead"]!);
      const second = await echo(view, memberRun["/lead"]!);
      return { first, second };
    };
    view.close();
    expect((await server.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);
    await writeConfig({ ...teamConfig, members: [...teamConfig.members, member("editor", ids.writer)] });
    // The server has read the change (the definition lists the editor) while the run is stopped: the run is not changed.
    await until(async () => JSON.stringify(((await server.graphql("{ agentTeamDefinitions { id nodes { memberName } } }")).agentTeamDefinitions as Rec[])
      .find((team) => team.id === teamDefinitionId)?.nodes ?? []).includes("\"editor\""), "the definition lists the editor", OS_FILE_EVENT_WAIT_MS);
    const whileStopped = stored().members.some((entry) => entry.address === "/editor");
    const reopened = await reopenAndEcho();
    const afterReopen = stored();
    // Restart: stop the run and the server, change the definition, start a new server, the user's message reopens the run.
    view.close();
    expect((await server.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);
    await stopServer(server, "SIGTERM");
    await writeConfig({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== "editor") });
    server = await startServer("server #2");
    const afterRestartBeforeReopen = stored();
    const restarted = await reopenAndEcho();
    const afterRestart = stored();
    await keep("TF-08.json", { whileStopped, reopened, afterReopen: { members: afterReopen.members, former: afterReopen.former },
      afterRestartBeforeReopen: afterRestartBeforeReopen.members, restarted, afterRestart: { members: afterRestart.members, former: afterRestart.former } });
    expect(whileStopped, "a stopped run is changed only when it is reopened").toBe(false);
    expect(afterReopen.members.some((entry) => entry.address === "/editor")).toBe(true);
    const joinedNotice = `${NOTICE_HEAD}\n${joined("editor", "/editor")}`;
    expect([reopened.first, reopened.second].filter((input) => input.includes(joinedNotice)), "told once after the reopen").toHaveLength(1);
    expect(afterRestart.members.some((entry) => entry.address === "/editor")).toBe(false);
    expect(afterRestart.former.some((entry) => entry.address === "/editor")).toBe(true);
    const leftNotice = `${NOTICE_HEAD}\n${left("editor", "/editor")}`;
    expect([restarted.first, restarted.second].filter((input) => input.includes(leftNotice)), "told once after the restart").toHaveLength(1);
  }, caseTimeout(2));

  it("TF-09 (AC-005): a Team copy started by an agent's delegate_task follows the same edits", async () => {
    const host = (await server.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.host, ...config() } })).createAgentRun;
    expect(host.success, host.message).toBe(true);
    const hostSocket = new WebSocket(`ws://${new URL(server.url).host}/ws/agent/${host.runId}`);
    await new Promise<void>((resolve, reject) => { hostSocket.once("open", resolve); hostSocket.once("error", reject); });
    const hostConversation = async () => (await server.graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: host.runId })).getRunProjection?.conversation;
    const before = calledResults(await hostConversation()).length;
    sendE2eSendMessageCommand(hostSocket, { agent_run_id: host.runId, content: callTool("delegate_task", { recipient_address: `/${segment(teamName)}`, description: "Draft the launch post." }) });
    let results: string[] = [];
    await until(async () => { results = calledResults(await hostConversation()); return results.length > before; }, "host delegated the Team", 90_000);
    const delegated = toolResult(results[before]!);
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
    const copyRunId = delegated.target_team_run_id as string;
    await until(async () => taskAgentsIn(await delegatedRunsTree(server.graphql, "agent", host.runId)).some((entry) => entry.teamRunId === copyRunId), "copy in the host tree", 60_000);
    const copyBefore = stored(copyRunId);
    expect(copyBefore.tree.copiedFrom).toBe("team_definition");
    const copy = await openTeam(copyRunId);
    const copyLead = copyBefore.members.find((entry) => entry.address.endsWith("/lead"))!;
    const scoutAddress = copyBefore.members.find((entry) => entry.address.endsWith("/scout"))!.address;
    await until(async () => okCount(await copy.conversationOf(copyLead.agentRunId)) >= 1, "the copy's lead answered its Task", 90_000);
    // Add a member and remove the scout.
    await writeConfig({ ...teamConfig, members: [...teamConfig.members.filter((entry) => entry.memberName !== "scout"), member("checker", ids.reviewer)],
      handoffs: [...teamConfig.handoffs.filter((rule) => rule.to !== "/scout"), { from: "/lead", to: "/checker", rules: ["Check facts."] }] });
    await until(() => stored(copyRunId).members.some((entry) => entry.address.endsWith("/checker")), "the copy gained the checker", OS_FILE_EVENT_WAIT_MS);
    const copyAfter = stored(copyRunId);
    const checkerAddress = copyAfter.members.find((entry) => entry.address.endsWith("/checker"))!.address;
    expect(copyAfter.former.some((entry) => entry.address === scoutAddress)).toBe(true);
    const rules = await calls(copy, copyLead.agentRunId, callTool("get_handoff_rules", {}));
    expect(JSON.stringify(rules)).toContain("Check facts.");
    const refused = await calls(copy, copyLead.agentRunId, callTool("send_message_to", { recipient_address: scoutAddress, content: "Still there?" }));
    expect(JSON.stringify(refused)).toContain("is no longer a member of your team: it was removed from the team definition.");
    const sent = await calls(copy, copyLead.agentRunId, callTool("send_message_to", { recipient_address: checkerAddress, content: "Reply OK." }));
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
    const checkerRunId = copyAfter.members.find((entry) => entry.address === checkerAddress)!.agentRunId;
    await until(async () => okCount(await copy.conversationOf(checkerRunId)) >= 1, "the copy's checker started and answered", 90_000);
    // The standalone run followed the same edit.
    await until(() => stored().members.some((entry) => entry.address === "/checker"), "the standalone run gained the checker too", OS_FILE_EVENT_WAIT_MS);
    await keep("TF-09.json", { copiedFrom: copyAfter.tree.copiedFrom, copyBefore: copyBefore.members, copyAfter: { members: copyAfter.members, former: copyAfter.former },
      rules, refused, sent });
    copy.close();
    hostSocket.terminate();
  }, caseTimeout(1));

  it("TF-10 (AC-001 by the app's editor): a user's own Team saved through updateAgentTeamDefinition: its run follows", async () => {
    const agent = async (name: string) => (await server.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: `${name} (TF E2E)`, instructions: `Instructions of ${name}.`, toolNames: [] } })).createAgentDefinition.id as string;
    const own = { lead: await agent(`TF own lead ${u}`), mate: await agent(`TF own mate ${u}`), extra: await agent(`TF own extra ${u}`) };
    const nodes = [{ memberName: "lead", ref: own.lead, refScope: "SHARED" }, { memberName: "mate", ref: own.mate, refScope: "SHARED" }];
    const team = (await server.graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `TF own team ${u}`, description: "Own team", instructions: "Work together.", coordinatorMemberName: "lead", nodes } })).createAgentTeamDefinition.id as string;
    const created = (await server.graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: own.lead, ...config() }, { memberAddress: "/mate", agentDefinitionId: own.mate, ...config() }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const ownRun = created.teamRunId as string;
    const ownView = await openTeam(ownRun);
    const leadRunId = stored(ownRun).members.find((entry) => entry.address === "/lead")!.agentRunId;
    ownView.send(leadRunId, "Reply OK.");
    await until(async () => okCount(await ownView.conversationOf(leadRunId)) >= 1, "own lead started", 90_000);
    // The app's editor saves the whole definition (the renderer's UpdateAgentTeamDefinition, with the revision it read).
    const revision = ((await server.graphql("{ agentTeamDefinitions { id revision } }")).agentTeamDefinitions as Rec[]).find((entry) => entry.id === team)!.revision;
    await server.graphql(`mutation($input:UpdateAgentTeamDefinitionInput!){updateAgentTeamDefinition(input:$input){id}}`,
      { input: { id: team, expectedRevision: revision, coordinatorMemberName: "lead", nodes: [...nodes, { memberName: "extra", ref: own.extra, refScope: "SHARED" }],
        handoffs: [{ from: "/lead", to: "/extra", rules: ["Ask the extra member."] }] } });
    await until(() => stored(ownRun).members.some((entry) => entry.address === "/extra"), "own run gained the extra member", OS_FILE_EVENT_WAIT_MS);
    const leadInput = await echo(ownView, leadRunId);
    expect(leadInput).toContain(`${NOTICE_HEAD}\n${joined("extra", "/extra")}\n${RULES_CHANGED}`);
    const rules = await calls(ownView, leadRunId, callTool("get_handoff_rules", {}));
    expect(JSON.stringify(rules)).toContain("Ask the extra member.");
    await keep("TF-10.json", { stored: stored(ownRun), leadInput, rules });
    ownView.close();
  }, caseTimeout(1));

  /** A member at `address` holds a turn and is then removed: it is leaving (stored marker and tagged run-tree row). */
  const removeWhileHeld = async (memberName: string, ref: string) => {
    if (!teamConfig.members.some((entry) => entry.memberName === memberName)) {
      await writeConfig({ ...teamConfig, members: [...teamConfig.members, member(memberName, ref)] });
      await until(() => stored().members.some((entry) => entry.address === `/${memberName}`), `${memberName} is a member`, OS_FILE_EVENT_WAIT_MS);
    }
    const runId = stored().members.find((entry) => entry.address === `/${memberName}`)!.agentRunId;
    const busyFrom = view.frames.length;
    view.send(runId, "HOLD_TURN");
    await untilBusy(view, runId, busyFrom);
    await writeConfig({ ...teamConfig, members: teamConfig.members.filter((entry) => entry.memberName !== memberName),
      handoffs: teamConfig.handoffs.filter((rule) => rule.to !== `/${memberName}` && rule.from !== `/${memberName}`) });
    await until(() => storedLeaving().includes(runId), `${memberName} is leaving (stored marker)`, OS_FILE_EVENT_WAIT_MS);
    await until(async () => (await leavingRows("team", teamRunId)).some((row) => row.agentRunId === runId), `${memberName}'s row is tagged leaving`, OS_FILE_EVENT_WAIT_MS);
    return runId;
  };

  it("TF-11 (AC-003, SR-010): a Stop while a member is leaving shows no leaving row; reopening clears the marker", async () => {
    const runId = await removeWhileHeld("checker", ids.reviewer);
    const rowsLeaving = await leavingRows("team", teamRunId);
    view.close();
    expect((await server.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);
    await until(async () => (await leavingRows("team", teamRunId)).length === 0, "no leaving row once the team is stopped", 30_000).catch(() => undefined);
    const rowsAfterStop = await leavingRows("team", teamRunId);
    const markerAfterStop = storedLeaving();
    view = await openTeam();
    await echo(view, memberRun["/lead"]!);
    const markerAfterReopen = storedLeaving();
    const rowsAfterReopen = await runTreeRows("team", teamRunId);
    await keep("TF-11.json", { runId, rowsLeaving, rowsAfterStop, markerAfterStop, markerAfterReopen,
      formerAfterReopen: stored().former.map((entry) => entry.address), rowsAfterReopen: rowsAfterReopen.map((row) => ({ kind: row.kind, address: row.address, leaving: row.leaving ?? null })) });
    expect(rowsAfterStop, "no leaving row once the team is stopped").toEqual([]);
    expect(markerAfterReopen, "reopening clears the marker").toEqual([]);
    expect(rowsAfterReopen.some((row) => row.openTarget?.agentRunId === runId)).toBe(false);
    expect(stored().former.some((entry) => entry.agentRunId === runId)).toBe(true);
  }, caseTimeout(2));

  it("TF-12 (AC-003, AC-004, SR-010): a server restart while a member is leaving shows no leaving row; reopening clears the marker", async () => {
    const runId = await removeWhileHeld("checker", ids.reviewer);
    view.close();
    await stopServer(server, "SIGTERM");
    server = await startServer("server #3");
    const markerAfterRestart = storedLeaving();
    const rowsAfterRestart = await leavingRows("team", teamRunId);
    view = await openTeam();
    await echo(view, memberRun["/lead"]!);
    const markerAfterReopen = storedLeaving();
    const rowsAfterReopen = await runTreeRows("team", teamRunId);
    await keep("TF-12.json", { runId, markerAfterRestart, rowsAfterRestart, markerAfterReopen,
      rowsAfterReopen: rowsAfterReopen.map((row) => ({ kind: row.kind, address: row.address, leaving: row.leaving ?? null })) });
    expect(rowsAfterRestart, "no leaving row after a restart").toEqual([]);
    expect(markerAfterReopen, "reopening clears the marker").toEqual([]);
    expect(rowsAfterReopen.some((row) => row.openTarget?.agentRunId === runId)).toBe(false);
  }, caseTimeout(2));
});
