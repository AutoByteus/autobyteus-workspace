import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillWorkspace } from "../../../src/workspaces/skill-workspace.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const resetWorkspaceManager = () => {
    WorkspaceManager.instance = null;
};
describe("WorkspaceManager skill integration", () => {
    let manager;
    beforeEach(() => {
        resetWorkspaceManager();
        manager = WorkspaceManager.getInstance();
    });
    afterEach(async () => {
        const workspaces = manager.getAllWorkspaces();
        for (const workspace of workspaces) {
            await workspace.close();
        }
        manager.activeWorkspaces.clear();
        vi.restoreAllMocks();
    });
    it("returns existing workspace from cache", async () => {
        const workspaceId = "existing_id";
        const mockWorkspace = {
            workspaceId,
            close: vi.fn().mockResolvedValue(undefined),
        };
        manager.activeWorkspaces.set(workspaceId, mockWorkspace);
        const result = await manager.getOrCreateWorkspace(workspaceId);
        expect(result).toBe(mockWorkspace);
    });
    it("creates and initializes a SkillWorkspace for skill_ws_ IDs", async () => {
        const skillName = "MySkill";
        const workspaceId = `skill_ws_${skillName}`;
        const mockWorkspace = {
            workspaceId,
            initialize: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
        };
        const createSpy = vi.spyOn(SkillWorkspace, "create").mockResolvedValue(mockWorkspace);
        const result = await manager.getOrCreateWorkspace(workspaceId);
        expect(result).toBe(mockWorkspace);
        expect(createSpy).toHaveBeenCalledWith(skillName);
        expect(mockWorkspace.initialize).toHaveBeenCalledTimes(1);
        const cached = manager
            .activeWorkspaces
            .get(workspaceId);
        expect(cached).toBe(mockWorkspace);
    });
    it("throws for unknown workspace IDs", async () => {
        await expect(manager.getOrCreateWorkspace("unknown_id")).rejects.toThrow("Workspace 'unknown_id' not found");
    });
});
