import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSystemWorkspace } from "../../../src/workspaces/filesystem-workspace.js";
import { SkillWorkspace } from "../../../src/workspaces/skill-workspace.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

const resetWorkspaceManager = () => {
  (WorkspaceManager as unknown as { instance: WorkspaceManager | null }).instance = null;
};

describe("WorkspaceManager skill integration", () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    resetWorkspaceManager();
    manager = WorkspaceManager.getInstance();
  });

  afterEach(async () => {
    const workspaces = manager.getAllWorkspaces();
    for (const workspace of workspaces) {
      await workspace.close();
    }
    (manager as unknown as { activeWorkspaces: Map<string, FileSystemWorkspace> }).activeWorkspaces.clear();
    vi.restoreAllMocks();
  });

  it("returns existing workspace from cache", async () => {
    const workspaceId = "existing_id";
    const mockWorkspace = {
      workspaceId,
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as FileSystemWorkspace;

    (manager as unknown as { activeWorkspaces: Map<string, FileSystemWorkspace> }).activeWorkspaces.set(
      workspaceId,
      mockWorkspace,
    );

    const result = await manager.getOrCreateWorkspace(workspaceId);

    expect(result).toBe(mockWorkspace);
  });

  it("creates and caches a SkillWorkspace for skill_ws_ IDs", async () => {
    const skillName = "MySkill";
    const workspaceId = `skill_ws_${skillName}`;

    // SkillWorkspace.create returns a ready workspace; initialize() is metadata-only
    // and the manager does not call it, so the double has none.
    const mockWorkspace = {
      workspaceId,
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as FileSystemWorkspace;

    const createSpy = vi.spyOn(SkillWorkspace, "create").mockResolvedValue(mockWorkspace as any);

    const result = await manager.getOrCreateWorkspace(workspaceId);

    expect(result).toBe(mockWorkspace);
    expect(createSpy).toHaveBeenCalledExactlyOnceWith(skillName);

    const cached = (manager as unknown as { activeWorkspaces: Map<string, FileSystemWorkspace> })
      .activeWorkspaces
      .get(workspaceId);
    expect(cached).toBe(mockWorkspace);
  });

  it("throws for unknown workspace IDs", async () => {
    await expect(manager.getOrCreateWorkspace("unknown_id")).rejects.toThrow(
      "Workspace 'unknown_id' not found",
    );
  });
});
