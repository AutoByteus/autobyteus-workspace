import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { expect } from "vitest";
import { calledResults, taskAgentsIn, toolResult, type Rec } from "./collaboration-root-harness.js";
import { builtServerLaunchEnvironment } from "./built-server-launch-credential.js";
import { PARTICIPANT_MESSAGES_QUERY } from "../../helpers/collaboration-participant-messages.js";

/**
 * The BUILT Studio server (`dist/app.js`) as a separate process on a test-owned data root, and the Agent, Agent Team and
 * Agent Org roots a test drives on it through the public GraphQL/WebSocket surfaces: the Manager's composer input, a real
 * scripted tool call (`CALL_TOOL:{...}` with the scripted AGY CLI) and the reads a client makes. A restart is `stop()` and
 * a new `startBuiltStudio` on the same root. Used by the autobyteus-469 E2E suites (trees built from open Tasks).
 */

export type Kind = "agent" | "team" | "org";
export type Root = { kind: Kind; rootId: string; managerRunId: string };
export type BuiltStudio = Awaited<ReturnType<typeof startBuiltStudio>>;

export const MODEL = "gemini-3.8-flash-low";
export const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
export const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const until = async <T>(check: () => Promise<T> | T, label: string, timeout = 60_000): Promise<NonNullable<T>> => {
  const deadline = Date.now() + timeout;
  let last: unknown;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value as NonNullable<T>; } catch (error) { last = error; }
    await sleep(150);
  }
  throw new Error(`Timed out: ${label}${last ? ` (${String(last)})` : ""}`);
};

const children: ChildProcess[] = [];
/** Kills every built server process a test started and did not stop (for `afterAll`). */
export const killBuiltStudios = (): void => {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
};

/** Starts `dist/app.js` on `root` (its `.env`, `home/` and `db/` live there) with the given test-owned environment. */
export const startBuiltStudio = async (root: string, testEnv: Record<string, string>) => {
  const serverDir = path.resolve(__dirname, "../../..");
  await fs.access(path.join(serverDir, "dist", "app.js"));
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, ...testEnv, ...builtServerLaunchEnvironment() });
  const child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { cwd: serverDir, env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let output = "";
  child.stdout!.on("data", (chunk) => { output += String(chunk); });
  child.stderr!.on("data", (chunk) => { output += String(chunk); });
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`server exited: ${output.slice(-2000)}`);
    return output.includes("Server listening on 127.0.0.1:0");
  }, "server readiness", 180_000).catch((error) => { throw new Error(`${error}\n${output.slice(-2000)}`); });
  // The Studio app is the listener that serves GraphQL (the agent-tools MCP host logs its own listening line first).
  let url = "";
  for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
    const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
    if (probe.ok) { url = candidate!; break; }
  }
  if (!url) throw new Error(`no listener serves GraphQL: ${output.slice(-2000)}`);
  const gql = async <T = any>(query: string, variables: Rec = {}): Promise<T> => {
    const response = await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const sockets: WebSocket[] = [];
  const stop = async () => {
    for (const socket of sockets.splice(0)) socket.terminate();
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 10_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  return { url, gql, sockets, stop, output: () => output };
};

export const runConfig = (workspace: string) => ({ workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });

/** Creates a root of one kind whose Manager is `ids.manager` (a Team definition `ids.team`, an Org definition `ids.org`). */
export const createRoot = async (s: BuiltStudio, kind: Kind, ids: { manager: string; team?: string; org?: string }, workspace: string): Promise<Root> => {
  const config = runConfig(workspace);
  if (kind === "agent") {
    const r = (await s.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: ids.manager, ...config } })).createAgentRun;
    expect(r.success, r.message).toBe(true);
    return { kind, rootId: r.runId, managerRunId: r.runId };
  }
  if (kind === "team") {
    const r = (await s.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config }],
        memberConfigs: [{ memberAddress: "/manager", agentDefinitionId: ids.manager, ...config }] } })).createAgentTeamRun;
    expect(r.success, r.message).toBe(true);
    const tree = (await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
    return { kind, rootId: r.teamRunId, managerRunId: tree.root_team.members.find((m: Rec) => m.address === "/manager").agent_run_id };
  }
  const r = (await s.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
    { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  expect(r.success, r.message).toBe(true);
  const tree = (await s.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: r.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  return { kind, rootId: r.agentOrgRunId, managerRunId: tree.rootOrg.members.find((m: Rec) => m.address === "/manager").agentRunId };
};

/** The tree the server reports for a root (its composed view). */
export const treeOf = async (s: BuiltStudio, root: Root) => {
  if (root.kind === "agent") return (await s.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: root.rootId })).agentRunCollaboration?.root_agent?.execution_tree;
  if (root.kind === "team") return (await s.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: root.rootId })).getTeamRunResumeConfig.executionTree;
  return (await s.gql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: root.rootId })).getAgentOrgRootHistory.org;
};
export const treeRunIds = async (s: BuiltStudio, root: Root) => taskAgentsIn(await treeOf(s, root)).map((t) => t.agentRunId ?? t.teamRunId!);

export const managerConversation = async (s: BuiltStudio, root: Root) => {
  if (root.kind === "agent") return (await s.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: root.rootId })).getRunProjection?.conversation;
  if (root.kind === "team") return (await s.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
    { id: root.rootId, a: root.managerRunId })).getTeamMemberRunProjection?.conversation;
  return (await s.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
    { id: root.rootId, a: root.managerRunId, m: "/manager" })).getAgentOrgMemberRunProjection?.conversation;
};

/** The Manager's input channel (what its composer sends), and one scripted tool call returning its result. */
export const managerOf = async (s: BuiltStudio, root: Root) => {
  const route = root.kind === "agent" ? `agent/${root.rootId}` : root.kind === "team" ? `agent-team/${root.rootId}` : `agent-org/${root.rootId}`;
  const socket = new WebSocket(`${s.url.replace(/^http/, "ws")}/ws/${route}`);
  s.sockets.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  const send = (content: string) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: root.kind === "org"
    ? { root_subject_kind: "agent_org", root_run_id: root.rootId, target_agent_run_id: root.managerRunId, command_id: randomUUID(),
      message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: root.managerRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
      content, context_file_paths: [], image_urls: [] } }));
  const call = async (name: string, args: Rec): Promise<Rec> => {
    const before = calledResults(await managerConversation(s, root)).length;
    send(callTool(name, args));
    const results = await until(async () => { const r = calledResults(await managerConversation(s, root)); return r.length > before ? r : null; },
      `${root.kind} Manager ${name}`, 90_000);
    return toolResult(results[before]!);
  };
  return { call, close: () => socket.close() };
};

export const restoreRoot = async (s: BuiltStudio, root: Root) => {
  const mutation = root.kind === "agent" ? `mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`
    : root.kind === "team" ? `mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`
      : `mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`;
  const restored = Object.values(await s.gql(mutation, { id: root.rootId }))[0] as Rec;
  expect(restored.success, restored.message).toBe(true);
};
export const terminateRoot = async (s: BuiltStudio, root: Root) => {
  const mutation = root.kind === "agent" ? `mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`
    : root.kind === "team" ? `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`
      : `mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`;
  const result = Object.values(await s.gql(mutation, { id: root.rootId }))[0] as Rec;
  expect(result.success, result.message).toBe(true);
};

/** The Manager's Team tab (its participant messages and the past participants they name, autobyteus-469 D-5). */
export const managerTab = async (s: BuiltStudio, r: Root) => (await s.gql(PARTICIPANT_MESSAGES_QUERY,
  { rootKind: r.kind === "agent" ? "agent" : r.kind === "team" ? "agent_team" : "agent_org", rootRunId: r.rootId, agentRunId: r.managerRunId }))
  .collaborationParticipantMessages as { messages: Rec[]; pastParticipants: Rec[] };
