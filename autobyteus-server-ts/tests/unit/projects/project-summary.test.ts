import { describe, expect, it } from "vitest";
import type { Project } from "../../../src/projects/domain/models.js";
import { toProjectSummary } from "../../../src/projects/domain/project-summary.js";

describe("toProjectSummary (autobyteus-384)", () => {
  it("keeps the identity, description and linked folders with their descriptions, and nothing internal", () => {
    const project: Project = {
      projectId: "project_1", name: "AutoByteus", description: "The app", createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z", taskKeys: { prefix: "autobyteus", lastNumber: 42 },
      workspaces: [{ workspaceRootPath: "/u/repo", description: "main repo" }, { workspaceRootPath: "/u/agents", description: "" }],
    };
    expect(toProjectSummary(project)).toEqual({
      projectId: "project_1", name: "AutoByteus", description: "The app",
      workspaces: [{ workspaceRootPath: "/u/repo", description: "main repo" }, { workspaceRootPath: "/u/agents", description: "" }],
    });
  });
});
