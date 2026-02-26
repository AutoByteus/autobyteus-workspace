import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { SkillVersion } from "../../../../src/skills/domain/skill-version.js";
const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-service-"));
const writeSkill = (root, name, description, content) => {
    const skillDir = path.join(root, name);
    fs.mkdirSync(skillDir, { recursive: true });
    const skillMd = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}\n`;
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd, "utf-8");
    return skillDir;
};
describe("SkillService", () => {
    let tempRoot;
    let skillsDir;
    let service;
    let additionalDirs;
    let versioningService;
    beforeEach(() => {
        tempRoot = createTempRoot();
        skillsDir = path.join(tempRoot, "skills");
        fs.mkdirSync(skillsDir, { recursive: true });
        additionalDirs = [];
        versioningService = {
            initializeVersioning: vi.fn(() => new SkillVersion({
                tag: "0.1.0",
                commitHash: "abc1234",
                message: "init",
                createdAt: new Date(),
                isActive: true,
            })),
        };
        const config = {
            getSkillsDir: () => skillsDir,
            getAdditionalSkillsDirs: () => additionalDirs,
            getAppDataDir: () => tempRoot,
            get: (_key, defaultValue = "") => defaultValue,
        };
        service = new SkillService({ config, versioningService: versioningService });
    });
    afterEach(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });
    it("lists no skills in an empty directory", () => {
        expect(service.listSkills()).toEqual([]);
    });
    it("creates and retrieves a skill", () => {
        const skill = service.createSkill("test_skill", "A test skill", "# Test Skill\n\nThis is a test.");
        expect(skill.name).toBe("test_skill");
        expect(skill.description).toBe("A test skill");
        expect(skill.content).toBe("# Test Skill\n\nThis is a test.");
        expect(skill.fileCount).toBe(1);
        expect(versioningService.initializeVersioning).toHaveBeenCalledWith(path.join(skillsDir, "test_skill"));
        const retrieved = service.getSkill("test_skill");
        expect(retrieved?.name).toBe("test_skill");
    });
    it("lists multiple skills sorted", () => {
        service.createSkill("skill_a", "First", "Content A");
        service.createSkill("skill_b", "Second", "Content B");
        service.createSkill("skill_c", "Third", "Content C");
        const skills = service.listSkills();
        expect(skills).toHaveLength(3);
        expect(skills.map((skill) => skill.name)).toEqual(["skill_a", "skill_b", "skill_c"]);
    });
    it("rejects invalid skill names", () => {
        expect(() => service.createSkill("invalid name!", "desc", "content")).toThrow("Invalid skill name");
    });
    it("rejects duplicate skill creation", () => {
        service.createSkill("duplicate", "First", "Content");
        expect(() => service.createSkill("duplicate", "Second", "Different")).toThrow("already exists");
    });
    it("returns null for missing skills", () => {
        expect(service.getSkill("nonexistent")).toBeNull();
    });
    it("enables versioning for existing skills", () => {
        writeSkill(skillsDir, "legacy_skill", "Legacy skill", "Legacy content");
        const version = service.enableSkillVersioning("legacy_skill");
        expect(version.tag).toBe("0.1.0");
        expect(versioningService.initializeVersioning).toHaveBeenCalledWith(path.join(skillsDir, "legacy_skill"));
    });
    it("rejects versioning for read-only skills", () => {
        const skillDir = writeSkill(skillsDir, "readonly_skill", "Readonly skill", "Content");
        const skillMd = path.join(skillDir, "SKILL.md");
        fs.chmodSync(skillDir, 0o555);
        fs.chmodSync(skillMd, 0o444);
        try {
            expect(() => service.enableSkillVersioning("readonly_skill")).toThrow("read-only");
        }
        finally {
            fs.chmodSync(skillMd, 0o644);
            fs.chmodSync(skillDir, 0o755);
        }
    });
    it("updates skill description", () => {
        service.createSkill("updatable", "Original desc", "Original content");
        const updated = service.updateSkill("updatable", "Updated desc");
        expect(updated.description).toBe("Updated desc");
        expect(updated.content).toBe("Original content");
    });
    it("updates skill content", () => {
        service.createSkill("updatable", "Desc", "Original content");
        const updated = service.updateSkill("updatable", undefined, "New content");
        expect(updated.description).toBe("Desc");
        expect(updated.content).toBe("New content");
    });
    it("updates both description and content", () => {
        service.createSkill("updatable", "Old desc", "Old content");
        const updated = service.updateSkill("updatable", "New desc", "New content");
        expect(updated.description).toBe("New desc");
        expect(updated.content).toBe("New content");
    });
    it("rejects updates for missing skills", () => {
        expect(() => service.updateSkill("nonexistent", "New", "Content")).toThrow("not found");
    });
    it("deletes skills", () => {
        service.createSkill("deletable", "Desc", "Content");
        expect(service.getSkill("deletable")).not.toBeNull();
        const result = service.deleteSkill("deletable");
        expect(result).toBe(true);
        expect(service.getSkill("deletable")).toBeNull();
    });
    it("returns false when deleting missing skills", () => {
        expect(service.deleteSkill("nonexistent")).toBe(false);
    });
    it("uploads files into skills", () => {
        service.createSkill("file_skill", "Desc", "Content");
        const result = service.uploadFile("file_skill", "scripts/test.sh", "#!/bin/bash\necho 'test'");
        expect(result).toBe(true);
        const filePath = path.join(skillsDir, "file_skill", "scripts", "test.sh");
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.readFileSync(filePath, "utf-8")).toBe("#!/bin/bash\necho 'test'");
    });
    it("rejects upload to missing skills", () => {
        expect(() => service.uploadFile("nonexistent", "file.txt", "content")).toThrow("not found");
    });
    it("reads files from skills", () => {
        service.createSkill("read_skill", "Desc", "Content");
        service.uploadFile("read_skill", "data.txt", Buffer.from("test data"));
        const content = service.readFile("read_skill", "data.txt");
        expect(content.toString()).toBe("test data");
    });
    it("rejects reads from missing skills", () => {
        expect(() => service.readFile("nonexistent", "file.txt")).toThrow("not found");
    });
    it("throws when reading missing files", () => {
        service.createSkill("empty_skill", "Desc", "Content");
        expect(() => service.readFile("empty_skill", "missing.txt")).toThrow("File not found");
    });
    it("deletes files", () => {
        service.createSkill("del_file_skill", "Desc", "Content");
        service.uploadFile("del_file_skill", "temp.txt", "temp data");
        const filePath = path.join(skillsDir, "del_file_skill", "temp.txt");
        expect(fs.existsSync(filePath)).toBe(true);
        const result = service.deleteFile("del_file_skill", "temp.txt");
        expect(result).toBe(true);
        expect(fs.existsSync(filePath)).toBe(false);
    });
    it("deletes directories", () => {
        service.createSkill("del_dir_skill", "Desc", "Content");
        service.uploadFile("del_dir_skill", "subdir/file.txt", "data");
        const dirPath = path.join(skillsDir, "del_dir_skill", "subdir");
        expect(fs.existsSync(dirPath)).toBe(true);
        const result = service.deleteFile("del_dir_skill", "subdir");
        expect(result).toBe(true);
        expect(fs.existsSync(dirPath)).toBe(false);
    });
    it("returns false when deleting missing files", () => {
        service.createSkill("skill", "Desc", "Content");
        expect(service.deleteFile("skill", "missing.txt")).toBe(false);
    });
    it("returns a skill file tree", async () => {
        service.createSkill("tree_skill", "Desc", "Content");
        service.uploadFile("tree_skill", "scripts/run.sh", "#!/bin/bash");
        service.uploadFile("tree_skill", "config.json", "{}");
        const tree = await service.getSkillFileTree("tree_skill");
        expect(tree.name).toBe("tree_skill");
        expect(tree.isFile).toBe(false);
    });
    it("rejects file tree requests for missing skills", async () => {
        await expect(service.getSkillFileTree("missing")).rejects.toThrow("not found");
    });
});
