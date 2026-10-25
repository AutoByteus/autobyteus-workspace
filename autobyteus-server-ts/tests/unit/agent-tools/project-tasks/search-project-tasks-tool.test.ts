import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { getProjectService, resetProjectServiceForTests } from "../../../../src/projects/services/project-service.js";
import { getProjectTaskService, resetProjectTaskServiceForTests } from "../../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../../src/projects/context/project-task-context-store.js";
import { initializeProjectTaskSearchService, releaseProjectTaskSearchService } from "../../../../src/projects/search/project-task-search-service.js";
import { SearchProjectTasksTool, registerProjectTaskTools } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { PROJECT_TASK_TOOL_DESCRIPTIONS, buildProjectTaskToolSchema, parseSearchProjectTasksInput } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { createFakeEmbeddingIndex } from "../../../helpers/fake-embedding-model.js";

const provider = new ProjectTaskToolsMcpAdapterProvider();
const mcp = async (args: Record<string, unknown>) => {
  const result = await provider.getAdapters().find((a) => a.definition.name === "search_project_tasks")!.execute({ rawArguments: args, session: {} as never });
  if (result.kind === "mcp_tool_result") return result.result;
  throw new Error("Expected structured domain result.");
};
const native = (args: Record<string, unknown>) => new SearchProjectTasksTool().execute(null, args as never)
  .then((text) => JSON.parse(text as string), (error: Error) => ({ thrown: JSON.parse(error.message) }));
const reset = () => { resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };

describe("search_project_tasks tool", () => {
  let root: string, projectId: string, fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "search-tool-"));
    appConfigProvider.resetForTests(); appConfigProvider.initialize({ appDataDir: root });
    reset();
    registerProjectTaskTools();
    projectId = (await getProjectService().createProject({ name: "Tool search fixture" })).projectId;
    fake = await createFakeEmbeddingIndex();
    initializeProjectTaskSearchService({ listProjects: () => getProjectService().listProjectSummaries(), listTasks: (id) => getProjectTaskService().listTasks(id), index: () => fake.index });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    releaseProjectTaskSearchService();
    await fake.index.shutdown();
    await Promise.all([root, fake.rootDir].map((dir) => fs.rm(dir, { recursive: true, force: true })));
    appConfigProvider.resetForTests(); reset();
  });

  it("describes when to use it instead of list_project_tasks and takes project_id first, then query and an optional limit", () => {
    expect(PROJECT_TASK_TOOL_DESCRIPTIONS.search_project_tasks).toContain("use list_project_tasks when you need every Task");
    expect(buildProjectTaskToolSchema("search_project_tasks").parameters.map((p) => [p.name, p.required])).toEqual([["project_id", true], ["query", true], ["limit", false]]);
  });

  it("is exposed (native and MCP) only to definitions that select it", () => {
    const catalog = new AgentToolMcpCatalog({ providers: [provider] });
    const selected = buildRuntimeAgentToolExposure(["search_project_tasks"]);
    expect(selected.enabledProjectTaskToolNames).toEqual(["search_project_tasks"]);
    expect(catalog.resolveConfiguredSupportedToolNames(selected)).toEqual(["search_project_tasks"]);
    expect(catalog.resolveConfiguredSupportedToolNames(buildRuntimeAgentToolExposure(["list_project_tasks"]))).toEqual(["list_project_tasks"]);
  });

  it("validates its arguments like the other Project tools", async () => {
    for (const [args, message] of [
      [{ project_id: projectId }, "query must be a non-empty string."],
      [{ project_id: projectId, query: "   " }, "query must be a non-empty string."],
      [{ project_id: projectId, query: "docker", limit: 0 }, "limit must be a whole number from 1 to 30."],
      [{ project_id: projectId, query: "docker", limit: 31 }, "limit must be a whole number from 1 to 30."],
      [{ project_id: projectId, query: "docker", limit: "5" }, "limit must be a whole number from 1 to 30."],
      [{ project_id: projectId, query: "docker", status: "TODO" }, "Unsupported tool argument."],
      [{ query: "docker" }, "project_id must be a non-empty string."],
    ] as const) {
      expect(() => parseSearchProjectTasksInput(args)).toThrow(message);
      const result = await mcp(args as Record<string, unknown>);
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toEqual({ error: { code: "PROJECT_TOOL_ARGUMENT_INVALID", message } });
    }
    const unknown = await mcp({ project_id: "project_missing", query: "docker" });
    expect(unknown.structuredContent).toMatchObject({ error: { code: "PROJECT_NOT_FOUND" } });
  });

  it("returns a compact best-first list with keys, statuses, stored titles and match kinds (native and MCP alike)", async () => {
    const tasks = getProjectTaskService();
    // A long title is kept whole (REQ-003): no cut on titles a writer gave.
    const longTitle = "Docker image fails on ARM servers ".repeat(8).trim();
    const first = await tasks.createTask({ projectId, title: longTitle, description: "The image build stops on arm64.\nSecond line." });
    await tasks.createTask({ projectId, title: "Publish the container image to the registry", description: "Publish the container image to the registry" });
    await tasks.createTask({ projectId, title: "Sidebar collapse state is lost", description: "Sidebar collapse state is lost" });
    const result = await native({ project_id: projectId, query: "docker" });
    // The exact tier also matches the title (DEC-018 (1)); meaning search was used, so meaningSearch is absent (REQ-008).
    expect(result).toEqual({
      projectId,
      tasks: [
        { taskId: first.taskKey, status: "TODO", title: longTitle, match: "exact" },
        { taskId: expect.stringMatching(/-\d+$/), status: "TODO", title: "Publish the container image to the registry", match: "meaning" },
      ],
    });
    expect(result.tasks[0].title).toHaveLength(longTitle.length);
    expect(JSON.stringify(result)).not.toMatch(/summary|meaningSearch|null|\[\]/);
    expect((await mcp({ project_id: projectId, query: "docker" })).structuredContent).toEqual(result);
    expect((await native({ project_id: projectId, query: "docker", limit: 1 })).tasks).toHaveLength(1);
  });

  it("states why meaning search was not used and still returns exact matches", async () => {
    await getProjectTaskService().createTask({ projectId, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    vi.spyOn(fake.index, "search").mockResolvedValue({ matches: [], scores: {}, readiness: { state: "unavailable", reason: "Could not reach huggingface.co" } });
    const result = await native({ project_id: projectId, query: "docker" });
    expect(result.tasks).toHaveLength(1);
    expect(result.meaningSearch).toEqual({ state: "unavailable", note: "Meaning search is unavailable (Could not reach huggingface.co); results are exact text matches only." });
    vi.spyOn(fake.index, "search").mockResolvedValue({ matches: [], scores: {}, readiness: { state: "preparing", phase: "indexing", done: 40, total: 170 } });
    expect((await native({ project_id: projectId, query: "docker" })).meaningSearch).toEqual({
      state: "preparing", note: "Meaning search is still preparing (40 of 170 Tasks indexed); Tasks not indexed yet are found by exact text only.",
    });
    expect(fake.index.search).toHaveBeenLastCalledWith(`project-tasks/${projectId}`, expect.any(Array), "docker", expect.objectContaining({ waitForReadyMs: 30_000 }));
  });
});
