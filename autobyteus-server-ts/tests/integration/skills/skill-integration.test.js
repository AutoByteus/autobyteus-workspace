import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkillService } from "../../../src/skills/services/skill-service.js";
describe("SkillService integration", () => {
    let tempDir;
    let service;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-int-"));
        fs.mkdirSync(path.join(tempDir, "skills"), { recursive: true });
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const mockRepoPath = path.resolve(currentDir, "data", "anthropic-skills-mock");
        const config = {
            getSkillsDir: () => path.join(tempDir, "skills"),
            getAdditionalSkillsDirs: () => [mockRepoPath],
            getAppDataDir: () => tempDir,
            get: (_key, defaultValue) => defaultValue,
        };
        service = new SkillService({ config });
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    it("discovers nested skills in a skills subdirectory", () => {
        const skills = service.listSkills();
        const names = skills.map((skill) => skill.name);
        expect(names).toContain("nested_skill");
        const skill = service.getSkill("nested_skill");
        expect(skill).not.toBeNull();
        expect(skill?.description).toBe("A skill located in a nested skills directory for integration testing");
        expect(skill?.content).toContain("Nested Skill");
    });
});
