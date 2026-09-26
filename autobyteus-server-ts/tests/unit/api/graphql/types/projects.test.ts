import "reflect-metadata";
import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectError } from "../../../../../src/projects/domain/project-errors.js";

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

const mockCapabilityService = vi.hoisted(() => ({
  getCapability: vi.fn(),
  setEnabled: vi.fn(),
}));

vi.mock("../../../../../src/projects/services/project-service.js", () => ({
  getProjectService: () => mockProjectService,
}));

vi.mock("../../../../../src/projects/services/projects-capability-service.js", () => ({
  getProjectsCapabilityService: () => mockCapabilityService,
}));

import { ProjectResolver } from "../../../../../src/api/graphql/types/projects.js";
import { ProjectsCapabilityResolver } from "../../../../../src/api/graphql/types/projects-capability.js";

const projectView = {
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
};

describe("ProjectResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps projects and their resolved workspace links", async () => {
    mockProjectService.listProjects.mockResolvedValue([projectView]);

    await expect(new ProjectResolver().projects()).resolves.toEqual([projectView]);
  });

  it("returns null for an unknown project", async () => {
    mockProjectService.getProject.mockResolvedValue(null);

    await expect(new ProjectResolver().project("project_missing")).resolves.toBeNull();
  });

  it("forwards link input to the service", async () => {
    mockProjectService.addWorkspaceLink.mockResolvedValue(projectView);
    const input = { projectId: "project_1", workspaceId: "agent_ws_a", description: "UI" };

    await new ProjectResolver().addProjectWorkspace(input);

    expect(mockProjectService.addWorkspaceLink).toHaveBeenCalledWith(input);
  });

  it("maps ProjectError codes into GraphQL error extensions", async () => {
    mockProjectService.createProject.mockRejectedValue(
      new ProjectError("PROJECT_NAME_TAKEN", "A project named 'x' already exists."),
    );

    const promise = new ProjectResolver().createProject({ name: "x" });
    await expect(promise).rejects.toBeInstanceOf(GraphQLError);
    await promise.catch((error: GraphQLError) => {
      expect(error.extensions.code).toBe("PROJECT_NAME_TAKEN");
      expect(error.message).toBe("A project named 'x' already exists.");
    });
  });

  it("rethrows unexpected errors unchanged", async () => {
    const failure = new Error("disk full");
    mockProjectService.addWorkspaceLink.mockRejectedValue(failure);

    await expect(
      new ProjectResolver().addProjectWorkspace({ projectId: "p", workspaceId: "agent_ws_a" }),
    ).rejects.toBe(failure);
  });

  it("returns the delete result", async () => {
    mockProjectService.deleteProject.mockResolvedValue(false);

    await expect(new ProjectResolver().deleteProject("project_missing")).resolves.toBe(false);
  });
});

describe("ProjectsCapabilityResolver", () => {
  it("returns and sets the projects capability", async () => {
    mockCapabilityService.getCapability.mockResolvedValue({
      enabled: false,
      settingKey: "ENABLE_PROJECTS",
      source: "INITIALIZED_DISABLED",
    });
    mockCapabilityService.setEnabled.mockResolvedValue({
      enabled: true,
      settingKey: "ENABLE_PROJECTS",
      source: "SERVER_SETTING",
    });

    const resolver = new ProjectsCapabilityResolver();
    await expect(resolver.projectsCapability()).resolves.toEqual({
      enabled: false,
      settingKey: "ENABLE_PROJECTS",
      source: "INITIALIZED_DISABLED",
    });
    await expect(resolver.setProjectsEnabled(true)).resolves.toEqual({
      enabled: true,
      settingKey: "ENABLE_PROJECTS",
      source: "SERVER_SETTING",
    });
    expect(mockCapabilityService.setEnabled).toHaveBeenCalledWith(true);
  });
});
