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
import { objectsIn, stringsOf, type Rec } from "../helpers/collaboration-root-harness.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";

/**
 * team-run-follows-definition (Task autobyteus-22) with real runtimes: a running Team of real Codex members (the lead with
 * auto-execute on, the writer with auto-execute off: `workspace-write` + `on-request`) on the built server (`dist/app.js`),
 * whose package `team-config.json` is edited on disk while it runs. The member that joins launches from its own agent
 * default, native AutoByteus (DEC-005), with the test vault's Anthropic key.
 *  - TFL-01 (AC-001, AC-006, DEC-005): a reviewer and a rule to it are added; the user asks the lead for the review code;
 *    the lead, told of the change at its next input, hands off to the new member, which starts, does the work and answers.
 *  - TFL-02 (AC-003, AC-010): the writer is removed while its shell command waits for the user's approval: it is shown
 *    leaving, the user still approves its command, the command runs, its message to the lead is delivered, and it is
 *    released; the lead, asked to message it, reads the refusal.
 * Paid inference, short turns, the cheapest models: Codex gpt-6.1-terra (low; CODEX_E2E_MODEL overrides), native
 * claude-haiku-5-5 (AUTOBYTEUS_E2E_MODEL overrides). The data root is outside the temp folder (Codex `workspace-write`
 * always allows /tmp): TEAM_FOLLOWS_LIVE_E2E_ROOT, default `$HOME/.autobyteus-e2e`.
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Gate: RUN_CODEX_E2E=1 RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault
 * Command: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" <gates> \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts --no-watch
 * TEAM_FOLLOWS_LIVE_E2E_EVIDENCE_DIR keeps one JSON receipt per case and the server's output.
 */
const enabled = process.env.RUN_CODEX_E2E === "1" && process.env.RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E === "1"
  && Boolean(capturedTestVaultSetting()) && spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.TEAM_FOLLOWS_LIVE_E2E_EVIDENCE_DIR?.trim() || null;
const serverDir = path.resolve(__dirname, "../../..");
const CODEX_MODEL = process.env.CODEX_E2E_MODEL?.trim() || "gpt-6.1-terra";
const NATIVE_MODEL = process.env.AUTOBYTEUS_E2E_MODEL?.trim() || "claude-haiku-5-5";
const STEP_MS = 360_000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Frame = { type: string; payload: Rec };

const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fsp.mkdir(evidenceDir, { recursive: true });
  await fsp.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

suite("A running Team of real Codex and AutoByteus members follows its definition (built server)", () => {
  const u = randomUUID().slice(0, 8);
  const ids = { lead: `tfl-lead-${u}`, writer: `tfl-writer-${u}`, reviewer: `tfl-reviewer-${u}` };
  const teamName = `tfl-team-${u}`;
  const reviewCode = `REVIEW-${u}`;
  let root = "";
  let configFile = "";
  let workspace = "";
  let child: ChildProcess | null = null;
  let output = "";
  let url = "";
  let teamRunId = "";
  const runOf: Record<string, string> = {};
  let socket: WebSocket;
  const frames: Frame[] = [];

  const graphql = async (query: string, variables: Rec = {}): Promise<Rec> => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: Rec; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const treeFile = () => {
    const found = spawnSync("find", [path.join(root, "data", "memory"), "-name", "team_run_execution_tree.json", "-path", `*${teamRunId}*`], { encoding: "utf8" })
      .stdout.trim().split("\n").filter(Boolean);
    return JSON.parse(fs.readFileSync(found[0]!, "utf8")) as Rec;
  };
  const members = () => (treeFile().rootTeam.members as Rec[]);
  const former = () => ((treeFile().rootTeam.formerMembers ?? []) as Rec[]);
  const conversationOf = async (agentRunId: string) => (await graphql(
    `query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
  const memoryOf = async (agentRunId: string) => JSON.stringify((await graphql(
    `query($t:String!,$a:String!){getTeamMemberRunMemoryView(teamRunId:$t,agentRunId:$a,includeRawTraces:true){runId rawTraces{ traceType content }}}`,
    { t: teamRunId, a: agentRunId })).getTeamMemberRunMemoryView);
  const send = (agentRunId: string, content: string) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content });
  const snapshots = () => frames.filter((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT").map((frame) =>
    objectsIn(frame.payload).filter((record) => record.kind === "configured_agent").map((record) => ({ address: record.address, agentRunId: record.agent_run_id, leaving: record.leaving === true })));
  let teamConfig: Rec;
  const writeConfig = async (next: Rec) => { teamConfig = next; await fsp.writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`); };
  const member = (memberName: string, ref: string) => ({ memberName, ref, refScope: "shared" });
  const launch = (autoExecuteTools: boolean) => ({ workspaceRootPath: workspace, llmModelIdentifier: CODEX_MODEL, llmConfig: { reasoning_effort: "low" },
    autoExecuteTools, runtimeKind: "codex_app_server" });

  beforeAll(async () => {
    const base = process.env.TEAM_FOLLOWS_LIVE_E2E_ROOT?.trim() || path.join(os.homedir(), ".autobyteus-e2e");
    await fsp.mkdir(base, { recursive: true });
    root = await fsp.realpath(await fsp.mkdtemp(path.join(base, "team-follows-live-")));
    if (root.startsWith(`${await fsp.realpath(os.tmpdir())}${path.sep}`)) throw new Error(`The data root must be outside the temp folder: ${root}`);
    const dataDir = path.join(root, "data");
    workspace = path.join(root, "workspace");
    const packageRoot = path.join(root, "package");
    const codexHome = path.join(root, "codex-home");
    for (const dir of [dataDir, workspace, codexHome, path.join(dataDir, "db")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
    await fsp.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    const agent = async (id: string, instructions: string, config: Rec = {}) => {
      const dir = path.join(packageRoot, "agents", id);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path.join(dir, "agent.md"), `---\nname: ${id}\ndescription: Team follows definition live agent\nrole: assistant\n---\n\n${instructions}\n`);
      await fsp.writeFile(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [], ...config }, null, 2));
    };
    await agent(ids.lead, "You lead a small team. Work with your team through your agent tools (get_handoff_rules, send_message_to). Keep replies short.");
    await agent(ids.writer, "You are the team's writer. Do exactly what you are asked with your own tools. When done, report to the lead with send_message_to (recipient_address /lead). Keep replies short.");
    await agent(ids.reviewer, `You are the team's reviewer. Your review code is ${reviewCode}. When anyone asks for your review code, answer them with send_message_to (to the agent that asked) with exactly: The review code is ${reviewCode}.`,
      { defaultLaunchConfig: { runtimeKind: "autobyteus", llmModelIdentifier: NATIVE_MODEL, llmConfig: { temperature: 0 } } });
    const teamDir = path.join(packageRoot, "agent-teams", teamName);
    await fsp.mkdir(teamDir, { recursive: true });
    await fsp.writeFile(path.join(teamDir, "team.md"), `---\nname: ${teamName}\ndescription: Team follows definition live\n---\n\nWork together and answer the user.\n`);
    configFile = path.join(teamDir, "team-config.json");
    await writeConfig({ coordinatorMemberName: "lead", members: [member("lead", ids.lead), member("writer", ids.writer)],
      handoffs: [{ from: "/lead", to: "/writer", rules: ["Ask the writer to write files."] }], avatarUrl: null });

    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: os.homedir(), USER: process.env.USER ?? "root", LOGNAME: process.env.LOGNAME ?? "root",
      TMPDIR: process.env.TMPDIR ?? os.tmpdir(), CODEX_HOME: codexHome, AUTOBYTEUS_TEST_VAULT: capturedTestVaultSetting()!,
      DATABASE_URL: `file:${path.join(dataDir, "db", "production.db")}`, LMSTUDIO_HOSTS: "http://127.0.0.1:1" };
    child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", dataDir, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    await until(() => output.includes("Server listening on 127.0.0.1:0"), "server ready", 180_000);
    for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
      const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
      if (probe.ok) { url = candidate!; break; }
    }
    expect(output).toContain("test vault");
    await graphql(`mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }`, { input: { sourceKind: "LOCAL_PATH", source: packageRoot } });
    const teamDefinitionId = ((await graphql("{ agentTeamDefinitions { id name } }")).agentTeamDefinitions as Rec[]).find((team) => team.name === teamName)!.id;
    const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...launch(true) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: ids.lead, ...launch(true) }, { memberAddress: "/writer", agentDefinitionId: ids.writer, ...launch(false) }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    teamRunId = created.teamRunId;
    for (const entry of members()) runOf[entry.address] = entry.agentRunId;
    socket = new WebSocket(`ws://${new URL(url).host}/ws/agent-team/${teamRunId}`);
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), "team stream snapshot", 30_000);
  }, 400_000);

  afterAll(async () => {
    socket?.terminate();
    if (teamRunId) await graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: teamRunId }).catch(() => undefined);
    if (child && child.exitCode === null) {
      const exited = new Promise((resolve) => child!.once("exit", resolve));
      child.kill("SIGTERM");
      const force = setTimeout(() => child!.kill("SIGKILL"), 20_000);
      await exited; clearTimeout(force);
    }
    await keep("server-output.log", output);
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  it("TFL-01 (AC-001, AC-006, DEC-005): the lead hands off to a member added while the team runs; it starts on AutoByteus, does the work and answers", async () => {
    await writeConfig({ ...teamConfig, members: [...teamConfig.members, member("reviewer", ids.reviewer)],
      handoffs: [...teamConfig.handoffs, { from: "/lead", to: "/reviewer", rules: ["When the user asks for the review code, ask the reviewer for it."] }] });
    await until(() => members().some((entry) => entry.address === "/reviewer"), "the reviewer joined", 60_000);
    const reviewer = members().find((entry) => entry.address === "/reviewer")!;
    runOf["/reviewer"] = reviewer.agentRunId;
    send(runOf["/lead"]!, "What is the team's review code? Get it from your team, then tell me the code.");
    let leadConversation: unknown;
    await until(async () => stringsOf(leadConversation = await conversationOf(runOf["/lead"]!)).filter((text) => text.includes(reviewCode)).length >= 2,
      "the lead got the code from the new reviewer and told the user", STEP_MS);
    const reviewerMemory = await memoryOf(reviewer.agentRunId);
    const leadMemory = await memoryOf(runOf["/lead"]!);
    await keep("TFL-01.json", { reviewerLaunch: reviewer.launchConfiguration, reviewerLaunchSource: reviewer.launchSource ?? null,
      leadConversation: stringsOf(leadConversation).slice(-12), reviewerMemoryHasRequest: reviewerMemory.includes("review code"),
      reviewerSentCode: reviewerMemory.includes(reviewCode), leadNotice: /Your team changed: its definition was updated\.\\n(Joined: reviewer at \/reviewer\.)/.exec(leadMemory)?.[0] ?? null });
    expect(reviewer.launchConfiguration).toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: NATIVE_MODEL });
    expect(reviewerMemory).toContain(reviewCode);
    expect(leadMemory).toContain("Your team changed: its definition was updated.");
    expect(leadMemory).toContain("Joined: reviewer at /reviewer.");
  }, 600_000);

  it("TFL-02 (AC-003, AC-010): a writer removed while its command waits for approval is still approved, finishes, is delivered and released; the lead reads the refusal", async () => {
    const writerRunId = runOf["/writer"]!;
    const outside = path.join(root, `outside-${u}.txt`);
    const done = `WRITER-DONE-${u}`;
    const from = frames.length;
    send(writerRunId, `Run exactly this shell command once: echo leaving > ${outside} — then send the lead (recipient_address /lead) this message: ${done}`);
    await until(() => frames.slice(from).some((frame) => frame.type === "TOOL_APPROVAL_REQUESTED" && frame.payload.agent_run_id === writerRunId),
      "the writer's command waits for approval", STEP_MS);
    const request = frames.slice(from).find((frame) => frame.type === "TOOL_APPROVAL_REQUESTED" && frame.payload.agent_run_id === writerRunId)!;
    const snapshotsBefore = snapshots().length;
    await writeConfig({ ...teamConfig, members: (teamConfig.members as Rec[]).filter((entry) => entry.memberName !== "writer"),
      handoffs: (teamConfig.handoffs as Rec[]).filter((rule) => rule.to !== "/writer") });
    await until(() => former().some((entry) => entry.agentRunId === writerRunId), "the writer became a former member", 60_000);
    await until(() => snapshots().slice(snapshotsBefore).some((members) => members.some((entry) => entry.agentRunId === writerRunId && entry.leaving)),
      "the open view shows the writer leaving", 60_000);
    // The user answers each of the leaving writer's approval requests (auto-execute off: its shell command, then its
    // send_message_to), as in the app: the leaving member's own approvals keep working until its turn ends.
    const approveFrom = frames.length;
    const approved = new Set<string>();
    const approver = setInterval(() => {
      for (const frame of frames.slice(from)) {
        if (frame.type !== "TOOL_APPROVAL_REQUESTED" || frame.payload.agent_run_id !== writerRunId) continue;
        const invocation = String(frame.payload.invocation_id);
        if (approved.has(invocation)) continue;
        approved.add(invocation);
        socket.send(JSON.stringify({ type: "APPROVE_TOOL", payload: { invocation_id: invocation, agent_run_id: writerRunId, reason: null } }));
      }
    }, 200);
    const ran = await until(() => fs.existsSync(outside), "the approved command ran", STEP_MS).then(() => true, () => false);
    const delivered = await until(async () => stringsOf(await conversationOf(runOf["/lead"]!)).some((text) => text.includes(done)),
      "the leaving writer's message reached the lead", 240_000).then(() => true, () => false);
    const released = await until(() => !(snapshots().at(-1) ?? []).some((entry) => entry.agentRunId === writerRunId), "the writer was released from the view", 120_000)
      .then(() => true, () => false);
    clearInterval(approver);
    const approvalFrames = frames.slice(approveFrom).filter((frame) => ["TOOL_APPROVAL_REQUESTED", "TOOL_APPROVED", "TOOL_DENIED"].includes(frame.type)
      && frame.payload.agent_run_id === writerRunId)
      .map((frame) => `${frame.type} ${JSON.stringify(frame.payload).slice(0, 200)}`);
    const writerFrames = frames.slice(approveFrom).filter((frame) => frame.payload.agent_run_id === writerRunId || JSON.stringify(frame.payload).includes(writerRunId))
      .map((frame) => `${frame.type} ${JSON.stringify(frame.payload).slice(0, 300)}`);
    const writerMemory = await memoryOf(writerRunId).catch((error) => `memory read failed: ${String(error)}`);
    await keep("TFL-02-diagnostics.json", { ran, delivered, released, approvedWhileLeaving: [...approved], approvalFrames, writerFrames: writerFrames.slice(0, 80),
      writerMemoryTail: writerMemory.slice(-6000), snapshots: snapshots().slice(snapshotsBefore) });
    expect(ran, "the approved command ran").toBe(true);
    expect(delivered, "the leaving writer's message reached the lead").toBe(true);
    expect(released, "the writer was released from the view").toBe(true);
    // AC-010 read by a real model: the lead messages the removed writer and reports what the tool answered.
    const leadFrom = stringsOf(await conversationOf(runOf["/lead"]!)).length;
    send(runOf["/lead"]!, "Send the writer at /writer the message 'Are you still there?' with send_message_to, then tell me word for word what the tool answered.");
    let after: string[] = [];
    await until(async () => (after = stringsOf(await conversationOf(runOf["/lead"]!)).slice(leadFrom)).some((text) => /no longer a member/i.test(text)),
      "the lead read the refusal", STEP_MS);
    await keep("TFL-02.json", { request: { tool: request.payload.tool_name, invocation: request.payload.invocation_id }, approvalFrames, outsideFile: fs.readFileSync(outside, "utf8"),
      snapshots: snapshots().slice(snapshotsBefore), leadAfterRefusal: after.slice(-6) });
    expect(fs.readFileSync(outside, "utf8")).toContain("leaving");
  }, 900_000);
});
