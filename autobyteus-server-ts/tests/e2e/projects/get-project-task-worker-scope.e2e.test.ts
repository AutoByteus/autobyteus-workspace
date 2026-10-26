import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, calledResults, segment, stringsOf, taskAgentsIn, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// autobyteus-260 get_project_task (REQ-014..REQ-017; AC-012, AC-013, AC-014, AC-015; AR-006, AR-008, MP-003) through the
// built server (`dist/app.js`) in separate processes on a test-owned data root: real Team root, task copies, the Agent Tools
// MCP session authority (the caller identity of each runtime's MCP session) and the native AutoByteus tool resolver.
// Only external inference is scripted: the AGY CLI (tests/fixtures/agy-failure-cli.mjs, `linked_skills`: `CALL_TOOL:{…}`
// makes the agent call the real tool over MCP and reply `CALLED:<result>`; `LIST_TOOLS` lists its MCP tools) and an
// emulated LM Studio server for the native runtime (`NATIVE_CALL:{…}` in the last user message makes the model ask for
// that tool; the tool's result comes back in the next request and is answered `CALLED:<result>`). No provider inference.
// A Team root (manager on AGY, mate on the native runtime) whose manager delegates saved Tasks of one Project:
// - SCP-E2E-001 first messages: Task A to an AGY task agent, Task B to an AGY task Team, Task C to a native task agent,
//   each first message names `Task: <key> in Project <projectId>` and the get_project_task sentence; described work has neither;
// - SCP-E2E-002 MCP route: each worker reads its own Task (key, any letter case, long ID) and is refused any other one
//   (`TASK_READ_OUT_OF_SCOPE`, no data); the task Team's coordinator and the agent it delegated to work on B; a Temp-task
//   worker is told its Task has no Project; the manager (on no Task) reads any; unknown and other-Project keys are not found;
// - SCP-E2E-003 native route: the native task agent reads only C; the native mate (on no Task) reads any;
// - SCP-E2E-004 exposure: an agent whose definition lists the tool has it on MCP and on the native request; one without it has not;
// - SCP-E2E-005 existing copy: Task D given to the AGY task agent copy while A is open: its message names D and Project,
//   and it now reads D only (its current Task, AR-006);
// - SCP-E2E-006 damaged run data (MP-003): the server stops, the native copy's Task file `agent_run_resources.json` is
//   damaged, the server starts again: the copy whose Task can't be read takes no input and calls no tool (fail closed), a
//   worker whose Task can be read still reads only its own, callers outside any copy read any, and the list marks it.
// Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree. About 4 minutes.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts --no-watch
// `SCOPE_E2E_EVIDENCE_DIR` keeps a JSON receipt (first messages, every tool result, the native requests' tool names).
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.SCOPE_E2E_EVIDENCE_DIR?.trim() || null;

type Frame = { type: string; payload: Rec };
type Task = { taskId: string; taskKey: string; title: string; description: string };
const serverDir = path.resolve(__dirname, "../../..");
const AGY_MODEL = "gemini-3.8-flash-low";
const FIXTURE_MODEL = "scope-fixture";
const SENTENCE = "If you have get_project_task, it reads this Task again, including comments added later.";
const outOfScope = (key: string) => ({ error: { code: "TASK_READ_OUT_OF_SCOPE", message: `You work on ${key}; you can read only that Task.` } });

suite("get_project_task worker scope through real roots and runtimes (built server, scripted AGY, emulated LM Studio)", () => {
  let root = "";
  let provider: http.Server | null = null;
  let providerOrigin = "";
  const servers: Array<{ child: ChildProcess; output: () => string }> = [];
  const receipt: Rec = { firstMessages: {}, results: [], nativeRequests: [] };
  /** Every chat request the native runtime sent: the model's tool names, the last message's role and text. */
  const nativeRequests: Array<{ tools: string[]; lastRole: string; lastText: string; system: string }> = [];
  let server: Awaited<ReturnType<typeof startServer>>;
  let view: Awaited<ReturnType<typeof openTeam>>;
  let rootRunId = "", managerRunId = "", mateRunId = "", projectId = "", otherProjectId = "", model = "";
  const tasks: Record<"A" | "B" | "C" | "D" | "X", Task> = {} as never;
  const runs = { helper: "", coordinator: "", squadTeam: "", reviewer: "", native: "", plain: "" };
  const names: Record<string, string> = {};

  // ---------------------------------------------------------------- emulated LM Studio (inference only)
  const textOf = (content: unknown) => typeof content === "string" ? content
    : Array.isArray(content) ? content.map((part: Rec) => part?.text ?? "").join("") : JSON.stringify(content ?? "");
  const startProvider = async () => {
    provider = http.createServer(async (req, res) => {
      if (req.url === "/api/v1/models") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ models: [{ key: FIXTURE_MODEL, max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] }));
        return;
      }
      let body = "";
      for await (const chunk of req) body += chunk;
      if (req.url !== "/v1/chat/completions") { res.writeHead(404); res.end(); return; }
      const request = JSON.parse(body) as Rec;
      const messages = request.messages as Rec[];
      const last = messages.at(-1) ?? {};
      const lastText = textOf(last.content);
      nativeRequests.push({ tools: ((request.tools ?? []) as Rec[]).map((tool) => tool.function?.name ?? tool.name), lastRole: last.role,
        lastText, system: textOf(messages.find((message) => message.role === "system")?.content).slice(0, 4000) });
      const base = { id: randomUUID(), object: "chat.completion.chunk", created: 1, model: FIXTURE_MODEL };
      const call = last.role === "user" ? /NATIVE_CALL:(\{.*\})/s.exec(lastText) : null;
      const choices = call
        ? [{ index: 0, delta: { role: "assistant", content: null, tool_calls: [{ index: 0, id: `call_${randomUUID().slice(0, 8)}`, type: "function",
            function: { name: JSON.parse(call[1]!).name, arguments: JSON.stringify(JSON.parse(call[1]!).arguments) } }] }, finish_reason: null },
          { index: 0, delta: {}, finish_reason: "tool_calls" }]
        : [{ index: 0, delta: { role: "assistant", content: last.role === "tool" ? `CALLED:${lastText}` : "OK" }, finish_reason: null },
          { index: 0, delta: {}, finish_reason: "stop" }];
      res.writeHead(200, { "content-type": "text/event-stream" });
      for (const choice of choices) res.write(`data: ${JSON.stringify({ ...base, choices: [choice] })}\n\n`);
      res.end("data: [DONE]\n\n");
    });
    provider.listen(0, "127.0.0.1"); await once(provider, "listening");
    providerOrigin = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;
  };

  // ---------------------------------------------------------------- built server processes
  const startServer = async (label: string) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: path.join(root, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      USER: process.env.USER ?? "tester", DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ANTIGRAVITY_CLI_COMMAND: cli,
      AGY_FAKE_CASE: "linked_skills", AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: providerOrigin };
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
  const stopServer = async (target: Server) => {
    if (target.child.exitCode !== null || target.child.signalCode !== null) return;
    const exited = once(target.child, "exit");
    target.child.kill("SIGTERM");
    const force = setTimeout(() => target.child.kill("SIGKILL"), 8_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  /** AGY processes this test's servers started (their working folders are under the test root). */
  const agyProcesses = () => spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" }).stdout.split("\n")
    .filter((line) => line.includes(cli) && !line.includes("--version")).map((line) => line.trim())
    .filter((line) => { const pid = line.split(/\s+/)[0]!; return spawnSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" }).stdout.includes(root); });

  /** The Team root's stream: the user's messages to any agent of the root, and every frame it sends back. */
  const openTeam = async (target: Server) => {
    const socket = new WebSocket(`ws://${new URL(target.url).host}/ws/agent-team/${rootRunId}`);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"), `${target.label}: team stream snapshot`, 30_000);
    const conversationOf = async (agentRunId: string) => (await target.graphql(
      `query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: rootRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
    const send = (agentRunId: string, content: string) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content });
    return { socket, frames, conversationOf, send, close: () => socket.terminate() };
  };
  const tree = async () => (await server.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootRunId })).getTeamRunResumeConfig.executionTree;

  /** One agent tool call by an AGY agent of the root: the tool's MCP result as the agent received it. */
  const agyCall = async (who: string, agentRunId: string, name: string, args: Rec) => {
    const before = calledResults(await view.conversationOf(agentRunId)).length;
    view.send(agentRunId, callTool(name, args));
    let results: string[] = [];
    await until(async () => { results = calledResults(await view.conversationOf(agentRunId)); return results.length > before; },
      `${who} ${name} ${JSON.stringify(args)}`, 90_000);
    const raw = JSON.parse(results[before]!) as Rec;
    receipt.results.push({ who, route: "mcp", name, args, raw });
    // One pruned value is both copies, compact (REQ-001/002).
    expect(JSON.parse(raw.content[0].text), `${who} ${name}: both MCP copies`).toEqual(raw.structuredContent);
    expect(raw.content[0].text, `${who} ${name}: compact`).toBe(JSON.stringify(raw.structuredContent));
    return toolResult(results[before]!);
  };
  /** One agent tool call by a native agent: the tool result text as the model received it, parsed. */
  const nativeCall = async (who: string, agentRunId: string, name: string, args: Rec) => {
    const mark = nativeRequests.length;
    view.send(agentRunId, `NATIVE_CALL:${JSON.stringify({ name, arguments: args })}`);
    let answer: (typeof nativeRequests)[number] | undefined;
    await until(() => Boolean(answer = nativeRequests.slice(mark).find((request) => request.lastRole === "tool")), `${who} native ${name} result`, 90_000);
    await until(async () => stringsOf(await view.conversationOf(agentRunId)).some((text) => text === `CALLED:${answer!.lastText}`), `${who} turn completes`, 30_000);
    const text = answer!.lastText;
    receipt.results.push({ who, route: "native", name, args, text });
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    // The native tool result is compact JSON of valued fields only.
    expect(JSON.stringify(JSON.parse(json)), `${who} ${name}: compact`).toBe(json);
    return JSON.parse(json) as Rec;
  };
  /** The first message an agent received: the conversation text that names its delegator. */
  const firstMessageOf = async (who: string, agentRunId: string) => {
    let found: string | undefined;
    await until(async () => Boolean(found = stringsOf(await view.conversationOf(agentRunId)).find((text) => text.includes("You have a new task from"))), `${who} first message`, 90_000);
    receipt.firstMessages[who] = found;
    return found!;
  };
  const taskLine = (task: Task) => `Task: ${task.taskKey} in Project ${projectId}\n${SENTENCE}\nDescription:\n${task.description}`;
  const fullTask = (task: Task, extra: Rec = {}) => ({ projectId, taskId: task.taskKey, title: task.title, status: "TODO", description: task.description, ...extra });
  const delegate = async (args: Rec) => {
    const delegated = await agyCall("manager", managerRunId, "delegate_task", args);
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
    return delegated;
  };

  beforeAll(async () => {
    root = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "scope-e2e-")));
    const workspace = path.join(root, "workspace");
    for (const dir of [workspace, path.join(root, "home"), path.join(root, "db")]) await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    await fsp.access(path.join(serverDir, "dist", "app.js"));
    await startProvider();
    server = await startServer("server #1");
    const reloaded = await server.graphql(`mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
    model = reloaded.reloadProviderModelCatalog.llmModels.find((m: Rec) => String(m.modelIdentifier).startsWith(`${FIXTURE_MODEL}:`))?.modelIdentifier;
    expect(model, "the emulated LM Studio model is offered").toBeTruthy();

    const suffix = randomUUID().slice(0, 6);
    const agy = { workspaceRootPath: workspace, llmModelIdentifier: AGY_MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" };
    const native = { workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus" };
    const agent = async (key: string, toolNames: string[], defaultLaunchConfig: Rec | null = null) => {
      names[key] = `Scope ${key} ${suffix}`;
      return (await server.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
        { input: { name: names[key], role: "assistant", description: `${key} (get_project_task scope E2E)`, instructions: `You are ${names[key]}. Follow the request.`,
          toolNames, ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id as string;
    };
    const team = async (key: string, members: Array<[string, string]>, coordinator: string) => {
      names[key] = `Scope ${key} ${suffix}`;
      return (await server.graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
        { input: { name: names[key], description: `${key} team`, instructions: `Team instruction of ${names[key]}.`, coordinatorMemberName: coordinator,
          nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })) } })).createAgentTeamDefinition.id as string;
    };
    const READ = ["get_project_task"];
    const ids = {
      manager: await agent("Manager", ["list_projects", "list_project_tasks", "get_project_task", "create_task", "update_task"]),
      mate: await agent("Mate", READ),
      helper: await agent("Helper", READ),
      nativeHelper: await agent("Native Helper", READ, { runtimeKind: "autobyteus", llmModelIdentifier: model }),
      plain: await agent("Plain", READ),
      bare: await agent("Bare", []),
      reviewer: await agent("Reviewer", READ),
      lead: await agent("Lead", READ), peer: await agent("Peer", READ),
    };
    await team("Squad", [["lead", ids.lead], ["peer", ids.peer]], "lead");
    const rootTeam = await team("Root", [["manager", ids.manager], ["mate", ids.mate]], "manager");
    const created = (await server.graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: rootTeam, teamConfigs: [{ teamAddress: "/", ...agy }], memberConfigs: [
        { memberAddress: "/manager", agentDefinitionId: ids.manager, ...agy }, { memberAddress: "/mate", agentDefinitionId: ids.mate, ...native }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    rootRunId = created.teamRunId;
    const members = flattenE2eConfiguredAgentExecutions(await tree());
    managerRunId = members.find((member) => member.memberAddress === "/manager")!.agentRunId;
    mateRunId = members.find((member) => member.memberAddress === "/mate")!.agentRunId;

    const project = async (name: string) => (await server.graphql(`mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}`, { i: { name } })).createProject.projectId as string;
    projectId = await project(`Scope Board ${suffix}`);
    otherProjectId = await project(`Other Board ${suffix}`);
    const task = async (inProject: string, title: string, description: string) => (await server.graphql(
      `mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey title description}}`, { i: { projectId: inProject, title, description } })).createProjectTask as Task;
    tasks.A = await task(projectId, "Write the release notes", "Write the release notes for 1.6.\nKeep them short.");
    tasks.B = await task(projectId, "Review the docs site", "Review the docs site with the squad.");
    tasks.C = await task(projectId, "Check the native runtime", "Check the native runtime path.");
    tasks.D = await task(projectId, "Publish the changelog", "Publish the changelog after the notes.");
    tasks.X = await task(otherProjectId, "Elsewhere", "A Task of another Project.");
    view = await openTeam(server);
  }, 240_000);

  afterAll(async () => {
    view?.close();
    if (evidenceDir) {
      await fsp.mkdir(evidenceDir, { recursive: true });
      await fsp.writeFile(path.join(evidenceDir, "get-project-task-worker-scope-receipt.json"),
        `${JSON.stringify({ ...receipt, projectId, otherProjectId, tasks, runs, nativeRequests: nativeRequests.map(({ tools, lastRole, lastText }) => ({ tools, lastRole, lastText: lastText.slice(0, 600) })) }, null, 2)}\n`);
      await fsp.writeFile(path.join(evidenceDir, "get-project-task-worker-scope-server.log"), servers.map((s, i) => `=== server #${i + 1}\n${s.output()}`).join("\n"));
    }
    for (const entry of servers) if (entry.child.exitCode === null && entry.child.signalCode === null) entry.child.kill("SIGKILL");
    for (const line of agyProcesses()) { try { process.kill(Number(line.split(/\s+/)[0]), "SIGKILL"); } catch { /* gone */ } }
    if (provider) { const closed = once(provider, "close"); provider.close(); provider.closeAllConnections(); await closed; }
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("SCP-E2E-001 AC-015: each saved Task's first message names it and its Project (AGY agent, AGY Team, native agent); described work does not", async () => {
    const toHelper = await delegate({ recipient_address: `/${segment(names.Helper!)}`, task_id: tasks.A.taskKey });
    runs.helper = toHelper.target_agent_run_id;
    expect(await firstMessageOf("helper", runs.helper)).toContain(taskLine(tasks.A));

    const toSquad = await delegate({ recipient_address: `/${segment(names.Squad!)}`, task_id: tasks.B.taskKey });
    expect(toSquad).toMatchObject({ target_kind: "team" });
    runs.squadTeam = toSquad.target_team_run_id; runs.coordinator = toSquad.target_team_coordinator_agent_run_id;
    expect(await firstMessageOf("squad coordinator", runs.coordinator)).toContain(taskLine(tasks.B));

    const toNative = await delegate({ recipient_address: `/${segment(names["Native Helper"]!)}`, task_id: tasks.C.taskId });
    runs.native = toNative.target_agent_run_id;
    let nativeFirst: string | undefined;
    await until(() => Boolean(nativeFirst = nativeRequests.find((request) => request.lastRole === "user" && request.lastText.includes(`Task: ${tasks.C.taskKey}`))?.lastText),
      "native helper's first request", 90_000);
    receipt.firstMessages["native helper"] = nativeFirst;
    expect(nativeFirst).toContain(taskLine(tasks.C));

    const toPlain = await delegate({ recipient_address: `/${segment(names.Plain!)}`, description: "Check the changelog links.\nReport broken ones." });
    runs.plain = toPlain.target_agent_run_id;
    const described = await firstMessageOf("plain (described)", runs.plain);
    expect(described).toContain("Description:\nCheck the changelog links.\nReport broken ones.");
    expect(described).not.toMatch(/Task: |get_project_task/);
  }, 300_000);

  it("SCP-E2E-002 AC-012, AC-013 MCP route: workers read only their own Task; the manager reads any; unknown and other-Project keys are not found", async () => {
    // The task agent on A: by key, by key in another letter case and by long ID, the same full Task.
    const a = await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey });
    expect(a).toMatchObject({ ...fullTask(tasks.A), isError: false });
    expect(a.assignments).toEqual([expect.objectContaining({ kind: "agent", agentRunId: runs.helper })]);
    // Empty fields are left out: no comments, context files, relations or closed assignments on this Task.
    for (const field of ["comments", "contextFiles", "dependsOn", "partOf", "parts", "closedAssignments", "summary"]) expect(a, field).not.toHaveProperty(field);
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey.toUpperCase() })).toEqual(a);
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.A.taskId })).toEqual(a);
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.B.taskKey })).toEqual({ ...outOfScope(tasks.A.taskKey), isError: true });

    // The task Team's coordinator, and the agent it delegated to, work on B.
    expect(await agyCall("squad coordinator", runs.coordinator, "get_project_task", { project_id: projectId, task_id: tasks.B.taskKey }))
      .toMatchObject({ ...fullTask(tasks.B), assignments: [expect.objectContaining({ kind: "team", teamRunId: runs.squadTeam })], isError: false });
    expect(await agyCall("squad coordinator", runs.coordinator, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey })).toEqual({ ...outOfScope(tasks.B.taskKey), isError: true });
    const sub = await agyCall("squad coordinator", runs.coordinator, "delegate_task", { recipient_address: `/${segment(names.Reviewer!)}`, description: "Review the docs site's API pages." });
    expect(sub).toMatchObject({ delegated: true });
    runs.reviewer = sub.target_agent_run_id;
    await until(async () => Boolean((await taskAgentsIn(await tree())).find((entry) => entry.agentRunId === runs.reviewer)), "reviewer in the tree", 60_000);
    await firstMessageOf("reviewer (sub-work)", runs.reviewer);
    expect(await agyCall("reviewer", runs.reviewer, "get_project_task", { project_id: projectId, task_id: tasks.B.taskKey })).toMatchObject({ taskId: tasks.B.taskKey, isError: false });
    expect(await agyCall("reviewer", runs.reviewer, "get_project_task", { project_id: projectId, task_id: tasks.C.taskKey })).toEqual({ ...outOfScope(tasks.B.taskKey), isError: true });

    // A Temp-task worker's Task has no Project.
    expect(await agyCall("plain", runs.plain, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey }))
      .toEqual({ error: { code: "TASK_READ_OUT_OF_SCOPE", message: "Your Task has no Project; get_project_task reads Project Tasks." }, isError: true });

    // The manager works on no Task: it reads any Project Task; a Task must belong to the named Project.
    expect(await agyCall("manager", managerRunId, "get_project_task", { project_id: projectId, task_id: tasks.B.taskKey })).toMatchObject({ ...fullTask(tasks.B), isError: false });
    expect(await agyCall("manager", managerRunId, "get_project_task", { project_id: projectId, task_id: tasks.C.taskKey.toUpperCase() })).toMatchObject({ taskId: tasks.C.taskKey, isError: false });
    for (const taskId of [tasks.X.taskKey, tasks.X.taskId, `${tasks.A.taskKey}9`]) {
      const missing = await agyCall("manager", managerRunId, "get_project_task", { project_id: projectId, task_id: taskId });
      expect(missing, taskId).toMatchObject({ error: { code: "TASK_NOT_FOUND" }, isError: true });
      expect(Object.keys(missing).sort(), taskId).toEqual(["error", "isError"]);
    }
    expect(await agyCall("manager", managerRunId, "get_project_task", { project_id: otherProjectId, task_id: tasks.X.taskKey })).toMatchObject({ projectId: otherProjectId, taskId: tasks.X.taskKey, isError: false });
  }, 600_000);

  it("SCP-E2E-003 AC-012, AC-013 native route: the native task agent reads only its Task; the native mate on no Task reads any", async () => {
    const c = await nativeCall("native helper", runs.native, "get_project_task", { project_id: projectId, task_id: tasks.C.taskKey });
    expect(c).toMatchObject(fullTask(tasks.C));
    expect(c.assignments).toEqual([expect.objectContaining({ kind: "agent", agentRunId: runs.native })]);
    expect(await nativeCall("native helper", runs.native, "get_project_task", { project_id: projectId, task_id: tasks.C.taskId })).toEqual(c);
    expect(await nativeCall("native helper", runs.native, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey })).toEqual(outOfScope(tasks.C.taskKey));
    expect(await nativeCall("mate", mateRunId, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey })).toMatchObject(fullTask(tasks.A));
    expect(await nativeCall("mate", mateRunId, "get_project_task", { project_id: projectId, task_id: tasks.X.taskKey })).toMatchObject({ error: { code: "TASK_NOT_FOUND" } });
  }, 300_000);

  it("SCP-E2E-004 AC-014: get_project_task is there only for agents whose definition lists it, on MCP and on the native request", async () => {
    const toolsOf = async (who: string, agentRunId: string) => {
      const before = stringsOf(await view.conversationOf(agentRunId)).filter((text) => text.startsWith("TOOLS:")).length;
      view.send(agentRunId, "LIST_TOOLS");
      let listed: string[] = [];
      await until(async () => (listed = stringsOf(await view.conversationOf(agentRunId)).filter((text) => text.startsWith("TOOLS:"))).length > before, `${who} tools`, 60_000);
      const tools = (JSON.parse(listed[before]!.slice("TOOLS:".length)) as Rec[]).map((tool) => tool.name as string);
      receipt.results.push({ who, route: "mcp", name: "LIST_TOOLS", tools });
      return tools;
    };
    expect(await toolsOf("helper", runs.helper)).toContain("get_project_task");
    const toBare = await delegate({ recipient_address: `/${segment(names.Bare!)}`, description: "Say hello." });
    await firstMessageOf("bare", toBare.target_agent_run_id);
    expect(await toolsOf("bare", toBare.target_agent_run_id)).not.toContain("get_project_task");
    // The native requests of the native helper and the mate (both list it) offer the model the tool.
    const withTool = nativeRequests.filter((request) => request.system.includes(names["Native Helper"]!) || request.system.includes(names.Mate!));
    expect(withTool.length).toBeGreaterThan(0);
    expect(withTool.every((request) => request.tools.includes("get_project_task"))).toBe(true);
  }, 300_000);

  it("SCP-E2E-005 AC-015, AR-006: a second saved Task to the existing copy names it and its Project; the copy then reads only that Task", async () => {
    const before = stringsOf(await view.conversationOf(runs.helper)).length;
    await delegate({ target_agent_run_id: runs.helper, task_id: tasks.D.taskKey });
    let message: string | undefined;
    await until(async () => Boolean(message = stringsOf(await view.conversationOf(runs.helper)).slice(before).find((text) => text.includes(`New Task assigned to you: ${tasks.D.taskKey}`))),
      "existing copy's Task message", 90_000);
    receipt.firstMessages["helper (existing copy, Task D)"] = message;
    expect(message).toContain(`New Task assigned to you: ${tasks.D.taskKey}. Your Task ${tasks.A.taskKey} is still open; name the Task key in each report.`);
    expect(message).toContain(taskLine(tasks.D));
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.D.taskKey })).toMatchObject({ ...fullTask(tasks.D), isError: false });
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey })).toEqual({ ...outOfScope(tasks.D.taskKey), isError: true });
  }, 300_000);

  it("SCP-E2E-006 MP-003: damaged run data found at start fails closed for the copy it belongs to; readable callers keep their scope", async () => {
    view.close();
    await stopServer(server);
    for (const line of agyProcesses()) { try { process.kill(Number(line.split(/\s+/)[0]), "SIGKILL"); } catch { /* gone */ } }
    const damaged = path.join(root, "projects", projectId, "tasks", tasks.C.taskId, "agent_run_resources.json");
    expect(fs.existsSync(damaged), damaged).toBe(true);
    await fsp.writeFile(damaged, "{ this is not JSON");
    server = await startServer("server #2");
    view = await openTeam(server);

    // Outside any copy, the scope is told without Task data: the manager (MCP) and the mate (native) read any Task.
    expect(await agyCall("manager", managerRunId, "get_project_task", { project_id: projectId, task_id: tasks.A.taskKey })).toMatchObject({ taskId: tasks.A.taskKey, isError: false });
    expect(await nativeCall("mate", mateRunId, "get_project_task", { project_id: projectId, task_id: tasks.B.taskKey })).toMatchObject({ taskId: tasks.B.taskKey });
    // A worker whose Task data is readable still reads only its current Task.
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.D.taskKey })).toMatchObject({ taskId: tasks.D.taskKey, isError: false });
    expect(await agyCall("helper", runs.helper, "get_project_task", { project_id: projectId, task_id: tasks.C.taskKey })).toEqual({ ...outOfScope(tasks.D.taskKey), isError: true });
    // The copy whose Task data can't be read takes no input, so it reads nothing: no model request is made for it.
    const mark = nativeRequests.length, frames = view.frames.length;
    view.send(runs.native, `NATIVE_CALL:${JSON.stringify({ name: "get_project_task", arguments: { project_id: projectId, task_id: tasks.A.taskKey } })}`);
    let refusal: Frame | undefined;
    await until(() => Boolean(refusal = view.frames.slice(frames).find((frame) => frame.type === "ERROR")), "native copy input refused", 60_000);
    receipt.results.push({ who: "native helper (damaged)", route: "native", refusal });
    expect(JSON.stringify(refusal!.payload)).toContain("TASK_AGENT_RESOURCES_UNAVAILABLE");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect(nativeRequests.slice(mark).filter((request) => request.system.includes(names["Native Helper"]!))).toEqual([]);
    // The manager's list marks the damaged Task, the others are listed as before.
    const list = await agyCall("manager", managerRunId, "list_project_tasks", { project_id: projectId });
    expect(list.tasks.find((entry: Rec) => entry.taskId === tasks.C.taskKey)).toEqual({ taskId: tasks.C.taskKey, title: tasks.C.title, status: "TODO", assignmentsUnavailable: true });
    expect(await fsp.readFile(damaged, "utf8")).toBe("{ this is not JSON");
  }, 300_000);
});
