import { describe, it, expect } from "vitest";
import { Skill } from "../../../../src/skills/domain/models.js";
describe("Skill model", () => {
    it("creates skill with required fields", () => {
        const skill = new Skill({
            name: "test_skill",
            description: "A test skill",
            content: "# Test Skill\n\nThis is a test.",
            rootPath: "/path/to/skills/test_skill",
        });
        expect(skill.name).toBe("test_skill");
        expect(skill.description).toBe("A test skill");
        expect(skill.content).toBe("# Test Skill\n\nThis is a test.");
        expect(skill.rootPath).toBe("/path/to/skills/test_skill");
        expect(skill.fileCount).toBe(0);
        expect(skill.createdAt).toBeNull();
        expect(skill.updatedAt).toBeNull();
    });
    it("creates skill with optional fields", () => {
        const now = new Date();
        const skill = new Skill({
            name: "full_skill",
            description: "A complete skill",
            content: "Content",
            rootPath: "/path/to/skills/full_skill",
            fileCount: 5,
            createdAt: now,
            updatedAt: now,
        });
        expect(skill.name).toBe("full_skill");
        expect(skill.fileCount).toBe(5);
        expect(skill.createdAt).toBe(now);
        expect(skill.updatedAt).toBe(now);
    });
});
