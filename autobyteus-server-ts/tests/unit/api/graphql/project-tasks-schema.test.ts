import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { ProjectError } from "../../../../src/projects/domain/project-errors.js";

const mockProjectService = vi.hoisted(() => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));

const mockProjectTaskService = vi.hoisted(() => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("../../../../src/projects/services/project-service.js", () => ({
  getProjectService: () => mockProjectService,
}));

vi.mock("../../../../src/projects/services/project-task-service.js", () => ({
  getProjectTaskService: () => mockProjectTaskService,
}));

import { buildGraphqlSchema } from "../../../../src/api/graphql/schema.js";

const taskView = {
  taskId: "project_task_1",
  projectId: "project_1",
  description: "Write release notes for 1.4.87\nInclude Projects and Tasks",
  status: "TODO",
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
};

describe("Project Tasks GraphQL schema", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes Task list/create/update/delete, and no status mutation", () => {
    const queryFields = Object.keys(schema.getQueryType()?.getFields() ?? {});
    const mutationFields = Object.keys(schema.getMutationType()?.getFields() ?? {});

    expect(queryFields).toContain("projectTasks");
    expect(mutationFields).toEqual(expect.arrayContaining(["createProjectTask", "updateProjectTask", "deleteProjectTask"]));
    expect(mutationFields.filter((name) => /projecttask/i.test(name) && /status/i.test(name))).toEqual([]);
    const updateInput = schema.getType("UpdateProjectTaskInput") as { getFields(): Record<string, unknown> };
    expect(Object.keys(updateInput.getFields()).sort()).toEqual(["contextChanges", "description", "projectId", "taskId"]);
  });

  it("names Task types distinctly from delegated tasks (REQ-012)", () => {
    const typeNames = Object.keys(schema.getTypeMap());
    expect(typeNames).toEqual(expect.arrayContaining(["ProjectTask", "ProjectTaskStatus"]));
    expect(typeNames).not.toContain("Task");
    expect(typeNames).not.toContain("TaskStatus");
  });

  it("returns a Project's Tasks with status as an enum", async () => {
    mockProjectTaskService.listTasks.mockResolvedValue([taskView]);

    const result = await graphql({
      schema,
      source: `query { projectTasks(projectId: "project_1") { taskId projectId description status createdAt updatedAt } }`,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ projectTasks: [taskView] });
    expect(mockProjectTaskService.listTasks).toHaveBeenCalledWith("project_1");
  });

  it("forwards create, update and delete inputs", async () => {
    mockProjectTaskService.createTask.mockResolvedValue(taskView);
    mockProjectTaskService.updateTask.mockResolvedValue({ ...taskView, description: "edited" });
    mockProjectTaskService.deleteTask.mockResolvedValue(true);

    const result = await graphql({
      schema,
      source: `mutation {
        created: createProjectTask(input: { projectId: "project_1", description: "d" }) { taskId status }
        updated: updateProjectTask(input: { projectId: "project_1", taskId: "project_task_1", description: "edited" }) { description }
        deleted: deleteProjectTask(input: { projectId: "project_1", taskId: "project_task_1" })
      }`,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      created: { taskId: "project_task_1", status: "TODO" },
      updated: { description: "edited" },
      deleted: true,
    });
    expect(mockProjectTaskService.createTask).toHaveBeenCalledWith(expect.objectContaining({ projectId: "project_1", description: "d" }));
    expect(mockProjectTaskService.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project_1", taskId: "project_task_1", description: "edited" }),
    );
    expect(mockProjectTaskService.deleteTask).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project_1", taskId: "project_task_1" }),
    );
  });

  it.each([
    ["TASK_DESCRIPTION_REQUIRED"],
    ["TASK_NOT_FOUND"],
    ["PROJECT_NOT_FOUND"],
  ] as const)("maps %s into GraphQL error extensions", async (code) => {
    mockProjectTaskService.updateTask.mockRejectedValue(new ProjectError(code, "failed"));

    const result = await graphql({
      schema,
      source: `mutation { updateProjectTask(input: { projectId: "p", taskId: "t", description: "" }) { taskId } }`,
    });

    expect(result.errors?.[0]?.extensions?.code).toBe(code);
  });

  it("serializes Project.openTaskCount", async () => {
    mockProjectService.listProjects.mockResolvedValue([{
      projectId: "project_1",
      name: "autobyteus",
      description: "",
      createdAt: "2026-09-26T00:00:00.000Z",
      updatedAt: "2026-09-26T00:00:00.000Z",
      workspaces: [],
      openTaskCount: 4,
    }]);

    const result = await graphql({ schema, source: `query { projects { projectId openTaskCount } }` });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ projects: [{ projectId: "project_1", openTaskCount: 4 }] });
  });
});
