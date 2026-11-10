import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { calledResults, callTool, objectsIn, startCollaborationHarness, stringsOf, taskAgentsIn, toolResult,
  type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID, MODEL_ROUTER_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";

// daily-assistant-delegation-target (autobyteus-455): the built-in Daily Assistant is an ordinary collaborator; the Model
// Router never is. Real Studio HTTP/WebSocket/GraphQL server, scoped Agent Tools MCP, Project/Task services, AGY backend.
// The external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes an agent
// call the real tool and reply `CALLED:<result>`, `LIST_TOOLS` replies its Agent Tools. The Daily Assistant is the one the
// server bootstraps from its shipped template at startup; the "PM" is a shared agent selecting list_available_agents.
// - DAC-01 (AC-001, REQ-002, QR-001): the PM lists the Daily Assistant at /daily_assistant with its template description; no
//   Model Router, also with "Show internal agents" on; delegate_task('/model_router') refused with either setting.
// - DAC-02 (AC-002, AC-003, REQ-004, ASM-001): the PM delegates a saved Task of a Project linked to F to /daily_assistant: a
//   Daily Assistant copy (its template prompt) starts in F, has send_message_to, and the Task (a scripted report) makes it
//   reply to the PM by the PM's run id; the PM's run receives it.
// - DAC-03 (AC-002, AC-003, REQ-004): another PM run delegates by description: the copy runs in the PM's folder and replies.
// - DAC-04 (AC-006, REQ-003): a Team run with the Daily Assistant as a member: /daily_assistant is not a catalog address
//   there (the definition is at its member address) and delegate_task to it is refused, nothing starts (delegated copies are not in-run placements, so a PM's repeated delegation by
//   address starts another copy, as for any agent); the PM gives its existing copy a second saved Task by run id (mode 3).
// - DAC-05 (AC-006, REQ-003): a Daily Assistant run does not list /daily_assistant (nor the Model Router) and its
//   delegate_task('/daily_assistant') is refused as its own definition; nothing starts.
// - DAC-06 (AC-005, REQ-002/003): `@` candidates (GraphQL collaboratorMentionCandidates): the PM's include the Daily
//   Assistant, the Daily Assistant run's do not; the Model Router in neither, with internal agents hidden or shown; a send to
//   the PM with `@Daily Assistant` is admitted and tells the PM to delegate to /daily_assistant.
// Run (scripted): env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/daily-assistant-collaborator.e2e.test.ts --no-watch
// DA_COLLABORATOR_E2E_EVIDENCE_DIR=<dir> writes the observed results as JSON.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const DA = DAILY_ASSISTANT_AGENT_DEFINITION_ID;
const ROUTER = MODEL_ROUTER_AGENT_DEFINITION_ID;
const SHOW_INTERNAL = "AUTOBYTEUS_SHOW_INTERNAL_AGENTS";
const evidence: Rec = {};
const unique = <T>(values: T[]) => [...new Set(values)];
const real = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : value);
/** A run's AGY capsule (a scripted process's cwd) and the folder in its manifest. */
const capsuleOf = (memoryDir: string, runId: string): { path: string; workspacePath: string } | null => {
  const walk = (dir: string): { path: string; workspacePath: string } | null => {
    for (const entry of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === "agy-project") {
        const manifest = JSON.parse(fs.readFileSync(path.join(full, "manifest.json"), "utf8")) as Rec;
        if (manifest.runId === runId) return { path: full, workspacePath: real(manifest.workspacePath) };
      } else { const found = walk(full); if (found) return found; }
    }
    return null;
  };
  return walk(memoryDir);
};
/** The `--add-dir` values of every launch of a capsule, from the scripted CLI's argv log. */
const addDirsOf = (argvLog: string, capsule: string): string[] => unique((fs.existsSync(argvLog) ? fs.readFileSync(argvLog, "utf8") : "").trim().split("\n")
  .filter(Boolean).map((line) => JSON.parse(line) as { argv: string[]; cwd: string })
  .filter((entry) => fs.realpathSync(entry.cwd) === fs.realpathSync(capsule))
  .flatMap((entry) => entry.argv.flatMap((arg, index) => (arg === "--add-dir" ? [real(entry.argv[index + 1]!)] : []))));
const recordedFolders = (node: unknown): string[] => unique(objectsIn(node)
  .flatMap((record) => [record.workspaceRootPath, record.workspace_root_path])
  .filter((value): value is string => typeof value === "string").map(real));
const nodeOf = (tree: unknown, id: string): Rec | undefined => objectsIn(tree).find((record) =>
  typeof (record.startedAt ?? record.started_at) === "string" && [record.agentRunId, record.agent_run_id].includes(id));
const toolListsIn = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = stringsOf(entry).filter((value) => value.startsWith("TOOLS:"));
  return strings.length ? [strings[0]!.slice("TOOLS:".length)] : [];
});
const textOf = (result: Rec): string => String(result.message ?? result.text ?? JSON.stringify(result));

suite("The Daily Assistant is an ordinary collaborator; the Model Router never is (real HTTP/WS/scoped MCP, scripted AGY)", () => {
  let h: CollaborationHarness;
  type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
  let argvLog = "";
  let priorArgvLog: string | undefined;
  const ids: Rec = {};
  const roots: Record<"pm" | "pm2" | "pm3" | "da" | "team", Root> = {} as never;
  let F = "";
  let projectId = "";
  let daDescription = "";
  let copyRunId = "";

  const memory = () => path.join(h.dataDir, "memory");
  const setShown = async (value: string) => (await h.graphql(`mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}`, { k: SHOW_INTERNAL, v: value })).updateServerSetting;
  const createTask = async (description: string) => (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
    { input: { projectId, title: `DA Task ${randomUUID().slice(0, 6)}`, description } })).createProjectTask.taskId as string;
  const listOf = async (root: Root) => {
    const result = await root.calls(root.rootId, "/", callTool("list_available_agents", {}));
    expect(result.isError, JSON.stringify(result)).toBe(false);
    return result.agents as Rec[];
  };
  const launchOf = async (root: Root, runId: string) => {
    let capsule: ReturnType<typeof capsuleOf> = null;
    await until(() => Boolean(capsule = capsuleOf(memory(), runId)), `capsule of ${runId}`, 60_000);
    let addDirs: string[] = [];
    await until(() => (addDirs = addDirsOf(argvLog, capsule!.path)).length > 0, `launch of ${runId}`, 60_000);
    return { recorded: recordedFolders(nodeOf(await root.liveTree(), runId)), capsule: capsule!.workspacePath, addDirs };
  };
  /** The string of a run's conversation holding `marker` (a message it received). */
  const received = async (read: () => Promise<unknown>, marker: string, label: string): Promise<string> => {
    let found: string | undefined;
    await until(async () => Boolean(found = stringsOf(await read()).find((value) => value.includes(marker))), label, 60_000);
    return found!;
  };
  const toolsOf = async (root: Root, runId: string, address: string): Promise<string[]> => {
    const before = toolListsIn(await root.conversationOf(runId, address)).length;
    root.sendTo(runId, "LIST_TOOLS");
    let lists: string[] = [];
    await until(async () => (lists = toolListsIn(await root.conversationOf(runId, address))).length > before, `tool list of ${runId}`, 60_000);
    return (JSON.parse(lists[before]!) as Rec[]).map((tool) => String(tool.name));
  };
  const candidatesOf = async (root: Root) => ((await h.graphql(
    `query($k:String!,$id:String!,$f:String){collaboratorMentionCandidates(rootSubjectKind:$k,rootRunId:$id,focusedAgentRunId:$f){availability candidates{kind definitionId}}}`,
    { k: "agent", id: root.rootId, f: root.rootId })).collaboratorMentionCandidates.candidates as Rec[]).map((candidate) => String(candidate.definitionId));
  const pmConversation = (root: Root) => () => root.conversationOf(root.rootId, "/");

  beforeAll(async () => {
    priorArgvLog = process.env["AGY_FAKE_ARGV_LOG"];
    const logDir = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "dac-argv-")));
    argvLog = path.join(logDir, "argv.jsonl");
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    h = await startCollaborationHarness("daily-assistant-collaborator-e2e");
    F = path.join(fs.realpathSync(h.dataDir), "project-folder-F");
    await fsp.mkdir(F);
    const suffix = randomUUID().slice(0, 6);
    ids.managerName = `DAC Project Manager ${suffix}`;
    ids.helperName = `DAC Helper ${suffix}`;
    ids.manager = await h.agentDefinition(ids.managerName, { toolNames: ["list_available_agents", "create_task", "update_task"] });
    ids.helper = await h.agentDefinition(ids.helperName);
    projectId = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `DAC Personal ${suffix}`, workspaces: [{ workspaceRootPath: F, description: "link" }] } })).createProject.projectId as string;
    const da = (await h.graphql(`query($id:String!){agentDefinition(id:$id){id name description}}`, { id: DA })).agentDefinition as Rec;
    expect(da, "the server bootstrapped the Daily Assistant").toMatchObject({ id: DA, name: "Daily Assistant" });
    daDescription = String(da.description);
    expect(daDescription.length).toBeGreaterThan(0);
    roots.pm = await h.startRoot("agent", { manager: ids.manager });
  }, 180_000);

  afterAll(async () => {
    const dir = process.env["DA_COLLABORATOR_E2E_EVIDENCE_DIR"];
    if (dir) { await fsp.mkdir(dir, { recursive: true }); await fsp.writeFile(path.join(dir, "daily-assistant-collaborator.json"), `${JSON.stringify(evidence, null, 2)}\n`); }
    for (const root of Object.values(roots)) root?.close();
    await h?.close();
    if (priorArgvLog === undefined) delete process.env["AGY_FAKE_ARGV_LOG"]; else process.env["AGY_FAKE_ARGV_LOG"] = priorArgvLog;
    if (argvLog) await fsp.rm(path.dirname(argvLog), { recursive: true, force: true });
  }, 180_000);

  it("DAC-01: the PM lists the Daily Assistant at /daily_assistant; the Model Router is never listed or delegable, internal agents hidden or shown", async () => {
    const expectedEntry = { name: "Daily Assistant", kind: "agent", address: "/daily_assistant", description: daDescription };
    const results: Rec = {};
    for (const shown of ["false", "true"]) {
      expect(await setShown(shown)).toBeTruthy();
      const agents = await listOf(roots.pm);
      expect(agents.filter((entry) => entry.address === "/daily_assistant"), `shown=${shown}`).toEqual([expectedEntry]);
      expect(agents.map((entry) => entry.name), `shown=${shown}: no Model Router`).not.toContain("Model Router");
      expect(agents.map((entry) => entry.address), `shown=${shown}: no Model Router address`).not.toContain("/model_router");
      const refused = await roots.pm.calls(roots.pm.rootId, "/", callTool("delegate_task", { recipient_address: "/model_router", description: "Route this." }));
      expect(refused.delegated, JSON.stringify(refused)).not.toBe(true);
      expect(textOf(refused), `shown=${shown}`).toContain("'/model_router' is not the address of an available agent or agent team.");
      results[`shown=${shown}`] = { agents, modelRouterDelegation: refused };
    }
    await setShown("false");
    expect(taskAgentsIn(await roots.pm.liveTree()), "nothing started").toEqual([]);
    evidence["DAC-01"] = results;
  }, 180_000);

  it("DAC-02: a saved Task to /daily_assistant starts a Daily Assistant copy in the Project's folder; it has send_message_to and reports back to the PM", async () => {
    const marker = `DA-REPORT-${randomUUID().slice(0, 8)}`;
    const taskId = await createTask(callTool("send_message_to", { target_agent_run_id: roots.pm.rootId, content: `Task done. ${marker}` }));
    const delegated = await roots.pm.calls(roots.pm.rootId, "/", callTool("delegate_task", { recipient_address: "/daily_assistant", task_id: taskId }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent", isError: false });
    copyRunId = delegated.target_agent_run_id as string;
    const agent = await roots.pm.waitForTaskAgent(copyRunId);
    expect(agent.address).toBe("/daily_assistant");
    // It is a Daily Assistant: the server composed its prompt from the Daily Assistant's template.
    const prompt = await h.promptOf(copyRunId);
    expect(prompt).toContain("You are Daily Assistant, a general-purpose agent");
    // REQ-004 (autobyteus-97): the Task's Project's first linked folder.
    const launch = await launchOf(roots.pm, copyRunId);
    expect(launch).toEqual({ recorded: [F], capsule: F, addDirs: [F] });
    // AC-003: the copy replied to its delegator by run id, and the PM's run received it.
    let reply: Rec | undefined;
    await until(async () => Boolean(reply = calledResults(await roots.pm.conversationOf(copyRunId, "/daily_assistant")).map(toolResult)[0]),
      "the copy's send_message_to result", 60_000);
    expect(reply, JSON.stringify(reply)).toMatchObject({ accepted: true, code: "DELIVERED", target_agent_run_id: roots.pm.rootId });
    const atPm = await received(pmConversation(roots.pm), marker, "the PM received the Daily Assistant's report");
    // ASM-001: the copy's Agent Tools include the reply tool (its template selects only list_available_agents of them).
    const tools = await toolsOf(roots.pm, copyRunId, "/daily_assistant");
    expect(tools).toEqual(expect.arrayContaining(["send_message_to", "list_available_agents"]));
    evidence["DAC-02"] = { taskId, delegated, agent, launch, reply, receivedAtPm: atPm.slice(0, 600), copyTools: tools,
      promptStart: prompt.slice(0, 200) };
  }, 240_000);

  it("DAC-03: a description-only delegation to /daily_assistant runs the copy in the delegating run's folder and it reports back", async () => {
    roots.pm2 = await h.startRoot("agent", { manager: ids.manager });
    const marker = `DA-ADHOC-${randomUUID().slice(0, 8)}`;
    const description = callTool("send_message_to", { target_agent_run_id: roots.pm2.rootId, content: `Ad-hoc done. ${marker}` });
    const delegated = await roots.pm2.calls(roots.pm2.rootId, "/", callTool("delegate_task", { recipient_address: "/daily_assistant", description }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent", isError: false });
    expect(typeof delegated.task_id, "an ad-hoc Task").toBe("string");
    const runId = delegated.target_agent_run_id as string;
    expect((await roots.pm2.waitForTaskAgent(runId)).address).toBe("/daily_assistant");
    const G = fs.realpathSync(h.workspace);
    const launch = await launchOf(roots.pm2, runId);
    expect(launch.capsule).toBe(G);
    expect(launch.addDirs).toEqual([G]);
    const atPm = await received(pmConversation(roots.pm2), marker, "the second PM received the ad-hoc report");
    evidence["DAC-03"] = { delegated, launch, receivedAtPm: atPm.slice(0, 600) };
  }, 240_000);

  it("DAC-04: a Team with a Daily Assistant member gets no second one; the PM gives its Daily Assistant copy a second Task by run id", async () => {
    // In-run guard (REQ-003): a run whose configured members include the Daily Assistant never adds another instance.
    // (Delegated copies are not placements: like any agent's, each delegate_task by address starts a new copy.)
    ids.team = await h.teamDefinition(`DAC Team ${randomUUID().slice(0, 6)}`, [["manager", ids.manager], ["mate", DA]], "manager");
    roots.team = await h.startRoot("team", { team: ids.team, manager: ids.manager, mate: DA });
    const teamList = (await roots.team.calls(roots.team.managerRunId, "/manager", callTool("list_available_agents", {}))).agents as Rec[];
    const refused = await roots.team.calls(roots.team.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/daily_assistant", description: "Reply OK." }));
    // The catalog maps a definition in the run to its in-run address (/mate), so /daily_assistant is no catalog address there.
    expect(teamList.map((entry) => entry.address), JSON.stringify(teamList)).not.toContain("/daily_assistant");
    expect(refused.delegated, JSON.stringify(refused)).not.toBe(true);
    expect(textOf(refused)).toContain("'/daily_assistant' is not the address of an available agent or agent team.");
    expect(taskAgentsIn(await roots.team.liveTree()), "no Daily Assistant copy started").toEqual([]);
    // SCN-A1: the PM's way to hand the same Daily Assistant more work: delegate_task with its run id and the saved Task.
    expect(copyRunId, "DAC-02 ran").toBeTruthy();
    const before = taskAgentsIn(await roots.pm.liveTree()).map((agent) => agent.agentRunId);
    const marker = `DA-SECOND-${randomUUID().slice(0, 8)}`;
    const second = await roots.pm.calls(roots.pm.rootId, "/", callTool("delegate_task", { target_agent_run_id: copyRunId, task_id: await createTask(`Second Task. ${marker}`) }));
    expect(second, JSON.stringify(second)).toMatchObject({ delegated: true, target_agent_run_id: copyRunId, isError: false });
    const atCopy = await received(() => roots.pm.conversationOf(copyRunId, "/daily_assistant"), marker, "the existing copy received the second Task");
    expect(taskAgentsIn(await roots.pm.liveTree()).map((agent) => agent.agentRunId), "no new copy for the second Task").toEqual(before);
    evidence["DAC-04"] = { teamList, refused, second, receivedAtCopy: atCopy.slice(0, 400) };
  }, 180_000);

  it("DAC-05: a Daily Assistant run does not see or delegate to its own definition", async () => {
    roots.da = await h.startRoot("agent", { manager: DA });
    const agents = await listOf(roots.da);
    expect(agents.map((entry) => entry.address)).not.toContain("/daily_assistant");
    expect(agents.map((entry) => entry.name)).not.toContain("Daily Assistant");
    expect(agents.map((entry) => entry.name)).not.toContain("Model Router");
    expect(agents.map((entry) => entry.name), "it still lists the other shared agents").toEqual(expect.arrayContaining([ids.helperName, ids.managerName]));
    const refused = await roots.da.calls(roots.da.rootId, "/", callTool("delegate_task", { recipient_address: "/daily_assistant", description: "Do it yourself." }));
    expect(refused.delegated, JSON.stringify(refused)).not.toBe(true);
    expect(taskAgentsIn(await roots.da.liveTree()), "nothing started").toEqual([]);
    evidence["DAC-05"] = { agents, refused };
  }, 180_000);

  it("DAC-06: `@` offers the Daily Assistant except in its own run, never the Model Router; an @Daily Assistant send is admitted", async () => {
    const views: Rec = {};
    for (const shown of ["false", "true"]) {
      await setShown(shown);
      const pm = await candidatesOf(roots.pm2);
      const da = await candidatesOf(roots.da);
      expect(pm, `shown=${shown}`).toContain(DA);
      expect(da, `shown=${shown}`).not.toContain(DA);
      expect([...pm, ...da], `shown=${shown}`).not.toContain(ROUTER);
      views[`shown=${shown}`] = { pm, da };
    }
    await setShown("false");
    roots.pm3 = await h.startRoot("agent", { manager: ids.manager });
    const marker = `MENTION-${randomUUID().slice(0, 8)}`;
    roots.pm3.sendTo(roots.pm3.rootId, `Please involve the assistant. ${marker}`, [{ kind: "agent", definition_id: DA }]);
    const stored = await received(pmConversation(roots.pm3), marker, "the PM received the @Daily Assistant message");
    const text = JSON.stringify(await roots.pm3.conversationOf(roots.pm3.rootId, "/"));
    expect(text).toContain("[Mentioned agents]");
    expect(text).toContain("Daily Assistant (agent) at /daily_assistant");
    expect(text).toContain("delegate_task");
    evidence["DAC-06"] = { views, stored: stored.slice(0, 800) };
  }, 180_000);
});
