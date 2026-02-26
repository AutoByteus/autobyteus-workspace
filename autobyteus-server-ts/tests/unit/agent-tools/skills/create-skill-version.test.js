import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillVersion } from "../../../../src/skills/domain/skill-version.js";
const mockSkillService = {
    getSkill: vi.fn(),
};
const mockVersioningService = {
    isVersioned: vi.fn(),
    createVersion: vi.fn(),
    listVersions: vi.fn(),
};
vi.mock("../../../../src/skills/services/skill-service.js", () => ({
    SkillService: {
        getInstance: () => mockSkillService,
    },
}));
vi.mock("../../../../src/skills/services/skill-versioning-service.js", () => ({
    SkillVersioningService: {
        getInstance: () => mockVersioningService,
    },
}));
import { registerCreateSkillVersionTool } from "../../../../src/agent-tools/skills/create-skill-version.js";
describe("createSkillVersionTool", () => {
    beforeEach(() => {
        mockSkillService.getSkill.mockReset();
        mockVersioningService.isVersioned.mockReset();
        mockVersioningService.createVersion.mockReset();
        mockVersioningService.listVersions.mockReset();
    });
    it("creates a skill version", async () => {
        mockSkillService.getSkill.mockReturnValue({
            name: "test-skill",
            rootPath: "/path/to/skill",
        });
        mockVersioningService.isVersioned.mockReturnValue(true);
        mockVersioningService.createVersion.mockReturnValue(new SkillVersion({
            tag: "1.0.0",
            commitHash: "abc1234",
            message: "init",
            createdAt: new Date(),
            isActive: true,
        }));
        const tool = registerCreateSkillVersionTool();
        const result = await tool.execute({ agentId: "test-agent" }, {
            skill_name: "test-skill",
            version_tag: "1.0.0",
            message: "Initialize",
        });
        expect(result).toContain("Success");
        expect(result).toContain("1.0.0");
        expect(mockVersioningService.createVersion).toHaveBeenCalledWith("/path/to/skill", "1.0.0", "Initialize");
    });
    it("throws when skill is not found", async () => {
        mockSkillService.getSkill.mockReturnValue(null);
        const tool = registerCreateSkillVersionTool();
        await expect(tool.execute({ agentId: "test-agent" }, {
            skill_name: "unknown",
            version_tag: "1.0.0",
            message: "msg",
        })).rejects.toThrow("not found");
    });
    it("throws when skill is not versioned", async () => {
        mockSkillService.getSkill.mockReturnValue({
            name: "test-skill",
            rootPath: "/path/to/skill",
        });
        mockVersioningService.isVersioned.mockReturnValue(false);
        const tool = registerCreateSkillVersionTool();
        await expect(tool.execute({ agentId: "test-agent" }, {
            skill_name: "test-skill",
            version_tag: "1.0.0",
            message: "msg",
        })).rejects.toThrow("not versioned");
    });
    it("throws with existing versions when tag already exists", async () => {
        mockSkillService.getSkill.mockReturnValue({
            name: "test-skill",
            rootPath: "/path/to/skill",
        });
        mockVersioningService.isVersioned.mockReturnValue(true);
        mockVersioningService.createVersion.mockImplementation(() => {
            throw new Error("Tag '1.0.0' already exists");
        });
        mockVersioningService.listVersions.mockReturnValue([
            new SkillVersion({
                tag: "1.0.0",
                commitHash: "hash",
                message: "msg",
                createdAt: new Date(),
                isActive: true,
            }),
        ]);
        const tool = registerCreateSkillVersionTool();
        await expect(tool.execute({ agentId: "test-agent" }, {
            skill_name: "test-skill",
            version_tag: "1.0.0",
            message: "msg",
        })).rejects.toThrow(/Existing versions: 1.0.0/);
    });
});
