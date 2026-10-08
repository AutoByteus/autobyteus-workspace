import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// project-task-tool-context-files AC-005 (DONE half), AC-007 and AC-010 through the real Studio HTTP/WebSocket
// server, the Manager's scoped Agent Tools MCP session, Project/Task services, a live delegated worker and the
// app-data disk layout. Only the external AGY CLI is scripted: `CALL_TOOL:{...}` makes the agent call that actual
// tool and reply `CALLED:<result>`; `READ_REFERENCE_FILES` makes it open every path listed under "Reference files:"
// in its message and reply `REFERENCES:[{path,size,sha256}]`. No provider inference. One standalone Agent root:
// context-file behavior is owned by the Task service, not the root kind (the sibling suites cover the roots).
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task"];
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
/** Every string in a JSON value, in document order. */
const stringsIn = (value: unknown): string[] => typeof value === "string" ? [value]
  : Array.isArray(value) ? value.flatMap(stringsIn) : value && typeof value === "object" ? Object.values(value).flatMap(stringsIn) : [];
/** The `CALLED:<result>` replies of the scripted actor, in conversation order (one per conversation entry). */
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const found = stringsIn(entry).find((text) => text.includes("CALLED:"));
  return found ? [found.slice(found.indexOf("CALLED:") + "CALLED:".length)] : [];
});
/** The structured tool result inside a `CALLED:` reply (MCP `structuredContent`, else its JSON text content). */
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, ...(raw.isError ? { isError: true } : {}) };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called }; }
};

suite("Agent-attached Task context files reach the worker and never break DONE or ad-hoc Tasks (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", pasted = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: string[] = [];
  const ids = { manager: "", worker: "" };
  let workerName = "";
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

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
    { input: { name, role: "assistant", description: `${name} (Task context files E2E)`, instructions: "Follow the user's request.", toolNames } },
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
  const projectTask = async (projectId: string, taskId: string) => ((await graphql(
    `query($id:String!){projectTasks(projectId:$id){taskId description status contextFiles{storedFilename displayName mimeType sizeBytes locator}}}`,
    { id: projectId })).projectTasks as any[]).find((task) => task.taskId === taskId);
  const taskDir = (projectId: string, taskId: string) => path.join(dataDir, "projects", projectId, "tasks", taskId);

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-context-files-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    // The reported case: pasted screenshots under /private/tmp (macOS), outside the app's data.
    pasted = await fs.mkdtemp(path.join(await fs.stat("/private/tmp").then(() => "/private/tmp", () => os.tmpdir()), "task-context-files-src-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    workerName = `TCF Worker ${suffix}`;
    ids.manager = await agentDefinition(`TCF Manager ${suffix}`, PROJECT_TOOLS);
    ids.worker = await agentDefinition(workerName, []);
  }, 120000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const rootId of [...active]) await terminate(rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    if (pasted) await fs.rm(pasted, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env["TASK_CONTEXT_FILES_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "project-task-context-files-delegation.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true), sourcesRemoved: await fs.access(pasted).then(() => false, () => true),
          serverClosed: !app?.server.listening, remainingRoots: active.length, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120000);

  it("CTX-E2E-003: the Manager attaches files by tool, delegate_task({task_id}) hands the saved copies to a live worker that reads them; DONE with a bad file keeps the run open; ad-hoc Tasks refuse files", async () => {
    const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Task context files ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
    const shot = path.join(pasted, "Screenshot 2026-10-08 at 10.15.32 AM.png");
    const notes = path.join(workspace, "notes.md"), log = path.join(workspace, "server.log.txt"), final = path.join(workspace, "final.md");
    await fs.writeFile(shot, PNG); await fs.writeFile(notes, "# Repro\nThe status dot stays green.\n");
    await fs.writeFile(log, "ERROR status mismatch\n"); await fs.writeFile(final, "Verified.\n");
    const expected = [{ name: path.basename(shot), bytes: PNG }, { name: "notes.md", bytes: await fs.readFile(notes) }, { name: "server.log.txt", bytes: await fs.readFile(log) }];

    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const rootId = created.runId as string;
    active.push(rootId);
    const input = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const view = await connect("agent-collaboration", rootId, (frames) => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const conversationOf = async (agentRunId: string, address: string) => agentRunId === rootId
      ? (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation
      : (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    const managerCalls = async (content: string) => {
      const before = calledResults(await conversationOf(rootId, "/")).length;
      sendE2eSendMessageCommand(input.socket, { agent_run_id: rootId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(rootId, "/")); return results.length > before; },
        `Manager tool result for ${content.slice(0, 120)}`, 60_000);
      return toolResult(results[before]!);
    };
    const closedFrame = (frame: Frame) => frame.type === "ROOT_EXECUTION_EVENT" && frame.payload.event?.kind === "task_executions_closed";
    const workerAddress = `/${segment(workerName)}`;

    // 1. AC-001/AC-002 through the Manager's own MCP session: create with [png, md], then a files-only patch.
    const create = await managerCalls(callTool("create_or_update_task", { project_id: projectId, description: "READ_REFERENCE_FILES", context_files: [shot, notes] }));
    expect(create).toEqual({ task: { projectId, taskId: expect.stringMatching(/^project_task_/), status: "TODO",
      attachedContextFiles: [{ storedFilename: expect.any(String), displayName: path.basename(shot) }, { storedFilename: expect.any(String), displayName: "notes.md" }] } });
    const taskId = create.task.taskId as string;
    const patch = await managerCalls(callTool("create_or_update_task", { task_id: taskId, context_files: [log] }));
    expect(patch).toEqual({ task: { projectId, taskId, status: "TODO", attachedContextFiles: [{ storedFilename: expect.any(String), displayName: "server.log.txt" }] } });
    // AC-006: the sources go away (temp screenshot cleaned up); the Task keeps its copies.
    await fs.rm(shot); await fs.rm(notes); await fs.rm(log);
    const saved = await projectTask(projectId, taskId);
    expect(saved.contextFiles.map((file: any) => [file.displayName, file.mimeType, file.sizeBytes])).toEqual(
      expected.map((file, index) => [file.name, ["image/png", "text/markdown", "text/plain"][index], file.bytes.length]));
    const listed = await managerCalls(callTool("list_project_tasks", { project_id: projectId }));
    const localPaths = (listed.tasks[0].contextFiles as any[]).map((file) => file.localPath as string);
    expect(localPaths).toEqual(saved.contextFiles.map((file: any) => path.join(taskDir(projectId, taskId), "context", file.storedFilename)));

    // 2. AC-010: linked delegation hands the saved copies to the worker, which opens them in its own process.
    const delegated = await managerCalls(callTool("delegate_task", { recipient_address: workerAddress, task_id: taskId }));
    expect(delegated).toMatchObject({ target_kind: "agent" });
    const worker = delegated.target_agent_run_id as string;
    expect(worker).toBeTruthy();
    let workerTexts: string[] = [];
    await until(async () => { workerTexts = stringsIn(await conversationOf(worker, workerAddress)); return workerTexts.some((text) => text.includes("REFERENCES:")); },
      "worker read its reference files", 60_000);
    const firstMessage = workerTexts.find((text) => text.includes("Reference files:"))!;
    expect(firstMessage, JSON.stringify(workerTexts).slice(0, 2000)).toBeTruthy();
    expect(firstMessage).toContain(`Task delegator AgentRun ID: ${rootId}`);
    expect(firstMessage).toContain("Description:\nREAD_REFERENCE_FILES\n\nReference files:");
    expect(firstMessage.slice(firstMessage.indexOf("Reference files:")).trim()).toBe(["Reference files:", ...localPaths.map((file) => `- ${file}`)].join("\n"));
    const reply = workerTexts.find((text) => text.includes("REFERENCES:"))!;
    const read = JSON.parse(reply.slice(reply.indexOf("REFERENCES:") + "REFERENCES:".length));
    expect(read).toEqual(localPaths.map((file, index) => ({ path: file, size: expected[index]!.bytes.length, sha256: sha256(expected[index]!.bytes) })));

    // 3. AC-005 with a live run: DONE plus a missing file fails, changes nothing and closes nothing.
    const resourcesFile = path.join(taskDir(projectId, taskId), "agent_run_resources.json");
    const taskFile = path.join(taskDir(projectId, taskId), "task.json");
    const [resourcesBefore, taskBefore] = await Promise.all([fs.readFile(resourcesFile, "utf8"), fs.readFile(taskFile, "utf8")]);
    expect(JSON.parse(resourcesBefore).agentRunResources.find((entry: any) => entry.agentRun.agentRunId === worker)?.closedAt).toBeNull();
    const framesBefore = view.frames.length;
    const missing = path.join(workspace, "already-deleted.png");
    const badDone = await managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE", context_files: [final, missing] }));
    expect(badDone).toMatchObject({ isError: true, error: { code: "TASK_CONTEXT_FILE_UNAVAILABLE", message: expect.stringContaining(missing) } });
    // The open worker still takes input (a closed one is refused with TASK_AGENT_RESOURCE_CLOSED).
    const stillOpen = await managerCalls(callTool("send_message_to", { target_agent_run_id: worker, content: "Reply OK." }));
    expect(JSON.stringify(stillOpen)).not.toMatch(/TASK_AGENT_RESOURCE_CLOSED|"isError":true/);
    expect(view.frames.slice(framesBefore).some(closedFrame)).toBe(false);
    expect(await fs.readFile(taskFile, "utf8")).toBe(taskBefore);
    expect(JSON.parse(await fs.readFile(resourcesFile, "utf8")).agentRunResources.find((entry: any) => entry.agentRun.agentRunId === worker)?.closedAt).toBeNull();
    expect((await projectTask(projectId, taskId)).status).toBe("TODO");

    // 4. The corrected DONE attaches the file and closes the worker as today (AC-003 alternate).
    const doneFrom = view.frames.length;
    const done = await managerCalls(callTool("create_or_update_task", { task_id: taskId, status: "DONE", context_files: [final] }));
    expect(done).toEqual({ task: { projectId, taskId, status: "DONE", attachedContextFiles: [{ storedFilename: expect.any(String), displayName: "final.md" }] } });
    await until(() => view.frames.slice(doneFrom).some(closedFrame), "live task_executions_closed", 60_000);
    const closedRefs = view.frames.slice(doneFrom).find(closedFrame)!.payload.event.task_executions as any[];
    expect(closedRefs.map((ref) => ref.agentRunId ?? ref.agent_run_id)).toContain(worker);
    const doneTask = await projectTask(projectId, taskId);
    expect(doneTask.status).toBe("DONE");
    expect(doneTask.contextFiles.map((file: any) => file.displayName)).toEqual([...expected.map((file) => file.name), "final.md"]);
    expect(JSON.parse(await fs.readFile(resourcesFile, "utf8")).agentRunResources.find((entry: any) => entry.agentRun.agentRunId === worker)?.closedAt).toEqual(expect.any(String));

    // 5. AC-007: a Task with no Project (from a described delegate_task) refuses files and is unchanged; text/status still patch.
    const described = await managerCalls(callTool("delegate_task", { recipient_address: workerAddress, description: "Reply OK." }));
    const adHocTaskId = AD_HOC_ID.exec(JSON.stringify(described))?.[0] as string;
    expect(adHocTaskId, JSON.stringify(described)).toBeTruthy();
    const adHocDir = path.join(dataDir, "ad-hoc-tasks", adHocTaskId);
    const adHocEntries = async () => (await fs.readdir(adHocDir)).filter((name) => !name.endsWith(".lock")).sort();
    await until(async () => (await adHocEntries()).length === 2, "ad-hoc Task folder settled", 10_000);
    const adHocBefore = await fs.readFile(path.join(adHocDir, "task.json"), "utf8");
    const refused = await managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, description: "Must not change", context_files: [final] }));
    expect(refused).toMatchObject({ isError: true, error: { code: "TASK_CONTEXT_INVALID", message: expect.stringContaining("no Project") } });
    expect(await fs.readFile(path.join(adHocDir, "task.json"), "utf8")).toBe(adHocBefore);
    expect(await adHocEntries()).toEqual(["agent_run_resources.json", "task.json"]);
    const textPatch = await managerCalls(callTool("create_or_update_task", { task_id: adHocTaskId, description: "Patched text", status: "IN_PROGRESS" }));
    expect(textPatch).toEqual({ task: { projectId: null, taskId: adHocTaskId, status: "IN_PROGRESS" } });
    expect(JSON.parse(await fs.readFile(path.join(adHocDir, "task.json"), "utf8"))).toMatchObject({ description: "Patched text", status: "IN_PROGRESS" });
    expect(await fs.readFile(final, "utf8")).toBe("Verified.\n");

    input.socket.close(); view.socket.close();
    await terminate(rootId);
    Object.assign(evidence, { rootId, projectId, taskId, worker, create, patch, localPaths, workerFirstMessage: firstMessage, workerRead: read,
      badDone, stillOpen, done, closedRefs, adHocTaskId, refused, textPatch });
  }, 300000);
});
