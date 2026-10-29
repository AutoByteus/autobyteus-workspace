import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { registerProjectTaskTools } from "../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { resetEmbeddingIndexForTests } from "../../../src/embeddings/embedding-index.js";
import { resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";

// Real Studio HTTP (GraphQL), the real composition (search service, delete hooks) and the default MCP host, over
// test-owned files. Only the embedding model is a deterministic stand-in (tests/helpers/fake-embedding-model.ts),
// so no model is downloaded; the gated integration suite covers the real models.
const reset = () => { resetProjectTaskServiceForTests(); resetProjectServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };
const SEARCH = "query($p:String!,$q:String!){searchProjectTasks(projectId:$p,query:$q){matches{taskId match} meaningSearch{state phase done total reason}}}";
type SearchResult = { matches: Array<{ taskId: string; match: string }>; meaningSearch: { state: string; phase: string | null; done: number | null; total: number | null; reason: string | null } };

describe("Project Task search over the production HTTP and MCP boundaries", () => {
  let root: string, origin: string, app: FastifyInstance, authority: ScopedAgentToolMcpSessionAuthority, mcpUrl: string;
  let flags: Record<string, string>;
  let fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<{ data: T; errors?: Array<{ message: string; extensions?: { code?: string } }> }> => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    expect(response.status).toBe(200);
    return await response.json() as { data: T };
  };
  const ok = async <T>(query: string, variables: Record<string, unknown> = {}) => {
    const body = await gql<T>(query, variables);
    expect(body.errors).toBeUndefined();
    return body.data;
  };
  const search = async (projectId: string, query: string) => (await ok<{ searchProjectTasks: SearchResult }>(SEARCH, { p: projectId, q: query })).searchProjectTasks;
  const untilReady = async (projectId: string) => {
    for (let i = 0; i < 400; i++) {
      if ((await search(projectId, "docker")).meaningSearch.state === "READY") return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("meaning search never became ready");
  };
  // autobyteus-260: a Project Task has a title (by default here its one-line description).
  const createTask = async (projectId: string, description: string, title = description) => (await ok<{ createProjectTask: { taskId: string; taskKey: string } }>(
    "mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}", { i: { projectId, title, description } })).createProjectTask;

  beforeAll(async () => {
    flags = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => (k.startsWith("ENABLE_") || k.startsWith("AUTOBYTEUS_")) && v !== undefined)) as Record<string, string>;
    for (const key of Object.keys(flags)) delete process.env[key];
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-search-e2e-"));
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = path.join(root, "temp_workspace");
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    appConfigProvider.resetForTests(); appConfigProvider.config.setCustomAppDataDir(root); reset();
    fake = await createFakeEmbeddingIndex({ rootDir: path.join(root, "embeddings") });
    resetEmbeddingIndexForTests(fake.index);
    registerProjectTaskTools();
    const started = await startStudioE2eRuntimeServer(); app = started.fastify; origin = started.mainUrl.origin;
    authority = started.agentToolsMcpHost.sessionAuthorities.begin({ scopeIdentity: "project-task-search-test" }).complete({
      executionCapabilities: { publishedArtifactPublisher: { publishManyForRun: async () => { throw new Error("Unexpected publication"); } }, applicationAgentTools: null },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const session = authority.runSessions.activateForRun({ owner: { runId: "searcher" }, sender: buildAgentRunMessageSenderContext({ senderRunId: "searcher", senderName: "searcher" }),
      runtimeExposure: buildRuntimeAgentToolExposure(["search_project_tasks"]) });
    if (session.kind !== "active") throw new Error("search session absent");
    mcpUrl = session.descriptor.serverUrl;
  }, 120000);
  afterAll(async () => {
    authority?.close(); if (app) await app.close(); reset(); resetEmbeddingIndexForTests(); appConfigProvider.resetForTests();
    for (const key of Object.keys(process.env)) if (key.startsWith("ENABLE_") || key.startsWith("AUTOBYTEUS_")) delete process.env[key];
    Object.assign(process.env, flags);
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  it("answers exact matches at once, reports preparation, then adds meaning matches without a new query text", async () => {
    const projectId = (await ok<{ createProject: { projectId: string } }>("mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name: "Search E2E" } })).createProject.projectId;
    const docker = await createTask(projectId, "Docker image fails on ARM servers", "Container build is broken on ARM");
    const sidebar = await createTask(projectId, "Sidebar collapse state is lost after restart", "Sidebar forgets that it was folded");
    const first = await search(projectId, "docker");
    expect(first.matches).toEqual([{ taskId: docker.taskId, match: "EXACT" }]);
    expect(first.meaningSearch.state).toBe("PREPARING");
    // DEC-018 (1): the exact tier also matches the title, so a word shown on a card finds its Task.
    expect((await search(projectId, "container build")).matches).toEqual([{ taskId: docker.taskId, match: "EXACT" }]);
    await untilReady(projectId);
    expect((await search(projectId, "the folded navigation panel")).matches).toEqual([{ taskId: sidebar.taskId, match: "MEANING" }]);
    expect((await search(projectId, "recipe for banana bread")).matches).toEqual([]);

    // An agent gets the same search with Task keys and statuses over MCP.
    const response = await fetch(mcpUrl, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_project_tasks", arguments: { project_id: projectId, query: "folded navigation panel" } } }) });
    const body = await response.json() as { result: { content: Array<{ text: string }>; structuredContent: unknown } };
    const tool = body.result.structuredContent;
    // REQ-008: each hit carries the Task's title; meaningSearch is left out when meaning search was used; no empty field.
    expect(tool).toEqual({ projectId, tasks: [{ taskId: sidebar.taskKey, status: "TODO", title: "Sidebar forgets that it was folded", match: "meaning" }] });
    expect(body.result.content[0]!.text).toBe(JSON.stringify(tool));

    // Deleting a Task removes it at once, and a deleted Project's search fails like any Project read.
    expect((await ok<{ deleteProjectTask: boolean }>("mutation($i:DeleteProjectTaskInput!){deleteProjectTask(input:$i)}", { i: { projectId, taskId: sidebar.taskId } })).deleteProjectTask).toBe(true);
    expect((await search(projectId, "the folded navigation panel")).matches).toEqual([]);
    expect((await ok<{ deleteProject: boolean }>("mutation($id:String!){deleteProject(projectId:$id)}", { id: projectId })).deleteProject).toBe(true);
    const gone = await gql(SEARCH, { p: projectId, q: "docker" });
    expect(gone.errors?.[0]?.extensions?.code).toBe("PROJECT_NOT_FOUND");
    const rows = await fs.readdir(path.join(root, "embeddings"));
    expect(rows).toContain("embeddings.sqlite");
  });

  // task-part-of AC-015: search results name each result's parent and parts by key (parts in numeric key order), from the whole Project.
  it("POF-SEARCH-001: search_project_tasks shows partOf and parts by key, parts in numeric key order, no long Task ID", async () => {
    const projectId = (await ok<{ createProject: { projectId: string } }>("mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name: "Search Parts" } })).createProject.projectId;
    const createWith = async (description: string, partOfTaskId?: string) => (await ok<{ createProjectTask: { taskId: string; taskKey: string } }>(
      "mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}", { i: { projectId, title: description, description, ...(partOfTaskId ? { partOfTaskId } : {}) } })).createProjectTask;
    const parent = await createWith("Release pipeline overhaul");
    const tasks = [parent];
    for (let index = 2; index <= 11; index += 1) {
      // Parts at keys 2 and 11 (numeric order puts 2 first; text order would put 11 first); fillers in between.
      const isPart = index === 2 || index === 11;
      tasks.push(await createWith(isPart ? `Release pipeline slice ${index}` : `Unrelated filler ${index}`, isPart ? parent.taskId : undefined));
    }
    expect(tasks.map((task) => task.taskKey).at(-1)).toBe("search-parts-11");
    await untilReady(projectId);
    const response = await fetch(mcpUrl, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_project_tasks", arguments: { project_id: projectId, query: "release pipeline", limit: 30 } } }) });
    const result = (await response.json() as { result: { structuredContent: { tasks: Array<{ taskId: string; partOf?: string; parts?: string[]; match: string }> } } }).result.structuredContent;
    // No partOf without a parent and no parts without parts (REQ-001): absent reads as none.
    expect(result.tasks.every((task) => task.partOf !== null && !(Array.isArray(task.parts) && task.parts.length === 0))).toBe(true);
    const byKey = Object.fromEntries(result.tasks.filter((task) => task.match === "exact").map((task) => [task.taskId, { partOf: task.partOf ?? null, parts: task.parts ?? [] }]));
    expect(byKey).toEqual({
      "search-parts-1": { partOf: null, parts: ["search-parts-2", "search-parts-11"] },
      "search-parts-2": { partOf: "search-parts-1", parts: [] },
      "search-parts-11": { partOf: "search-parts-1", parts: [] },
    });
    expect(JSON.stringify(result)).not.toContain("project_task_");
  });

  // task-comments AC-005 / AC-016 (server rule, DEC-025): the exact tier, shared by the board's search (GraphQL) and
  // search_project_tasks, also matches comment text; the tool shows commentCount only when a Task has comments.
  it("CMT-SEARCH-001: a word only in a comment finds its Task as an exact match, on the board's query and the tool; commentCount only when > 0", async () => {
    const projectId = (await ok<{ createProject: { projectId: string } }>("mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name: "Search Comments" } })).createProject.projectId;
    const commented = await createTask(projectId, "Release notes for 1.5.6");
    const described = await createTask(projectId, "Draw the Quokka mascot for the welcome screen");
    await createTask(projectId, "Fix the sidebar collapse state");
    const comment = async (taskId: string, text: string) => ok("mutation($i:AddProjectTaskCommentInput!){addProjectTaskComment(input:$i){taskId}}", { i: { projectId, taskId, text } });
    await comment(commented.taskId, "User decided: mention the quokka mascot.");
    await comment(commented.taskId, "Keep it under 200 words.");
    // The board's query answers at once from the exact tier, case-insensitively, before meaning search is ready.
    for (const query of ["quokka", "QUOKKA mascot"]) {
      const board = await search(projectId, query);
      expect(board.matches.filter((m) => m.match === "EXACT").map((m) => m.taskId).sort(), query).toEqual([commented.taskId, described.taskId].sort());
    }
    expect((await search(projectId, "under 200 words")).matches.filter((m) => m.match === "EXACT").map((m) => m.taskId)).toEqual([commented.taskId]);
    await untilReady(projectId);
    const response = await fetch(mcpUrl, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_project_tasks", arguments: { project_id: projectId, query: "quokka" } } }) });
    const tool = (await response.json() as { result: { structuredContent: { tasks: Array<Record<string, unknown> & { taskId: string; match: string }> } } }).result.structuredContent;
    const exact = Object.fromEntries(tool.tasks.filter((t) => t.match === "exact").map((t) => [t.taskId, t]));
    expect(exact[commented.taskKey]).toMatchObject({ status: "TODO", title: "Release notes for 1.5.6", match: "exact", commentCount: 2 });
    expect(exact[commented.taskKey]).not.toHaveProperty("summary");
    expect(exact[described.taskKey]).toMatchObject({ match: "exact" });
    expect(Object.hasOwn(exact[described.taskKey]!, "commentCount")).toBe(false);
    expect(JSON.stringify(tool)).not.toContain("User decided");
  });

  it("validates the active-model setting and offers Retry only for an unavailable model", async () => {
    const update = async (value: string) => (await ok<{ updateServerSetting: string }>(
      "mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}", { k: "AUTOBYTEUS_EMBEDDING_MODEL", v: value })).updateServerSetting;
    expect(await update("not-a-model")).toContain("Embedding model must be blank (default) or one of: granite-embedding-small-english-r2, mdbr-leaf-ir, embeddinggemma-2.");
    expect(await update("granite-embedding-small-english-r2")).toContain("updated successfully");
    expect((await ok<{ retryEmbeddingModel: boolean }>("mutation{retryEmbeddingModel}")).retryEmbeddingModel).toBe(false);
  });
});
