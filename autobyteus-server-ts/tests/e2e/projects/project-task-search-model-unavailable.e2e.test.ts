/**
 * Project Task search with the real embedding layer (no stand-in index) behind the production transports, when the
 * model host cannot be reached.
 *
 * Purpose: the embedding layer stays untouched by server startup and by Task and Project writes (AC-012, QR-006); on
 * first use with the model host unreachable, search reports preparation and then an unavailable model naming the host,
 * while exact matches, Task writes and the agent tool keep working (AC-011, REQ-010); the model is not retried by
 * itself, and `retryEmbeddingModel` makes the next search try again.
 * Setup: real Studio HTTP/GraphQL, the real composition and the default MCP host over a test-owned app-data folder.
 * Only the network is simulated: `fetch` to huggingface.co fails (first like an offline machine, later with HTTP 404),
 * so no model is downloaded. The gated suite tests/integration/embeddings covers real models.
 * Command (clean environment, see TESTING.md): pnpm -C autobyteus-server-ts exec vitest run
 *   tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts --no-watch
 */
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
import { resetEmbeddingIndexForTests, shutdownEmbeddingIndex } from "../../../src/embeddings/embedding-index.js";
import { resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";

const reset = () => { resetProjectTaskServiceForTests(); resetProjectServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };
const SEARCH = "query($p:String!,$q:String!){searchProjectTasks(projectId:$p,query:$q){matches{taskId match} meaningSearch{state phase done total reason}}}";
type MeaningSearch = { state: string; phase: string | null; done: number | null; total: number | null; reason: string | null };
type SearchResult = { matches: Array<{ taskId: string; match: string }>; meaningSearch: MeaningSearch };
const exists = (target: string) => fs.stat(target).then(() => true, () => false);

describe("Project Task search with the real embedding layer when the model host is unreachable", () => {
  let root: string, origin: string, app: FastifyInstance, authority: ScopedAgentToolMcpSessionAuthority, mcpUrl: string;
  let flags: Record<string, string>;
  const realFetch = globalThis.fetch;
  /** How the simulated network answers requests to the model host. */
  let modelHost: "offline" | "not-found" = "offline";
  const modelHostRequests: string[] = [];

  const gql = async <T>(query: string, variables: Record<string, unknown> = {}) => {
    const response = await realFetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    expect(response.status).toBe(200);
    const body = await response.json() as { data: T; errors?: unknown };
    expect(body.errors).toBeUndefined();
    return body.data;
  };
  const search = async (projectId: string, query: string) => (await gql<{ searchProjectTasks: SearchResult }>(SEARCH, { p: projectId, q: query })).searchProjectTasks;
  const untilSettled = async (projectId: string, query: string): Promise<SearchResult> => {
    for (let i = 0; i < 500; i++) {
      const result = await search(projectId, query);
      if (result.meaningSearch.state !== "PREPARING") return result;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("meaning search stayed in preparation");
  };
  const createTask = async (projectId: string, description: string) => (await gql<{ createProjectTask: { taskId: string; taskKey: string } }>(
    "mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}", { i: { projectId, description } })).createProjectTask;
  const updateTask = async (projectId: string, taskId: string, description: string) => (await gql<{ updateProjectTask: { description: string } }>(
    "mutation($i:UpdateProjectTaskInput!){updateProjectTask(input:$i){description}}", { i: { projectId, taskId, description } })).updateProjectTask;
  const deleteTask = async (projectId: string, taskId: string) => (await gql<{ deleteProjectTask: boolean }>(
    "mutation($i:DeleteProjectTaskInput!){deleteProjectTask(input:$i)}", { i: { projectId, taskId } })).deleteProjectTask;
  const createProject = async (name: string) => (await gql<{ createProject: { projectId: string } }>(
    "mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name } })).createProject.projectId;
  const callTool = async (args: Record<string, unknown>) => {
    const response = await realFetch(mcpUrl, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_project_tasks", arguments: args } }) });
    return (await response.json() as { result: { structuredContent: { tasks: Array<{ taskId: string; match: string }>; meaningSearch: { state: string; note?: string } } } }).result.structuredContent;
  };

  beforeAll(async () => {
    flags = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => (k.startsWith("ENABLE_") || k.startsWith("AUTOBYTEUS_")) && v !== undefined)) as Record<string, string>;
    for (const key of Object.keys(flags)) delete process.env[key];
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-search-unavailable-e2e-"));
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = path.join(root, "temp_workspace");
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    appConfigProvider.resetForTests(); appConfigProvider.config.setCustomAppDataDir(root); reset();
    resetEmbeddingIndexForTests();
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (new URL(url).host !== "huggingface.co") return realFetch(input, init);
      modelHostRequests.push(url);
      if (modelHost === "offline") throw new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo ENOTFOUND huggingface.co"), { code: "ENOTFOUND" }) });
      return new Response("Entry not found", { status: 404 });
    }) as typeof fetch;
    registerProjectTaskTools();
    const started = await startStudioE2eRuntimeServer(); app = started.fastify; origin = started.mainUrl.origin;
    authority = started.agentToolsMcpHost.sessionAuthorities.begin({ scopeIdentity: "project-task-search-unavailable-test" }).complete({
      executionCapabilities: { publishedArtifactPublisher: { publishManyForRun: async () => { throw new Error("Unexpected publication"); } }, applicationAgentTools: null },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const session = authority.runSessions.activateForRun({ owner: { runId: "searcher" }, sender: buildAgentRunMessageSenderContext({ senderRunId: "searcher", senderName: "searcher" }),
      runtimeExposure: buildRuntimeAgentToolExposure(["search_project_tasks"]) });
    if (session.kind !== "active") throw new Error("search session absent");
    mcpUrl = session.descriptor.serverUrl;
  }, 120000);
  afterAll(async () => {
    authority?.close(); if (app) await app.close(); await shutdownEmbeddingIndex(); reset(); resetEmbeddingIndexForTests(); appConfigProvider.resetForTests();
    globalThis.fetch = realFetch;
    for (const key of Object.keys(process.env)) if (key.startsWith("ENABLE_") || key.startsWith("AUTOBYTEUS_")) delete process.env[key];
    Object.assign(process.env, flags);
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  it("leaves the embedding layer untouched through startup and Task and Project writes (AC-012, QR-006)", async () => {
    const embeddingsDir = path.join(root, "embeddings");
    expect(await exists(embeddingsDir)).toBe(false);
    const other = await createProject("Writes only");
    const task = await createTask(other, "Docker image fails on ARM servers");
    expect((await updateTask(other, task.taskId, "Docker image fails on ARM64 servers")).description).toBe("Docker image fails on ARM64 servers");
    expect(await deleteTask(other, (await createTask(other, "Throwaway Task")).taskId)).toBe(true);
    expect((await gql<{ deleteProject: boolean }>("mutation($id:String!){deleteProject(projectId:$id)}", { id: other })).deleteProject).toBe(true);
    expect(await exists(embeddingsDir)).toBe(false);
    expect(modelHostRequests).toEqual([]);
  });

  it("keeps exact matches and Task writes working while the model cannot be downloaded, explains why, and tries again only after Retry (AC-011)", async () => {
    const projectId = await createProject("Offline search");
    const docker = await createTask(projectId, "Docker image fails on ARM servers");
    const sidebar = await createTask(projectId, "Sidebar collapse state is lost after restart");

    // First use: exact matches at once while the model is being obtained.
    const first = await search(projectId, "docker");
    expect(first.matches).toEqual([{ taskId: docker.taskId, match: "EXACT" }]);
    expect(first.meaningSearch).toMatchObject({ state: "PREPARING", phase: "DOWNLOADING", done: 0 });
    expect(first.meaningSearch.total).toBeGreaterThan(0);

    // The download fails: unavailable with the reason, exact matches still shown, no meaning-only match.
    const offline = await untilSettled(projectId, "docker");
    expect(offline.matches).toEqual([{ taskId: docker.taskId, match: "EXACT" }]);
    expect(offline.meaningSearch.state).toBe("UNAVAILABLE");
    expect(offline.meaningSearch.reason).toContain("Could not reach huggingface.co");
    expect(await search(projectId, "the folded navigation panel")).toMatchObject({ matches: [], meaningSearch: { state: "UNAVAILABLE" } });

    // Nothing retries by itself: more searches send no request to the model host.
    const requestsAfterFailure = modelHostRequests.length;
    expect(requestsAfterFailure).toBeGreaterThan(0);
    await search(projectId, "sidebar");
    await search(projectId, "restart");
    expect(modelHostRequests.length).toBe(requestsAfterFailure);

    // Task management is unaffected, and searches follow it.
    const created = await createTask(projectId, "Terminal output disappears when switching tabs");
    expect((await search(projectId, "terminal output")).matches).toEqual([{ taskId: created.taskId, match: "EXACT" }]);
    expect((await updateTask(projectId, sidebar.taskId, "Sidebar width resets after restart")).description).toBe("Sidebar width resets after restart");
    expect((await search(projectId, "sidebar width")).matches).toEqual([{ taskId: sidebar.taskId, match: "EXACT" }]);
    expect(await deleteTask(projectId, created.taskId)).toBe(true);
    expect((await search(projectId, "terminal output")).matches).toEqual([]);

    // The agent tool states that meaning search is unavailable and why, and still returns exact matches.
    const tool = await callTool({ project_id: projectId, query: "docker" });
    expect(tool.tasks).toEqual([expect.objectContaining({ match: "exact" })]);
    expect(tool.meaningSearch.state).toBe("unavailable");
    expect(tool.meaningSearch.note).toContain("Could not reach huggingface.co");
    expect(tool.meaningSearch.note).toContain("exact text matches only");

    // Retry: the next search tries again (here the host now answers 404, a different reason).
    modelHost = "not-found";
    expect((await gql<{ retryEmbeddingModel: boolean }>("mutation{retryEmbeddingModel}")).retryEmbeddingModel).toBe(true);
    const retried = await untilSettled(projectId, "docker");
    expect(modelHostRequests.length).toBeGreaterThan(requestsAfterFailure);
    expect(retried.matches).toEqual([{ taskId: docker.taskId, match: "EXACT" }]);
    expect(retried.meaningSearch.state).toBe("UNAVAILABLE");
    expect(retried.meaningSearch.reason).toContain("from huggingface.co failed (HTTP 404)");

    // A failed download leaves no partial file behind.
    const modelDir = path.join(root, "embeddings", "models", "mdbr-leaf-ir");
    const leftovers = await fs.readdir(modelDir, { recursive: true }).catch(() => [] as string[]);
    expect(leftovers.filter((name) => String(name).endsWith(".part"))).toEqual([]);
  });
});
