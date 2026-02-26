import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { SkillVersion } from "../../../../src/skills/domain/skill-version.js";
import { getServerSettingsService } from "../../../../src/services/server-settings-service.js";
const serverSettingsService = getServerSettingsService();

const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-src-"));

const writeSkill = (root: string, name: string, description: string, content: string) => {
  const skillDir = path.join(root, name);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillMd = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}\n`;
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd, "utf-8");
  return skillDir;
};

describe("SkillService skill source management", () => {
  let tempRoot: string;
  let defaultDir: string;
  let extraDir: string;
  let additionalDirs: string[];
  let service: SkillService;

  beforeEach(() => {
    tempRoot = createTempRoot();
    defaultDir = path.join(tempRoot, "default_skills");
    extraDir = path.join(tempRoot, "extra_skills");
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.mkdirSync(extraDir, { recursive: true });

    additionalDirs = [];

    const config = {
      getSkillsDir: () => defaultDir,
      getAdditionalSkillsDirs: () => additionalDirs,
      getAppDataDir: () => tempRoot,
      get: (_key: string, defaultValue = "") => defaultValue,
    };

    const versioningService = {
      initializeVersioning: vi.fn(
        () =>
          new SkillVersion({
            tag: "0.1.0",
            commitHash: "abc1234",
            message: "init",
            createdAt: new Date(),
            isActive: true,
          }),
      ),
    };

    service = new SkillService({ config, versioningService: versioningService as any });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns default source info", () => {
    const sources = service.getSkillSources();

    expect(sources).toHaveLength(1);
    expect(sources[0]?.path).toBe(defaultDir);
    expect(sources[0]?.isDefault).toBe(true);
    expect(sources[0]?.skillCount).toBe(0);
  });

  it("adds a new skill source", () => {
    const updateSpy = vi
      .spyOn(serverSettingsService, "updateSetting")
      .mockReturnValue([true, "Updated"]);

    const newSource = path.join(tempRoot, "new_skills");
    fs.mkdirSync(newSource, { recursive: true });

    service.addSkillSource(newSource);

    expect(updateSpy).toHaveBeenCalledWith("AUTOBYTEUS_SKILLS_PATHS", newSource);
  });

  it("rejects adding an existing skill source", () => {
    additionalDirs = [extraDir];

    expect(() => service.addSkillSource(extraDir)).toThrow("Skill source already exists");
  });

  it("rejects adding default directory as source", () => {
    expect(() => service.addSkillSource(defaultDir)).toThrow("default skill directory");
  });

  it("rejects adding non-existent paths", () => {
    const invalidPath = path.join(tempRoot, "missing");

    expect(() => service.addSkillSource(invalidPath)).toThrow("Directory not found");
  });

  it("removes skill sources", () => {
    additionalDirs = [path.join(tempRoot, "source_a"), path.join(tempRoot, "source_b")];
    additionalDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

    const updateSpy = vi
      .spyOn(serverSettingsService, "updateSetting")
      .mockReturnValue([true, "Updated"]);

    service.removeSkillSource(additionalDirs[0]);

    expect(updateSpy).toHaveBeenCalledWith("AUTOBYTEUS_SKILLS_PATHS", additionalDirs[1]);
  });

  it("rejects removing unknown skill sources", () => {
    const updateSpy = vi.spyOn(serverSettingsService, "updateSetting");

    expect(() => service.removeSkillSource(extraDir)).toThrow("Skill source not found");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("rejects removing default skill directory", () => {
    expect(() => service.removeSkillSource(defaultDir)).toThrow("Cannot remove default");
  });

  it("lists skills from multiple directories", () => {
    writeSkill(defaultDir, "default_skill", "A skill in the default directory", "Default content");
    writeSkill(extraDir, "extra_skill", "A skill in an additional directory", "Extra content");

    additionalDirs = [extraDir];

    const skills = service.listSkills();
    const names = skills.map((skill) => skill.name);

    expect(names).toContain("default_skill");
    expect(names).toContain("extra_skill");
  });

  it("loads a skill from the default directory", () => {
    writeSkill(defaultDir, "default_skill", "A skill in the default directory", "Default content");

    const skill = service.getSkill("default_skill");

    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("default_skill");
    expect(skill?.description).toContain("default directory");
  });

  it("loads a skill from an additional directory", () => {
    writeSkill(extraDir, "extra_skill", "A skill in an additional directory", "Extra content");
    additionalDirs = [extraDir];

    const skill = service.getSkill("extra_skill");

    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("extra_skill");
    expect(skill?.description).toContain("additional directory");
  });

  it("prefers the default directory when duplicates exist", () => {
    writeSkill(defaultDir, "shared_skill", "From default dir", "Default content");
    writeSkill(extraDir, "shared_skill", "From extra dir", "Extra content");
    additionalDirs = [extraDir];

    const skills = service.listSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0]?.description).toContain("default");
  });

  it("deletes writable skills from extra directories", () => {
    writeSkill(extraDir, "extra_skill", "Extra skill", "Extra content");
    additionalDirs = [extraDir];

    const result = service.deleteSkill("extra_skill");

    expect(result).toBe(true);
    expect(service.getSkill("extra_skill")).toBeNull();
  });

  it("discovers skills inside nested skills directories", () => {
    writeSkill(defaultDir, "default_skill", "Default skill", "Default");

    const nestedDir = path.join(defaultDir, "skills");
    fs.mkdirSync(nestedDir, { recursive: true });
    writeSkill(nestedDir, "my_nested_skill", "deeply nested skill", "nested content");

    const skills = service.listSkills();
    const names = skills.map((skill) => skill.name);

    expect(names).toContain("my_nested_skill");

    const nested = service.getSkill("my_nested_skill");
    expect(nested?.description).toBe("deeply nested skill");
  });
});
