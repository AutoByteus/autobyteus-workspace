import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, calledResults, segment, stringsOf, taskAgentsIn, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// unclean-shutdown-delegated-run-restore AC-005 (REQ-001..REQ-004, QR-002) and AC-006 (REQ-005) through the built server
// (`dist/app.js`) in separate processes on a test-owned data root, the Team stream, GraphQL and the AGY backend. Only the
// external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes the agent call
// the real tool; any other message is answered `OK`. No provider inference.
// A Team root's manager delegates four task agent Teams; each coordinator answers its Task and two user turns in non-ASCII
// text (the records before the damage hold multi-byte characters, so a cut by characters would miss). The server process is then killed
// (SIGKILL: no graceful shutdown, as at a power loss) and each coordinator's `raw_traces_active.jsonl` gets the damage the
// filesystem leaves behind:
// - USR-1 1,241 zero bytes after the last record (the file size reached the disk, the data did not);
// - USR-2 a torn last record without `\n`;  USR-3 a torn last record whose `\n` did land;
// - USR-4 a line with interior zero bytes before the last record (damage a shutdown does not leave at the end).
// A new server process restores the root and the user sends "continue" to each coordinator on the Team stream:
// USR-1..3 are accepted, the coordinator answers, its log keeps the earlier bytes plus the new turn and holds no 0x00, and
// the server warns "Removed the damaged end of a memory log." naming the file and the exact bytes removed. USR-4 is refused
// with TASK_EXECUTION_CONTEXT_UNAVAILABLE naming the Team, its coordinator, the damaged line and the next step; the file stays
// byte for byte unchanged. A third server process then reads every repaired log fresh: a second message keeps every record
// (SCN-003) and nothing more is removed.
// Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts --no-watch
// `USDR_E2E_EVIDENCE_DIR` keeps a JSON receipt.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Rec };
type CaseId = "USR-1" | "USR-2" | "USR-3" | "USR-4";
type Copy = { caseId: CaseId; teamRunId: string; address: string; coordinator: string; coordinatorAddress: string; logPath: string };
type Damage = { before: Buffer; damaged: Buffer; bytesAdded: number; damagedLine?: number };

const WARNING = "Removed the damaged end of a memory log.";
const TORN = '{"id":"x","trace_type":"tool_res';
const NON_ASCII_TURNS = ["Überarbeite den Entwurf für die Kampagne — kürzer, bitte ✓", "キャンペーンの見出しを確認してください 🚀 «Größe» ½"];
const serverDir = path.resolve(__dirname, "../../..");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const records = (bytes: Buffer) => bytes.toString("utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line) as Rec);

suite("A delegated Team whose coordinator's log was damaged by an unclean shutdown (built server, scripted AGY)", () => {
  let root = "";
  const servers: Array<{ child: ChildProcess; output: () => string }> = [];
  const evidence: Rec = { cases: {} };
  const copies: Copy[] = [];
  const damage = new Map<CaseId, Damage>();
  let rootRunId = "";
  let managerRunId = "";
  let managerLog = "";
  let managerLogBefore = Buffer.alloc(0);
  let restart: Awaited<ReturnType<typeof startServer>>;
  let restartTeam: Awaited<ReturnType<typeof openTeam>>;

  const startServer = async (label: string) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      USER: process.env.USER ?? "tester", DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ANTIGRAVITY_CLI_COMMAND: cli,
      AGY_FAKE_CASE: "linked_skills", AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" };
    const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    servers.push({ child, output: () => output });
    await until(() => {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label}: server exited: ${output.slice(-2000)}`);
      return output.includes("Server listening on 127.0.0.1:0");
    }, `${label}: server ready`, 120_000);
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

  const stopServer = async (server: Server, signal: NodeJS.Signals) => {
    if (server.child.exitCode !== null || server.child.signalCode !== null) return;
    const exited = new Promise((resolve) => server.child.once("exit", resolve));
    server.child.kill(signal);
    const force = setTimeout(() => server.child.kill("SIGKILL"), 8_000);
    try { await exited; } finally { clearTimeout(force); }
  };

  /** AGY processes this test's servers started (their working folders are under the test root). */
  const agyProcesses = () => spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" }).stdout.split("\n")
    .filter((line) => line.includes(cli) && !line.includes("--version")).map((line) => line.trim())
    .filter((line) => { const pid = line.split(/\s+/)[0]!; return spawnSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" }).stdout.includes(root); });

  /** The Team root's stream: the user's messages to any agent of the root, and every frame it sends back. */
  const openTeam = async (server: Server) => {
    const socket = new WebSocket(`ws://${new URL(server.url).host}/ws/agent-team/${rootRunId}`);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), `${server.label}: team stream snapshot`, 30_000);
    const conversationOf = async (agentRunId: string) => (await server.graphql(
      `query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: rootRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
    const send = (agentRunId: string, content: string) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content });
    const errorsFor = (agentRunId: string, from: number) => frames.slice(from).filter((frame) => frame.type === "ERROR" && frame.payload.agent_run_id === agentRunId);
    return { socket, frames, conversationOf, send, errorsFor, close: () => socket.terminate() };
  };

  /** Strings of a conversation equal to `OK` (the scripted runtime's answer to a plain message). */
  const okCount = (conversation: unknown) => stringsOf(conversation).filter((text) => text.trim() === "OK").length;
  const warningsIn = (output: string) => output.split(WARNING).slice(1).map((after) => after.slice(0, after.indexOf("}") + 1).replace(/\s+/g, " "));
  const warningsFor = (output: string, logPath: string) => warningsIn(output).filter((text) => text.includes(logPath));

  const findLog = (agentRunId: string): string => {
    const found = spawnSync("find", [path.join(root, "memory"), "-type", "d", "-name", agentRunId], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean)
      .map((dir) => path.join(dir, "raw_traces_active.jsonl")).filter((file) => fs.existsSync(file));
    expect(found, `raw-trace log of ${agentRunId}`).toHaveLength(1);
    return found[0]!;
  };

  beforeAll(async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "usdr-e2e-")));
    const workspace = path.join(root, "workspace");
    await fsp.mkdir(workspace, { recursive: true });
    await fsp.mkdir(path.join(root, "home"), { recursive: true });
    await fsp.mkdir(path.join(root, "db"), { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    await fsp.access(path.join(serverDir, "dist", "app.js"));

    // Server #1: the run before the power loss.
    const first = await startServer("server #1");
    const config = { workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" };
    const suffix = randomUUID().slice(0, 6);
    const agent = async (name: string) => (await first.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: `${name} (unclean shutdown E2E)`, instructions: `Instructions of ${name}.`, toolNames: [] } })).createAgentDefinition.id as string;
    const team = async (name: string, members: Array<[string, string]>, coordinator: string) => (await first.graphql(
      `mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name, description: "Unclean shutdown E2E team", instructions: `Team instruction of ${name}.`, coordinatorMemberName: coordinator,
        nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })) } })).createAgentTeamDefinition.id as string;
    const ids = { manager: await agent(`USDR Manager ${suffix}`), mate: await agent(`USDR Mate ${suffix}`), lead: await agent(`USDR Lead ${suffix}`), peer: await agent(`USDR Peer ${suffix}`) };
    const squadName = `USDR Marketing ${suffix}`;
    await team(squadName, [["lead", ids.lead], ["peer", ids.peer]], "lead");
    const rootTeam = await team(`USDR Root ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    const created = (await first.graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: rootTeam, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
        { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config }, { memberAddress: "/mate", agentDefinitionId: ids.mate, ...config }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    rootRunId = created.teamRunId;
    const tree = (await first.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootRunId })).getTeamRunResumeConfig.executionTree;
    managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;

    const view = await openTeam(first);
    for (const caseId of ["USR-1", "USR-2", "USR-3", "USR-4"] as const) {
      const before = calledResults(await view.conversationOf(managerRunId)).length;
      view.send(managerRunId, callTool("delegate_task", { recipient_address: `/${segment(squadName)}`, description: `Draft the launch post (${caseId}).` }));
      let results: string[] = [];
      await until(async () => { results = calledResults(await view.conversationOf(managerRunId)); return results.length > before; }, `manager delegates ${caseId}`, 90_000);
      const delegated = toolResult(results[before]!);
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
      const teamRunId = delegated.target_team_run_id as string;
      const coordinator = delegated.target_team_coordinator_agent_run_id as string;
      let node: ReturnType<typeof taskAgentsIn>[number] | undefined;
      await until(async () => Boolean(node = taskAgentsIn((await first.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
        { id: rootRunId })).getTeamRunResumeConfig.executionTree).find((entry) => entry.teamRunId === teamRunId)), `${caseId}: delegated Team in the tree`, 60_000);
      // The coordinator works on its Task: it receives it and answers; the user then talks with it in non-ASCII text, so the
      // records before the damage hold multi-byte characters (the old repair cut by characters, not bytes).
      await until(async () => okCount(await view.conversationOf(coordinator)) >= 1, `${caseId}: coordinator answered its Task`, 90_000);
      for (const [index, text] of NON_ASCII_TURNS.entries()) {
        view.send(coordinator, `${text} (${caseId})`);
        await until(async () => okCount(await view.conversationOf(coordinator)) >= index + 2, `${caseId}: coordinator answered turn ${index + 1}`, 90_000);
      }
      const coordinatorAddress = node!.members.find((member) => member.agentRunId === coordinator)!.address;
      copies.push({ caseId, teamRunId, address: node!.address, coordinator, coordinatorAddress, logPath: "" });
    }
    view.close();
    // Let the last turn's trailing records land before the crash.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    for (const copy of copies) copy.logPath = findLog(copy.coordinator);
    managerLog = findLog(managerRunId);

    // Power loss: the server process ends without a graceful shutdown, and so do its runtime processes.
    await stopServer(first, "SIGKILL");
    for (const line of agyProcesses()) process.kill(Number(line.split(/\s+/)[0]), "SIGKILL");
    managerLogBefore = await fsp.readFile(managerLog);

    // What the filesystem leaves behind in each coordinator's log.
    for (const copy of copies) {
      const before = await fsp.readFile(copy.logPath);
      expect(before.at(-1), `${copy.caseId}: the log ends with a complete record before the damage`).toBe(0x0a);
      expect(records(before).some((record) => record.trace_type === "user") && records(before).some((record) => record.trace_type === "assistant"),
        `${copy.caseId}: the coordinator's log holds its conversation`).toBe(true);
      expect(before.length, `${copy.caseId}: the log holds multi-byte characters`).toBeGreaterThan(before.toString("utf8").length);
      expect(records(before).length, `${copy.caseId}: several turns before the damage`).toBeGreaterThanOrEqual(6);
      let damaged: Buffer;
      let damagedLine: number | undefined;
      if (copy.caseId === "USR-1") damaged = Buffer.concat([before, Buffer.alloc(1241)]);
      else if (copy.caseId === "USR-2") damaged = Buffer.concat([before, Buffer.from(TORN)]);
      else if (copy.caseId === "USR-3") damaged = Buffer.concat([before, Buffer.from(`${TORN}\n`)]);
      else {
        // Zeros inside a record in the middle of the log (out-of-order writeback), with complete records after it.
        const lines = before.toString("utf8").split("\n").filter(Boolean);
        damagedLine = Math.ceil(lines.length / 2);
        const start = Buffer.byteLength(lines.slice(0, damagedLine - 1).map((line) => `${line}\n`).join(""));
        const length = Buffer.byteLength(lines[damagedLine - 1]!);
        damaged = Buffer.from(before);
        damaged.fill(0, start + Math.floor(length / 2) - 4, start + Math.floor(length / 2) + 4);
      }
      await fsp.writeFile(copy.logPath, damaged);
      damage.set(copy.caseId, { before, damaged, bytesAdded: damaged.length - before.length, damagedLine });
    }
    evidence.setup = { rootRunId, managerRunId, copies: copies.map((copy) => ({ ...copy, logPath: path.relative(root, copy.logPath) })),
      damage: Object.fromEntries([...damage].map(([id, d]) => [id, { bytesBefore: d.before.length, bytesAfterDamage: d.damaged.length, bytesAdded: d.bytesAdded,
        damagedLine: d.damagedLine ?? null, recordsBefore: records(d.before).length }])) };

    // Server #2: the node restarted; the user opens the run.
    restart = await startServer("server #2");
    const restored = (await restart.graphql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`, { id: rootRunId })).restoreAgentTeamRun;
    expect(restored.success, restored.message).toBe(true);
    restartTeam = await openTeam(restart);
  }, 600_000);

  afterAll(async () => {
    restartTeam?.close();
    for (const server of servers) await stopServer({ child: server.child } as Server, "SIGTERM").catch(() => undefined);
    const leftover = root ? agyProcesses() : [];
    for (const line of leftover) process.kill(Number(line.split(/\s+/)[0]), "SIGKILL");
    if (root) await fsp.rm(root, { recursive: true, force: true });
    const dir = process.env["USDR_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path.join(dir, "unclean-shutdown-delegated-team-restore.json"), `${JSON.stringify({ ...evidence,
        cleanup: { serversExited: servers.map((server) => server.child.exitCode !== null || server.child.signalCode !== null),
          leftoverAgyProcesses: leftover.length, dataRemoved: !fs.existsSync(root) } }, null, 2)}\n`);
      await fsp.writeFile(path.join(dir, "unclean-shutdown-delegated-team-restore-server-output.log"),
        servers.map((server, index) => `===== server #${index + 1} =====\n${server.output().replaceAll(root, "<root>")}`).join("\n"));
    }
    expect(leftover, "no AGY process of this test is left").toEqual([]);
  }, 120_000);

  /** The user's "continue" to a coordinator whose log had a damaged end: accepted, answered, repaired byte-exact and logged once. */
  const continueAfterDamagedEnd = async (caseId: CaseId) => {
    const copy = copies.find((entry) => entry.caseId === caseId)!;
    const { before, bytesAdded } = damage.get(caseId)!;
    const okBefore = okCount(await restartTeam.conversationOf(copy.coordinator));
    const from = restartTeam.frames.length;
    const message = `continue (${caseId})`;
    restartTeam.send(copy.coordinator, message);
    await until(async () => {
      if (restartTeam.errorsFor(copy.coordinator, from).length) return true;
      return okCount(await restartTeam.conversationOf(copy.coordinator)) > okBefore;
    }, `${caseId}: the coordinator answers "${message}"`, 90_000);
    expect(restartTeam.errorsFor(copy.coordinator, from), `${caseId}: the message is accepted`).toEqual([]);
    const conversation = stringsOf(await restartTeam.conversationOf(copy.coordinator));
    expect(conversation.some((text) => text.includes(message)), `${caseId}: the coordinator received the message`).toBe(true);
    // The turn's records land after the answer is shown; wait until the log holds them.
    let after = Buffer.alloc(0);
    await until(async () => {
      after = await fsp.readFile(copy.logPath);
      const tail = records(after.subarray(before.length));
      return tail.some((record) => record.trace_type === "user" && JSON.stringify(record).includes(message)) && tail.some((record) => record.trace_type === "assistant");
    }, `${caseId}: the new turn is in the log`, 30_000).catch((error) => { throw new Error(`${error}; log tail: ${after.subarray(Math.max(0, before.length - 200)).toString("utf8").slice(0, 2000)}`); });
    expect(after.subarray(0, before.length).equals(before), `${caseId}: every earlier byte is kept unchanged`).toBe(true);
    expect(after.includes(0x00), `${caseId}: no zero byte is left`).toBe(false);
    expect(after.at(-1), `${caseId}: the log ends with a complete line`).toBe(0x0a);
    const all = records(after);
    expect(all.slice(0, records(before).length), `${caseId}: earlier records first, unchanged`).toEqual(records(before));
    const warnings = warningsFor(restart.output(), copy.logPath);
    expect(warnings, `${caseId}: one warning names the file`).toHaveLength(1);
    expect(warnings[0], `${caseId}: the warning reports the exact bytes removed`).toMatch(new RegExp(`bytesRemoved:? ${bytesAdded}\\b`));
    evidence.cases[caseId] = { accepted: true, message, bytesRemoved: bytesAdded, warning: warnings[0]!.replaceAll(root, "<root>"),
      recordsBefore: records(before).length, recordsAfter: all.length, bytesBefore: before.length, bytesAfter: after.length,
      newTraceTypes: records(after.subarray(before.length)).map((record) => record.trace_type) };
  };

  it("USR-1 AC-005: 1,241 zero bytes after the coordinator's last record; 'continue' restores it, the end is cut and logged", async () => {
    await continueAfterDamagedEnd("USR-1");
  }, 180_000);

  it("USR-2 AC-005 variant: a torn last record without a newline", async () => {
    await continueAfterDamagedEnd("USR-2");
  }, 180_000);

  it("USR-3 AC-005 variant: a torn last record whose newline landed", async () => {
    await continueAfterDamagedEnd("USR-3");
  }, 180_000);

  it("USR-4 AC-006: a damaged line before the last record is refused with the Team, coordinator, line and next step; the file is unchanged", async () => {
    const copy = copies.find((entry) => entry.caseId === "USR-4")!;
    const { damaged, damagedLine } = damage.get("USR-4")!;
    const from = restartTeam.frames.length;
    restartTeam.send(copy.coordinator, "continue (USR-4)");
    await until(() => restartTeam.errorsFor(copy.coordinator, from).length > 0, "USR-4: the refusal", 60_000);
    const [refusal] = restartTeam.errorsFor(copy.coordinator, from);
    expect(refusal!.payload).toMatchObject({ code: "TEAM_SEND_MESSAGE_REJECTED", details: "TASK_EXECUTION_CONTEXT_UNAVAILABLE", agent_run_id: copy.coordinator });
    expect(refusal!.payload.message).toBe(`The delegated Team at '${copy.address}' cannot be restored: the saved conversation of its coordinator `
      + `'${copy.coordinatorAddress}' cannot be read (line ${damagedLine} of raw_traces_active.jsonl is damaged). Its files were left unchanged. `
      + "Start a new delegation for this work, or restore its saved conversation from a backup.");
    expect(stringsOf(await restartTeam.conversationOf(copy.coordinator)).some((text) => text.includes("continue (USR-4)")), "USR-4: nothing was delivered").toBe(false);
    expect(sha(await fsp.readFile(copy.logPath)), "USR-4: the file is byte for byte unchanged").toBe(sha(damaged));
    expect(warningsFor(restart.output(), copy.logPath), "USR-4: nothing was cut").toEqual([]);
    const logged = restart.output().includes("TASK_EXECUTION_CONVERSATION_UNAVAILABLE");
    evidence.cases["USR-4"] = { refusal: { ...refusal!.payload, message: refusal!.payload.message }, damagedLine, fileUnchanged: true, serverWarningLogged: logged };
  }, 120_000);

  it("USR-5 SCN-003: a new server process reads every repaired log fresh; another message keeps every record and nothing more is cut", async () => {
    restartTeam.close();
    const beforeThird = new Map<CaseId, Buffer>();
    for (const copy of copies) beforeThird.set(copy.caseId, await fsp.readFile(copy.logPath));
    await stopServer(restart, "SIGTERM");
    for (const copy of copies) expect(sha(await fsp.readFile(copy.logPath)), `${copy.caseId}: unchanged by the shutdown`).toBe(sha(beforeThird.get(copy.caseId)!));
    const third = await startServer("server #3");
    const restored = (await third.graphql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`, { id: rootRunId })).restoreAgentTeamRun;
    expect(restored.success, restored.message).toBe(true);
    const view = await openTeam(third);
    const results: Rec = {};
    try {
      for (const copy of copies.filter((entry) => entry.caseId !== "USR-4")) {
        const before = beforeThird.get(copy.caseId)!;
        const okBefore = okCount(await view.conversationOf(copy.coordinator));
        const from = view.frames.length;
        const message = `continue again (${copy.caseId})`;
        view.send(copy.coordinator, message);
        await until(async () => view.errorsFor(copy.coordinator, from).length > 0 || okCount(await view.conversationOf(copy.coordinator)) > okBefore,
          `${copy.caseId}: answer after the second restart`, 90_000);
        expect(view.errorsFor(copy.coordinator, from), `${copy.caseId}: accepted after the second restart`).toEqual([]);
        let after = Buffer.alloc(0);
        await until(async () => { after = await fsp.readFile(copy.logPath);
          return records(after.subarray(before.length)).some((record) => record.trace_type === "user" && JSON.stringify(record).includes(message)); },
        `${copy.caseId}: second turn in the log`, 30_000);
        expect(after.subarray(0, before.length).equals(before), `${copy.caseId}: the first restore's records are all kept`).toBe(true);
        expect(after.includes(0x00), `${copy.caseId}: no zero byte`).toBe(false);
        const userMessages = records(after).filter((record) => record.trace_type === "user").map((record) => JSON.stringify(record));
        expect(userMessages.some((text) => text.includes(`continue (${copy.caseId})`)), `${copy.caseId}: the first "continue" is still there`).toBe(true);
        results[copy.caseId] = { recordsBefore: records(before).length, recordsAfter: records(after).length };
      }
      expect(warningsIn(third.output()), "nothing more is cut after the repair").toEqual([]);
      // The intact log of the root's manager was never rewritten or reported.
      expect((await fsp.readFile(managerLog)).subarray(0, managerLogBefore.length).equals(managerLogBefore), "manager log prefix unchanged").toBe(true);
      for (const server of [restart, third]) expect(warningsFor(server.output(), managerLog), `${server.label}: no warning for the intact manager log`).toEqual([]);
      evidence.cases["USR-5"] = { ...results, warningsOnThirdServer: 0 };
    } finally {
      view.close();
      await stopServer(third, "SIGTERM");
    }
  }, 300_000);
});
