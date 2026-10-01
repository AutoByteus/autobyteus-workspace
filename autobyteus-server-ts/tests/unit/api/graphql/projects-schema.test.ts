import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { ProjectError } from "../../../../src/projects/domain/project-errors.js";

const mockProjectService = vi.hoisted(() => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  addWorkspaceLink: vi.fn(),
  updateWorkspaceLink: vi.fn(),
  removeWorkspaceLink: vi.fn(),
}));

vi.mock("../../../../src/projects/services/project-service.js", () => ({
  getProjectService: () => mockProjectService,
}));

import { buildGraphqlSchema } from "../../../../src/api/graphql/schema.js";

describe("Projects GraphQL schema", () => {
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

  it("exposes the projects and projects-capability operations", () => {
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    const mutationFields = schema.getMutationType()?.getFields() ?? {};

    expect(Object.keys(queryFields)).toEqual(expect.arrayContaining(["projects", "project", "projectsCapability"]));
    expect(Object.keys(mutationFields)).toEqual(expect.arrayContaining([
      "createProject",
      "updateProject",
      "deleteProject",
      "addProjectWorkspace",
      "updateProjectWorkspace",
      "removeProjectWorkspace",
      "setProjectsEnabled",
    ]));
    expect(queryFields.applicationsCapability).toBeDefined();
    expect(mutationFields.setApplicationsEnabled).toBeDefined();
  });

  it("returns ProjectError codes as GraphQL error extensions", async () => {
    mockProjectService.addWorkspaceLink.mockRejectedValue(
      new ProjectError("WORKSPACE_NOT_REGISTERED", "Workspace 'agent_ws_x' is not a registered workspace."),
    );

    const result = await graphql({
      schema,
      source: `mutation {
        addProjectWorkspace(input: { projectId: "project_1", workspaceId: "agent_ws_x", description: "UI" }) {
          projectId
        }
      }`,
    });

    expect(result.errors?.[0]?.extensions?.code).toBe("WORKSPACE_NOT_REGISTERED");
  });

  it("serializes workspace availability as an enum", async () => {
    mockProjectService.getProject.mockResolvedValue({
      projectId: "project_1",
      name: "autobyteus",
      description: "",
      createdAt: "2026-09-26T00:00:00.000Z",
      updatedAt: "2026-09-26T00:00:00.000Z",
      workspaces: [{
        workspaceId: "agent_ws_a",
        workspaceRootPath: "/work/a",
        displayName: "a",
        description: "UI",
        addedAt: "2026-09-26T00:00:00.000Z",
        availability: "UNREGISTERED",
      }],
    });

    const result = await graphql({
      schema,
      source: `query { project(projectId: "project_1") { name workspaces { workspaceId displayName availability } } }`,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      project: {
        name: "autobyteus",
        workspaces: [{ workspaceId: "agent_ws_a", displayName: "a", availability: "UNREGISTERED" }],
      },
    });
  });
});
