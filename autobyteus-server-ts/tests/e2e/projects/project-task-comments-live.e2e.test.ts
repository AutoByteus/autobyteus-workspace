import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ProjectChangeMessageSchema } from "../../../src/projects/changes/project-change-messages.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// task-comments AC-010 (comments in delegated work, to a new and to an existing task agent), AC-001 (a combined status + comment
// call is one write; Temp tasks refused with nothing written) and REQ-007's wire (`/ws/projects` carries the thread) through
// the real Studio HTTP/WebSocket server, the Manager's scoped Agent Tools MCP session, the Project/Task services and live
// delegated task agents. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs): `CALL_TOOL:{...}` makes
// the agent call that actual tool and reply `CALLED:<result>`. No provider inference. One standalone Agent root.
// Gate: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<absolute path to tests/fixtures/agy-failure-cli.mjs>.
// Run: env -i PATH="$PATH" HOME="<resolved temp dir>" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-comments-live.e2e.test.ts --no-watch
// Optional TASK_COMMENTS_LIVE_E2E_EVIDENCE_DIR: writes project-task-comments-live.json (results, work texts, cleanup).
// Cases: CMT-LIVE-001 a new task agent's work has the "Comments:" block (none without comments); CMT-LIVE-002 DONE + comment is
// one write, and an existing task agent's next Task carries its comments; CMT-LIVE-003 Temp tasks have no comments;
// CMT-LIVE-004 every feed frame satisfies the strict server schema and every Project Task view carries its thread.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> } & Record<string, any>;
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const stringsIn = (value: unknown): string[] => typeof value === "string" ? [value]
  : Array.isArray(value) ? value.flatMap(stringsIn) : value && typeof value === "object" ? Object.values(value).flatMap(stringsIn) : [];
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const found = stringsIn(entry).find((text) => text.includes("CALLED:"));
  return found ? [found.slice(found.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, ...(raw.isError ? { isError: true } : {}) };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called }; }
};

suite("Project Task comments reach delegated task agents; the feed carries the thread (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: string[] = [];
  const ids = { manager: "", worker: "" };
  let workerName = "";
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  const feedRaw: string[] = [];
  const feedFrames: Frame[] = [];
  let projectId = "";
  let manager!: { rootId: string; calls: (content: string) => Promise<Record<string, any>>; conversationOf: (agentRunId: string, address: string) => Promise<unknown> };

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (Task comments live E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const terminate = async (rootId: string) => {
    const result = (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
    active.splice(active.indexOf(rootId), 1);
  };
  const tasks = async () => (await graphql(`query($id:String!){projectTasks(projectId:$id){taskId taskKey status description updatedAt comments{id createdAt text}}}`,
    { id: projectId })).projectTasks as any[];
  const task = async (reference: string) => (await tasks()).find((t) => t.taskId === reference || t.taskKey === reference);
  const upserts = (taskId: string, from = 0) => feedFrames.slice(from).filter((f) => f.type === "task_upserted" && f.task.taskId === taskId).map((f) => f.task);
  const workerAddress = () => `/${segment(workerName)}`;
  const ack = (taskId: string, status: string) => ({ task: { projectId, taskId, status, dependsOn: [], partOf: null } });
  /** Every text of a task agent's conversation, as the agent received it. */
  const workerTexts = async (worker: string) => stringsIn(await manager.conversationOf(worker, workerAddress()));

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-comments-live-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    workerName = `CMT Worker ${suffix}`;
    ids.manager = await agentDefinition(`CMT Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(workerName, []);
    const feed = new WebSocket(`ws://${url.host}/ws/projects`);
    sockets.push(feed);
    feed.on("message", (raw: unknown) => { const text = String(raw); feedRaw.push(text); feedFrames.push(JSON.parse(text)); });
    await new Promise<void>((resolve, reject) => { feed.once("open", resolve); feed.once("error", reject); });
    await until(() => feedFrames.some((f) => f.type === "connected"), "projects feed connected");
    projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Comments Live ${suffix}` } })).createProject.projectId as string;
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const rootId = created.runId as string;
    active.push(rootId);
    const input = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    await connect("agent-collaboration", rootId, (frames) => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const conversationOf = async (agentRunId: string, address: string) => agentRunId === rootId
      ? (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation
      : (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    const calls = async (content: string) => {
      const before = calledResults(await conversationOf(rootId, "/")).length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: rootId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(rootId, "/")); return results.length > before; },
        `Manager tool result for ${content.slice(0, 120)}`, 60_000);
      return toolResult(results[before]!);
    };
    manager = { rootId, calls, conversationOf };
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const rootId of [...active]) await terminate(rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_COMMENTS_LIVE_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "project-task-comments-live.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), serverClosed: !app?.server.listening, remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  let workerA = "", keyA = "";

  it("CMT-LIVE-001: comments added by the Manager's tool are in the feed and in a new task agent's work, after the description; a Task without comments has no block (AC-010, AC-001, REQ-007)", async () => {
    keyA = (await manager.calls(callTool("create_task", { project_id: projectId, description: "Write the release notes" }))).task.taskId as string;
    const longA = (await task(keyA)).taskId as string;
    // Two calls (the key in upper case, then the long ID): two comments, numbered 1 and 2; the result has no comment field.
    expect(await manager.calls(callTool("update_task", { task_id: keyA.toUpperCase(), add_comment: "  Dispatched with this direction.  " }))).toEqual(ack(keyA, "TODO"));
    expect(await manager.calls(callTool("update_task", { task_id: longA, add_comment: "User decided: ship on Friday." }))).toEqual(ack(keyA, "TODO"));
    const saved = await task(keyA);
    expect(saved.description).toBe("Write the release notes");
    expect(saved.comments.map((c: any) => [c.id, c.text])).toEqual([[1, "Dispatched with this direction."], [2, "User decided: ship on Friday."]]);
    // The feed carries the thread as the app reads it.
    await until(() => upserts(longA).some((t) => t.comments?.length === 2), "feed: task_upserted with both comments", 30_000);
    expect(upserts(longA).at(-1)!.comments).toEqual(saved.comments);

    // A new task agent receives the description, then the "Comments:" block, texts only, oldest first.
    const delegated = await manager.calls(callTool("delegate_task", { recipient_address: workerAddress(), task_id: keyA }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    workerA = delegated.target_agent_run_id as string;
    let texts: string[] = [];
    await until(async () => { texts = await workerTexts(workerA); return texts.some((t) => t.includes("Comments:")); }, "worker A received its work", 60_000);
    const workA = texts.find((t) => t.includes("Description:"))!;
    expect(workA).toContain("Description:\nWrite the release notes\n\nComments:\n- Dispatched with this direction.\n- User decided: ship on Friday.");
    expect(workA).not.toMatch(/#1|#2|\d{4}-\d{2}-\d{2}T/);

    // A Task without comments: the work text has no block.
    const keyB = (await manager.calls(callTool("create_task", { project_id: projectId, description: "Check the changelog links" }))).task.taskId as string;
    const plain = await manager.calls(callTool("delegate_task", { recipient_address: workerAddress(), task_id: keyB }));
    const workerB = plain.target_agent_run_id as string;
    let textsB: string[] = [];
    await until(async () => { textsB = await workerTexts(workerB); return textsB.some((t) => t.includes("Check the changelog links")); }, "worker B received its work", 60_000);
    const workB = textsB.find((t) => t.includes("Description:"))!;
    expect(workB).toContain("Description:\nCheck the changelog links");
    expect(workB).not.toContain("Comments:");
    evidence.newAgent = { keyA, workerA, workA, keyB, workerB, workB };
  }, 300000);

  it("CMT-LIVE-002: DONE + a comment is one write; the same task agent's next Task carries that Task's comments (AC-001, AC-010 existing task agent)", async () => {
    const longA = (await task(keyA)).taskId as string;
    const feedFrom = feedFrames.length;
    const before = await task(keyA);
    expect(await manager.calls(callTool("update_task", { task_id: keyA, status: "DONE", add_comment: "Merged and released." }))).toEqual(ack(keyA, "DONE"));
    const after = await task(keyA);
    expect(after).toMatchObject({ status: "DONE", description: before.description });
    expect(after.comments.map((c: any) => [c.id, c.text])).toEqual([[1, "Dispatched with this direction."], [2, "User decided: ship on Friday."], [3, "Merged and released."]]);
    expect(Date.parse(after.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before.updatedAt));
    // One write: no published view shows the status without the comment, or the comment without the status.
    await until(() => upserts(longA, feedFrom).some((t) => t.status === "DONE"), "feed: DONE published", 30_000);
    const views = upserts(longA, feedFrom);
    expect(views.every((t) => (t.status === "DONE") === (t.comments.length === 3)), JSON.stringify(views.map((t) => [t.status, t.comments.length]))).toBe(true);

    // The task agent whose Task is DONE gets a new Task with comments (existing task agent path).
    const keyC = (await manager.calls(callTool("create_task", { project_id: projectId, description: "Post the release announcement" }))).task.taskId as string;
    await manager.calls(callTool("update_task", { task_id: keyC, add_comment: "Use the beta channel." }));
    await manager.calls(callTool("update_task", { task_id: keyC, add_comment: "Keep it under 200 words." }));
    const assigned = await manager.calls(callTool("delegate_task", { target_agent_run_id: workerA, task_id: keyC }));
    expect(assigned).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: workerA });
    let texts: string[] = [];
    await until(async () => { texts = await workerTexts(workerA); return texts.some((t) => t.includes(`New Task assigned to you: ${keyC}`)); }, "worker A received its next Task", 60_000);
    const workC = texts.find((t) => t.includes(`New Task assigned to you: ${keyC}`))!;
    expect(workC).toContain("Description:\nPost the release announcement\n\nComments:\n- Use the beta channel.\n- Keep it under 200 words.");
    evidence.existingAgent = { keyA, doneViews: views.map((t) => ({ status: t.status, comments: t.comments.length })), keyC, workC };
  }, 300000);

  it("CMT-LIVE-003: a Temp task has no comments: add_comment is refused and nothing is written, not even a combined status (AC-001)", async () => {
    const described = await manager.calls(callTool("delegate_task", { recipient_address: workerAddress(), description: "Reply OK." }));
    const adHocTaskId = AD_HOC_ID.exec(JSON.stringify(described))?.[0] as string;
    expect(adHocTaskId, JSON.stringify(described)).toBeTruthy();
    const adHocDir = path.join(dataDir, "ad-hoc-tasks", adHocTaskId);
    const adHocEntries = async () => (await fs.readdir(adHocDir)).filter((name) => !name.endsWith(".lock")).sort();
    await until(async () => (await adHocEntries()).length === 2, "ad-hoc Task folder settled", 10_000);
    const bytes = await fs.readFile(path.join(adHocDir, "task.json"), "utf8");
    const refused = await manager.calls(callTool("update_task", { task_id: adHocTaskId, add_comment: "A note" }));
    expect(refused).toMatchObject({ isError: true, error: { code: "TASK_COMMENT_INVALID", message: "Only Project Tasks have comments; this Task has no Project." } });
    const combined = await manager.calls(callTool("update_task", { task_id: adHocTaskId, status: "DONE", add_comment: "Done" }));
    expect(combined).toMatchObject({ isError: true, error: { code: "TASK_COMMENT_INVALID" } });
    expect(await fs.readFile(path.join(adHocDir, "task.json"), "utf8")).toBe(bytes);
    expect(JSON.parse(bytes).status).not.toBe("DONE");
    evidence.temp = { adHocTaskId, refused, combined };
  }, 300000);

  it("CMT-LIVE-004: every /ws/projects frame satisfies the strict server schema, and every Project Task view carries its comments", () => {
    const invalid = feedRaw.filter((text) => !ProjectChangeMessageSchema.safeParse(JSON.parse(text)).success);
    expect(invalid).toEqual([]);
    const views = feedFrames.filter((f) => f.type === "task_upserted" && f.task.projectId === projectId).map((f) => f.task);
    expect(views.length).toBeGreaterThan(5);
    expect(views.every((view) => Array.isArray(view.comments))).toBe(true);
    evidence.feed = { frames: feedFrames.length, projectTaskUpserts: views.length };
  });
});
