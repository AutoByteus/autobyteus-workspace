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
import { stringsOf, type Rec } from "../helpers/collaboration-root-harness.js";
import { readRunTree } from "../helpers/run-tree-delegated.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import { FILE_EVENT_TEST_TIMEOUT_MS, OS_FILE_EVENT_WAIT_MS } from "../../helpers/os-latency-under-load.js";

/**
 * org-teams-follow-definition (Task autobyteus-29) with real runtimes: an Org of a local package on the built server
 * (`dist/app.js`): a direct agent `/concierge` on Codex (auto-execute on) and a Team `/team` whose lead runs on native
 * AutoByteus (the test vault's Anthropic key) and whose writer runs on Codex with auto-execute off (`workspace-write` +
 * `on-request`). The package's `team-config.json` is edited on disk while the Org runs.
 *  - OCL-01 (AC-003, REQ-003): the user asks the concierge for the team code; the concierge (a real Codex model) asks
 *    /team/lead by its Org address, the lead (a real AutoByteus model) answers /concierge by its Org address: delivered
 *    across the two unit runs both ways, each message in both runs' logs.
 *  - OCL-02 (AC-002, REQ-002): the writer is removed while its shell command waits for the user's approval: its Org row is
 *    tagged leaving, the user approves its requests in the Org view, the command runs, its message to /concierge is delivered,
 *    and it is released.
 * Paid inference, short turns, the cheapest models: Codex gpt-6.1-terra (low; CODEX_E2E_MODEL overrides), native
 * claude-haiku-5-5 (AUTOBYTEUS_E2E_MODEL overrides). The data root is outside the temp folder (Codex `workspace-write`
 * always allows /tmp): ORG_CONTAINER_LIVE_E2E_ROOT, default `$HOME/.autobyteus-e2e`.
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Gate: RUN_CODEX_E2E=1 RUN_AUTOBYTEUS_ORG_CONTAINER_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault
 * Command: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" <gates> \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/org-container-live.e2e.test.ts --no-watch
 * Waits for outcomes of a package-file edit end when the outcome holds, limited by OS_FILE_EVENT_WAIT_MS (TESTING.md, "File
 * watching on a busy Mac"). ORG_CONTAINER_LIVE_E2E_EVIDENCE_DIR keeps one JSON receipt per case and the server's output.
 */
const enabled = process.env.RUN_CODEX_E2E === "1" && process.env.RUN_AUTOBYTEUS_ORG_CONTAINER_E2E === "1"
  && Boolean(capturedTestVaultSetting()) && spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.ORG_CONTAINER_LIVE_E2E_EVIDENCE_DIR?.trim() || null;
const serverDir = path.resolve(__dirname, "../../..");
const CODEX_MODEL = process.env.CODEX_E2E_MODEL?.trim() || "gpt-6.1-terra";
const NATIVE_MODEL = process.env.AUTOBYTEUS_E2E_MODEL?.trim() || "claude-haiku-5-5";
const STEP_MS = 360_000;
type Frame = { type: string; payload: Rec };

const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fsp.mkdir(evidenceDir, { recursive: true });
  await fsp.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

suite("An Org of real Codex and AutoByteus units messages across its unit runs and follows its Team definition (built server)", () => {
  const u = randomUUID().slice(0, 8);
  const ids = { concierge: `ocl-concierge-${u}`, lead: `ocl-lead-${u}`, writer: `ocl-writer-${u}` };
  const teamName = `ocl-team-${u}`;
  const orgName = `ocl-org-${u}`;
  const teamCode = `TEAMCODE-${u}`;
  let root = "";
  let dataDir = "";
  let teamConfigFile = "";
  let workspace = "";
  let child: ChildProcess | null = null;
  let output = "";
  let url = "";
  let orgRunId = "";
  let socket: WebSocket;
  const frames: Frame[] = [];

  const graphql = async (query: string, variables: Rec = {}): Promise<Rec> => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: Rec; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const memory = (...parts: string[]) => path.join(dataDir, "memory", ...parts);
  const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8")) as Rec;
  const container = () => json(memory("agent_orgs", orgRunId, "agent_org_run_execution_tree.json"));
  const unitRun = (address: string) => (container().rootOrg.units as Rec[]).find((unit) => unit.address === address)!.runId as string;
  const teamTree = () => json(memory("agent_teams", unitRun("/team"), "team_run_execution_tree.json"));
  const teamMembers = () => (teamTree().rootTeam.members as Rec[]);
  const teamFormer = () => ((teamTree().rootTeam.formerMembers ?? []) as Rec[]);
  const lines = (dir: string, base: string) => fs.readdirSync(dir).filter((name) => name.startsWith(`${base}_`)).flatMap((name) =>
    fs.readFileSync(path.join(dir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec));
  const agentAt = (address: string) => address === "/concierge" ? unitRun("/concierge")
    : teamMembers().find((entry) => `/team${entry.address}` === address)!.agentRunId as string;
  const conversationOf = async (address: string, agentRunId: string) => (await graphql(
    `query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
    { id: orgRunId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
  const command = (type: string, agentRunId: string, extra: Rec) => socket.send(JSON.stringify({ type, payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
    target_agent_run_id: agentRunId, command_id: randomUUID(), ...extra } }));
  const send = (agentRunId: string, content: string) => command("SEND_MESSAGE", agentRunId, { message_id: randomUUID(), dedupe_key: randomUUID(), content,
    context_file_paths: [], image_urls: [] });
  /** The Org view's events (a presentation batch as its items). */
  const events = (from = 0): Rec[] => frames.slice(from).filter((frame) => frame.type === "ROOT_EXECUTION_EVENT")
    .flatMap((frame) => { const event = frame.payload.event as Rec; return event.kind === "agent_presentation_batch" ? (event.items as Rec[]) : [event]; });
  const approvalRequests = (agentRunId: string, from = 0) => events(from).filter((event) => event.agent_run_id === agentRunId && event.message?.type === "TOOL_APPROVAL_REQUESTED");
  let teamConfig: Rec;
  const writeTeam = async (next: Rec) => { teamConfig = next; await fsp.writeFile(teamConfigFile, `${JSON.stringify(next, null, 2)}\n`); };
  const member = (memberName: string, ref: string) => ({ memberName, ref, refScope: "shared" });

  beforeAll(async () => {
    const base = process.env.ORG_CONTAINER_LIVE_E2E_ROOT?.trim() || path.join(os.homedir(), ".autobyteus-e2e");
    await fsp.mkdir(base, { recursive: true });
    root = await fsp.realpath(await fsp.mkdtemp(path.join(base, "org-container-live-")));
    if (root.startsWith(`${await fsp.realpath(os.tmpdir())}${path.sep}`)) throw new Error(`The data root must be outside the temp folder: ${root}`);
    dataDir = path.join(root, "data");
    workspace = path.join(root, "workspace");
    const packageRoot = path.join(root, "package");
    const codexHome = path.join(root, "codex-home");
    for (const dir of [dataDir, workspace, codexHome, path.join(dataDir, "db")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.symlink(path.join(os.homedir(), ".codex", "auth.json"), path.join(codexHome, "auth.json"));
    await fsp.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    const agent = async (id: string, instructions: string) => {
      const dir = path.join(packageRoot, "agents", id);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(path.join(dir, "agent.md"), `---\nname: ${id}\ndescription: Org container live agent\nrole: assistant\n---\n\n${instructions}\n`);
      await fsp.writeFile(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [] }, null, 2));
    };
    await agent(ids.concierge, "You are the organization's concierge. You work with the organization's units through your agent tools (get_handoff_rules, send_message_to). Keep replies short.");
    await agent(ids.lead, `You lead the team. The team code is ${teamCode}. When anyone asks you for the team code, answer them with send_message_to (recipient_address: the address of the agent that asked, shown in its message) with exactly: The team code is ${teamCode}. Keep replies short.`);
    await agent(ids.writer, "You are the team's writer. Do exactly what you are asked with your own tools. Keep replies short.");
    const teamDir = path.join(packageRoot, "agent-teams", teamName);
    await fsp.mkdir(teamDir, { recursive: true });
    await fsp.writeFile(path.join(teamDir, "team.md"), `---\nname: ${teamName}\ndescription: Org container live team\n---\n\nWork together.\n`);
    teamConfigFile = path.join(teamDir, "team-config.json");
    await writeTeam({ coordinatorMemberName: "lead", members: [member("lead", ids.lead), member("writer", ids.writer)], handoffs: [], avatarUrl: null });
    const orgDir = path.join(packageRoot, "agent-orgs", orgName);
    await fsp.mkdir(orgDir, { recursive: true });
    await fsp.writeFile(path.join(orgDir, "org.md"), `---\nname: ${orgName}\ndescription: Org container live org\n---\n\nAnswer the user.\n`);
    await fsp.writeFile(path.join(orgDir, "org-config.json"), JSON.stringify({ members: [
      { memberName: "concierge", ref: ids.concierge, refType: "agent", refScope: "shared" }, { memberName: "team", ref: teamName, refType: "agent_team", refScope: "shared" }],
    handoffs: [
      { from: "/concierge", to: "/team/lead", rules: ["When the user asks for the team code, ask the team lead at /team/lead for it."] },
      { from: "/team/lead", to: "/concierge", rules: ["Answer the concierge at /concierge when it asks you something."] },
      { from: "/team/writer", to: "/concierge", rules: ["Report to the concierge at /concierge when you are asked to."] }], avatarUrl: null, defaultLaunchConfig: null }, null, 2));

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
    const orgDefinitionId = ((await graphql("{ agentOrgDefinitions { id name } }")).agentOrgDefinitions as Rec[]).find((entry) => entry.name === orgName)!.id;
    const codex = { workspaceRootPath: workspace, llmModelIdentifier: CODEX_MODEL, llmConfig: { reasoning_effort: "low" }, autoExecuteTools: true, runtimeKind: "codex_app_server" };
    const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: orgDefinitionId, rootConfiguration: codex, teamOverrides: [], agentOverrides: [
        { address: "/team/lead", configuration: { runtimeKind: "autobyteus", llmModelIdentifier: NATIVE_MODEL, llmConfig: { temperature: 0 } } },
        { address: "/team/writer", configuration: { autoExecuteTools: false } }] } })).createAgentOrgRun;
    expect(created.success, created.message).toBe(true);
    orgRunId = created.agentOrgRunId;
    socket = new WebSocket(`ws://${new URL(url).host}/ws/agent-org/${orgRunId}`);
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), "Org view snapshot", 30_000);
  }, 400_000);

  afterAll(async () => {
    socket?.terminate();
    if (orgRunId) await graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}`, { id: orgRunId }).catch(() => undefined);
    if (child && child.exitCode === null) {
      const exited = new Promise((resolve) => child!.once("exit", resolve));
      child.kill("SIGTERM");
      const force = setTimeout(() => child!.kill("SIGKILL"), 20_000);
      await exited; clearTimeout(force);
    }
    await keep("server-output.log", output);
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  it("OCL-01 (AC-003, REQ-003): a Codex agent unit and an AutoByteus Team member hand off to each other by Org address; both runs' logs", async () => {
    const concierge = unitRun("/concierge");
    send(concierge, "What is the team code? Ask the team lead for it, then tell me the code.");
    let conversation: unknown;
    await until(async () => stringsOf(conversation = await conversationOf("/concierge", concierge)).filter((text) => text.includes(teamCode)).length >= 2,
      "the concierge got the code from the lead and told the user", STEP_MS);
    const lead = agentAt("/team/lead");
    const conciergeLog = lines(memory("agents", concierge), "communication_messages");
    const teamLog = lines(memory("agent_teams", unitRun("/team")), "team_communication_messages");
    const toLead = conciergeLog.find((line) => line.receiverAgentRunId === lead);
    const fromLead = conciergeLog.find((line) => line.senderAgentRunId === lead && String(line.content).includes(teamCode));
    const leadMember = teamMembers().find((entry) => entry.agentRunId === lead)!;
    await keep("OCL-01.json", { conversation: stringsOf(conversation).slice(-10), toLead, fromLead, teamLines: teamLog.filter((line) => [toLead?.messageId, fromLead?.messageId].includes(line.messageId)),
      leadLaunch: leadMember.launchConfiguration });
    expect(leadMember.launchConfiguration).toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: NATIVE_MODEL });
    expect(toLead, "the concierge's message to /team/lead").toMatchObject({ senderAgentRunId: concierge, counterpart: { address: "/team/lead", nodeId: null } });
    expect(fromLead, "the lead's answer to /concierge").toMatchObject({ receiverAgentRunId: concierge, counterpart: { address: "/team/lead", nodeId: null } });
    expect(teamLog.find((line) => line.messageId === toLead!.messageId)).toMatchObject({ counterpart: { address: "/concierge", nodeId: null } });
    expect(teamLog.find((line) => line.messageId === fromLead!.messageId)).toMatchObject({ counterpart: { address: "/concierge", nodeId: null } });
  }, STEP_MS + 120_000);

  it("OCL-02 (AC-002, REQ-002): a Codex writer removed while its command waits for approval is tagged leaving, approved in the Org view, delivered and released", async () => {
    const writer = agentAt("/team/writer");
    const outside = path.join(root, `outside-${u}.txt`);
    const done = `WRITER-DONE-${u}`;
    // Diagnostics only: the Team unit's own stream, to compare what reaches the Org view with what the Team run publishes.
    const teamFrames: Frame[] = [];
    const teamSocket = new WebSocket(`ws://${new URL(url).host}/ws/agent-team/${unitRun("/team")}`);
    teamSocket.on("message", (raw: unknown) => teamFrames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { teamSocket.once("open", () => resolve()); teamSocket.once("error", reject); });
    const from = frames.length;
    send(writer, `Run exactly this shell command once: echo leaving > ${outside} — then send the concierge (recipient_address /concierge) this message: ${done}`);
    await until(() => approvalRequests(writer, from).length > 0, "the writer's command waits for approval", STEP_MS);
    await writeTeam({ ...teamConfig, members: (teamConfig.members as Rec[]).filter((entry) => entry.memberName !== "writer") });
    await until(() => teamFormer().some((entry) => entry.agentRunId === writer), "the writer became a former member", OS_FILE_EVENT_WAIT_MS);
    const rowsWhileLeaving = (await readRunTree(graphql, "agent_org", orgRunId)).rows.filter((row) => row.leaving === true)
      .map((row) => ({ kind: row.kind, address: row.address, agentRunId: row.openTarget?.agentRunId }));
    // The user answers each of the leaving writer's approval requests in the Org view (its shell command, then its send_message_to).
    const approved = new Set<string>();
    const approver = setInterval(() => {
      for (const event of approvalRequests(writer, from)) {
        const invocation = String(event.message.payload.invocation_id);
        if (approved.has(invocation)) continue;
        approved.add(invocation);
        command("APPROVE_TOOL", writer, { invocation_id: invocation, reason: null });
      }
    }, 200);
    const concierge = unitRun("/concierge");
    const ran = await until(() => fs.existsSync(outside), "the approved command ran", STEP_MS).then(() => true, () => false);
    const delivered = await until(async () => stringsOf(await conversationOf("/concierge", concierge)).some((text) => text.includes(done)),
      "the leaving writer's message reached the concierge", 240_000).then(() => true, () => false);
    const released = await until(() => !teamFormer().some((entry) => entry.leaving === true), "the writer was released", 120_000).then(() => true, () => false);
    clearInterval(approver);
    teamSocket.terminate();
    const orgWriterEvents = events(from).filter((event) => event.agent_run_id === writer && event.message?.type !== "SEGMENT_CONTENT")
      .map((event) => `${event.message?.type} ${JSON.stringify(event.message?.payload ?? {}).slice(0, 160)}`);
    const teamWriterFrames = teamFrames.filter((frame) => frame.payload?.agent_run_id === writer && frame.type !== "SEGMENT_CONTENT")
      .map((frame) => `${frame.type} ${JSON.stringify(frame.payload).slice(0, 160)}`);
    const acks = frames.slice(from).filter((frame) => frame.type === "AGENT_COMMAND_ACK" && frame.payload.target_agent_run_id === writer).map((frame) => frame.payload);
    await keep("OCL-02.json", { rowsWhileLeaving, approved: [...approved], acks, ran, delivered, released, former: teamFormer(), orgWriterEvents, teamWriterFrames });
    expect(ran, "the approved command ran").toBe(true);
    expect(delivered, "the leaving writer's message reached the concierge").toBe(true);
    expect(released, "the writer was released").toBe(true);
    expect(fs.readFileSync(outside, "utf8")).toContain("leaving");
    expect(rowsWhileLeaving.map((row) => row.agentRunId), "the leaving writer's Org row is tagged").toEqual([writer]);
  }, 3 * STEP_MS + FILE_EVENT_TEST_TIMEOUT_MS + 120_000);
});
