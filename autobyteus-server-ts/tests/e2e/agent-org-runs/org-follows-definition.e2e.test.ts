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
import { callTool, calledResults, stringsOf, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

/**
 * org-teams-follow-definition (Task autobyteus-29) through the built server (`dist/app.js`) in its own process on a
 * test-owned data root: a user's own agents, Team and Org saved through the app's GraphQL definition editor, an Org run of
 * them, and the definitions edited while it runs. Agents run on the scripted AGY CLI (tests/fixtures/agy-failure-cli.mjs,
 * `linked_skills`): `CALL_TOOL:{…}` makes the agent call the real agent tool, `ECHO_INPUT` replies with the exact input the
 * agent got (so a change notice is visible). No provider inference; the real-provider proof is API/E2E's.
 *
 * Cases, in order on one Org run:
 *  - OF-01 (REQ-001, AC-001): the Org is a container; its direct agent and its Team are runs of their own (`containedIn`).
 *  - OF-02 (REQ-003, AC-003): the direct agent messages a Team member by its Org address across the two runs; both logs.
 *  - OF-03 (REQ-002, AC-002): the Team's definition gains a member: the Team unit follows; the Org's tree shows it.
 *  - OF-04 (REQ-004, AC-004): an Org rule to a Team member: the member is removed (the rule is left out, its sender is told),
 *    then added back (the rule is back, told again).
 *  - OF-06 (design R-8, SR-014): a copy the Team unit's lead delegated (`delegate_task` to `/concierge`) messages the Team
 *    unit's writer by its Org address `/team/writer` (not its delegator): reached through step 2's container placements,
 *    delivered as related runs' message (both logs, no `counterpart`).
 *  - OF-05 (REQ-009, AC-008): the Org definition adds an agent (a new unit run, Offline) and unmounts the Team (a former unit;
 *    a message to its address is refused by name); the remaining agent hears who joined and left.
 * Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree.
 * Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-org-runs/org-follows-definition.e2e.test.ts --no-watch
 * ORG_FOLLOWS_E2E_EVIDENCE_DIR keeps one JSON receipt per case and the server's output.
 */
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.ORG_FOLLOWS_E2E_EVIDENCE_DIR?.trim() || null;
const serverDir = path.resolve(__dirname, "../../..");

/** autobyteus-22 § Exact Texts (unchanged; design § Exact Texts: an Org-level join/leave uses the same lines). */
const NOTICE_HEAD = "Your team changed: its definition was updated.";
const RULES_CHANGED = "Your handoff rules changed; call get_handoff_rules to read them.";
const refusal = (name: string, address: string) =>
  `${name} (${address}) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.`;

const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fsp.mkdir(evidenceDir, { recursive: true });
  await fsp.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

suite("An Org is a container whose units follow their definitions (built server, scripted AGY)", () => {
  const u = randomUUID().slice(0, 6);
  let root = "";
  let workspace = "";
  let child: ChildProcess | null = null;
  let output = "";
  let url = "";
  const ids: Record<string, string> = {};
  let teamId = "";
  let orgId = "";
  let orgRunId = "";
  let socket: WebSocket;
  const frames: Array<{ type: string; payload: Rec }> = [];
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true,
    runtimeKind: "antigravity_cli" });

  const graphql = async (query: string, variables: Rec = {}): Promise<Rec> => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: Rec; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const memory = (...parts: string[]) => path.join(root, "memory", ...parts);
  const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8")) as Rec;
  const container = () => json(memory("agent_orgs", orgRunId, "agent_org_run_execution_tree.json"));
  const unitRun = (address: string) => (container().rootOrg.units as Rec[]).find((unit) => unit.address === address)?.runId as string | undefined;
  const teamTree = () => json(memory("agent_teams", unitRun("/team")!, "team_run_execution_tree.json"));
  /** The Org's tree as the app reads it (composed from its units), each agent at its Org address. */
  const orgMembers = async (): Promise<Array<{ address: string; agentRunId: string }>> => {
    const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: orgRunId })).getAgentOrgRunConfig.executionTree as Rec;
    return (tree.rootOrg.members as Rec[]).flatMap((member) => member.members
      ? (member.members as Rec[]).map((agent) => ({ address: String(agent.address), agentRunId: String(agent.agentRunId) }))
      : [{ address: String(member.address), agentRunId: String(member.agentRunId) }]);
  };
  const agentAt = async (address: string) => (await orgMembers()).find((member) => member.address === address)!.agentRunId;
  const conversationOf = async (address: string, agentRunId: string) => (await graphql(
    `query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
    { id: orgRunId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
  const send = (agentRunId: string, content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org",
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
  const revisionOf = async (kind: "agentTeamDefinitions" | "agentOrgDefinitions", id: string) =>
    ((await graphql(`{ ${kind} { id revision } }`))[kind] as Rec[]).find((entry) => entry.id === id)!.revision as string;
  const teamNodes = (names: string[]) => names.map((name) => ({ memberName: name, ref: ids[name]!, refScope: "SHARED" }));
  const saveTeam = async (names: string[]) => graphql(`mutation($input:UpdateAgentTeamDefinitionInput!){updateAgentTeamDefinition(input:$input){id}}`,
    { input: { id: teamId, expectedRevision: await revisionOf("agentTeamDefinitions", teamId), coordinatorMemberName: "lead", nodes: teamNodes(names), handoffs: [] } });
  const orgMember = (memberName: string, ref: string, refType: "AGENT" | "AGENT_TEAM") => ({ memberName, ref, refType, refScope: "SHARED" });
  const reviewerRule = { from: "/concierge", to: "/team/writer", rules: ["Hand every draft to the writer."] };
  const teamRule = { from: "/concierge", to: "/team", rules: ["Send software requests to the team."] };

  beforeAll(async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "of-e2e-")));
    workspace = path.join(root, "workspace");
    for (const dir of [workspace, path.join(root, "home"), path.join(root, "db")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    await fsp.access(path.join(serverDir, "dist", "app.js"));
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      USER: process.env.USER ?? "tester", DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ANTIGRAVITY_CLI_COMMAND: cli,
      AGY_FAKE_CASE: "linked_skills", LMSTUDIO_HOSTS: "http://127.0.0.1:1" };
    child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    await until(() => {
      if (child!.exitCode !== null || child!.signalCode !== null) throw new Error(`server exited: ${output.slice(-2000)}`);
      return output.includes("Server listening on 127.0.0.1:0");
    }, "server ready", 180_000);
    for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
      const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
      if (probe.ok) { url = candidate!; break; }
    }
    expect(url, output.slice(-1500)).not.toBe("");
    for (const name of ["concierge", "scribe", "lead", "writer", "reviewer"]) {
      ids[name] = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
        { input: { name: `of-${name}-${u}`, role: "assistant", description: `${name} (Org follows E2E)`, instructions: `Instructions of ${name}.`, toolNames: [] } })).createAgentDefinition.id;
    }
    teamId = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `of-team-${u}`, description: "Org follows E2E team", instructions: "Work together.", coordinatorMemberName: "lead", nodes: teamNodes(["lead", "writer"]) } })).createAgentTeamDefinition.id;
    orgId = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `of-org-${u}`, description: "Org follows E2E org", instructions: "Follow requests.", handoffs: [teamRule, reviewerRule],
        members: [orgMember("concierge", ids.concierge!, "AGENT"), orgMember("team", teamId, "AGENT_TEAM")] } })).createAgentOrgDefinition.id;
    const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: orgId, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(created.success, created.message).toBe(true);
    orgRunId = created.agentOrgRunId;
    socket = new WebSocket(`ws://${new URL(url).host}/ws/agent-org/${orgRunId}`);
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), "Org view snapshot", 30_000);
  }, 300_000);

  afterAll(async () => {
    socket?.terminate();
    if (child && child.exitCode === null) {
      const exited = new Promise((resolve) => child!.once("exit", resolve));
      child.kill("SIGTERM");
      const force = setTimeout(() => child!.kill("SIGKILL"), 20_000);
      await exited; clearTimeout(force);
    }
    await keep("server-output.log", output);
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  it("OF-01 (REQ-001, AC-001): the Org is a container; its direct agent and its Team are runs of their own, members Offline", async () => {
    const file = container();
    expect(file.rootOrg.units.map((unit: Rec) => [unit.address, unit.kind])).toEqual([["/concierge", "agent"], ["/team", "agent_team"]]);
    expect(file.rootOrg.formerUnits).toEqual([]);
    expect(file.handoffs).toEqual([teamRule, reviewerRule]);
    expect(file.rootOrg).not.toHaveProperty("members");
    const concierge = json(memory("agents", unitRun("/concierge")!, "run_metadata.json"));
    expect(concierge).toMatchObject({ containedIn: { orgRunId, address: "/concierge" }, address: "/concierge" });
    expect(teamTree()).toMatchObject({ containedIn: { orgRunId, address: "/team" }, rootTeam: { coordinatorAddress: "/lead" } });
    expect((await orgMembers()).map((member) => member.address)).toEqual(["/concierge", "/team/lead", "/team/writer"]);
    // Units are not top-level runs: the agent run list does not show the concierge.
    const snapshot = frames.find((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT")!;
    expect(JSON.stringify(snapshot.payload)).toContain('"status":"offline"');
    await keep("OF-01.json", { container: file, concierge, teamTree: teamTree() });
  }, 60_000);

  it("OF-02 (REQ-003, AC-003): the direct agent messages a Team member by its Org address; the message is in both units' logs", async () => {
    const sent = await calls("/concierge", callTool("send_message_to", { recipient_address: "/team/writer", content: "ECHO_INPUT" }));
    expect(sent.isError, JSON.stringify(sent)).toBe(false);
    const writer = await agentAt("/team/writer");
    await until(async () => stringsOf(await conversationOf("/team/writer", writer)).some((text) => text.startsWith("ECHO:")), "the writer got it", 90_000);
    const lines = (dir: string, base: string) => fs.readdirSync(dir).filter((name) => name.startsWith(`${base}_`)).flatMap((name) =>
      fs.readFileSync(path.join(dir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec));
    const conciergeLog = lines(memory("agents", unitRun("/concierge")!), "communication_messages");
    const teamLog = lines(memory("agent_teams", unitRun("/team")!), "team_communication_messages");
    const message = conciergeLog.find((line) => line.receiverAgentRunId === writer)!;
    expect(message).toMatchObject({ counterpart: { address: "/team/writer", nodeId: null } });
    expect(teamLog.find((line) => line.messageId === message.messageId)).toMatchObject({ counterpart: { address: "/concierge", nodeId: null } });
    expect(fs.readdirSync(memory("agent_orgs", orgRunId)).filter((name) => name.includes("communication_messages"))).toEqual([]);
    await keep("OF-02.json", { sent, message, teamLine: teamLog.find((line) => line.messageId === message.messageId) });
  }, 180_000);

  it("OF-03 (REQ-002, AC-002): the Team's definition gains a member: the Team unit follows; the Org's tree shows it at its Org address", async () => {
    await saveTeam(["lead", "writer", "reviewer"]);
    await until(() => (teamTree().rootTeam.members as Rec[]).some((member) => member.address === "/reviewer"), "the Team unit gained the reviewer", 60_000);
    await until(async () => (await orgMembers()).some((member) => member.address === "/team/reviewer"), "the Org's tree shows /team/reviewer", 30_000);
    const leadInput = await echo("/team/lead");
    expect(leadInput).toContain(`${NOTICE_HEAD}\nJoined: reviewer at /team/reviewer.`);
    await keep("OF-03.json", { teamTree: teamTree(), leadInput });
  }, 180_000);

  it("OF-04 (REQ-004, AC-004): an Org rule to a Team member is left out while the member is gone, back when it returns; its sender is told both times", async () => {
    const before = await calls("/concierge", callTool("get_handoff_rules", {}));
    expect(JSON.stringify(before)).toContain("Hand every draft to the writer.");
    await echo("/concierge"); // settles anything pending from earlier cases
    await saveTeam(["lead", "reviewer"]);
    await until(() => !(teamTree().rootTeam.members as Rec[]).some((member) => member.address === "/writer"), "the writer left the Team unit", 60_000);
    const told = await echo("/concierge");
    expect(told).toContain(RULES_CHANGED);
    const without = await calls("/concierge", callTool("get_handoff_rules", {}));
    expect(JSON.stringify(without)).not.toContain("Hand every draft to the writer.");
    expect(JSON.stringify(without)).toContain("Send software requests to the team.");
    await saveTeam(["lead", "writer", "reviewer"]);
    await until(() => (teamTree().rootTeam.members as Rec[]).some((member) => member.address === "/writer"), "the writer came back", 60_000);
    const toldAgain = await echo("/concierge");
    expect(toldAgain).toContain(RULES_CHANGED);
    const back = await calls("/concierge", callTool("get_handoff_rules", {}));
    expect(JSON.stringify(back)).toContain("Hand every draft to the writer.");
    await keep("OF-04.json", { before, told, without, toldAgain, back });
  }, 300_000);

  it("OF-06 (design R-8, SR-014): a run a Team unit's member delegated reaches another unit's member by its Org address; related runs' message, no counterpart", async () => {
    // The Team unit's lead delegates a copy of the direct agent (another unit, design R-1), which then messages /team/writer.
    const delegated = await calls("/team/lead", callTool("delegate_task", { recipient_address: "/concierge", description: "Reply OK." }));
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copy = String(delegated.target_agent_run_id);
    const stream = new WebSocket(`ws://${new URL(url).host}/ws/agent/${copy}`);
    const copyFrames: Array<{ type: string }> = [];
    stream.on("message", (raw: unknown) => copyFrames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { stream.once("open", () => resolve()); stream.once("error", reject); });
    try {
      await until(() => copyFrames.some((frame) => frame.type === "CONNECTED"), "the copy's stream", 30_000);
      const copyConversation = async () => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: copy })).getRunProjection?.conversation;
      const before = calledResults(await copyConversation()).length;
      sendE2eSendMessageCommand(stream, { agent_run_id: copy, content: callTool("send_message_to", { recipient_address: "/team/writer", content: "From the copy." }) });
      let results: string[] = [];
      await until(async () => (results = calledResults(await copyConversation())).length > before, "the copy's send_message_to result", 90_000);
      const sent = toolResult(results[before]!);
      expect(sent.isError, JSON.stringify(sent)).toBe(false);
      const lines = (dir: string, base: string) => fs.readdirSync(dir).filter((name) => name.startsWith(`${base}_`)).flatMap((name) =>
        fs.readFileSync(path.join(dir, name), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec));
      const writer = await agentAt("/team/writer");
      const received = lines(memory("agent_teams", unitRun("/team")!), "team_communication_messages")
        .find((line) => line.senderAgentRunId === copy && line.content === "From the copy.")!;
      expect(received).toMatchObject({ receiverAgentRunId: writer });
      expect(received).not.toHaveProperty("counterpart");
      const copyLine = lines(memory("agents", copy), "communication_messages").find((line) => line.messageId === received.messageId)!;
      expect(copyLine).toEqual(received);
      await keep("OF-06.json", { delegated, sent, received, copyLine });
    } finally { stream.terminate(); }
  }, 300_000);

  it("OF-05 (REQ-009, AC-008): the Org definition adds an agent (a new unit, Offline) and unmounts the Team (a former unit, refused by name)", async () => {
    const teamRunId = unitRun("/team")!;
    await graphql(`mutation($input:UpdateAgentOrgDefinitionInput!){updateAgentOrgDefinition(input:$input){id}}`,
      { input: { id: orgId, expectedRevision: await revisionOf("agentOrgDefinitions", orgId), handoffs: [{ from: "/concierge", to: "/scribe", rules: ["Ask the scribe to take notes."] }],
        members: [orgMember("concierge", ids.concierge!, "AGENT"), orgMember("scribe", ids.scribe!, "AGENT")] } });
    await until(() => (container().rootOrg.units as Rec[]).some((unit) => unit.address === "/scribe"), "the scribe joined the container", 60_000);
    const file = container();
    expect(file.rootOrg.units.map((unit: Rec) => unit.address)).toEqual(["/concierge", "/scribe"]);
    expect(file.rootOrg.formerUnits.map((unit: Rec) => [unit.address, unit.runId])).toEqual([["/team", teamRunId]]);
    const scribe = json(memory("agents", unitRun("/scribe")!, "run_metadata.json"));
    expect(scribe).toMatchObject({ containedIn: { orgRunId, address: "/scribe" }, startedAt: null });
    // The Team unit's run and history stay (a former unit).
    expect(fs.existsSync(memory("agent_teams", teamRunId, "team_run_execution_tree.json"))).toBe(true);
    const told = await echo("/concierge");
    expect(told).toContain("Joined: scribe at /scribe.");
    expect(told).toContain("Left: team (/team); messages to it are no longer delivered.");
    expect(told).toContain(RULES_CHANGED);
    const refused = await calls("/concierge", callTool("send_message_to", { recipient_address: "/team/lead", content: "Are you there?" }));
    expect(refused.isError, JSON.stringify(refused)).toBe(true);
    expect(JSON.stringify(refused)).toContain(refusal("lead", "/team/lead"));
    const rules = await calls("/concierge", callTool("get_handoff_rules", {}));
    expect(JSON.stringify(rules)).toContain("Ask the scribe to take notes.");
    await keep("OF-05.json", { container: file, scribe, told, refused, rules });
  }, 300_000);
});
