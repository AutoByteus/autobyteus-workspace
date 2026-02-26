import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { SkillVersioningService } from "../../../src/skills/services/skill-versioning-service.js";

const hasGit = (() => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const describeGit = hasGit ? describe : describe.skip;

describeGit("Skill versioning integration", () => {
  let tempDir: string;
  let skillsDir: string;
  let service: SkillService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-ver-"));
    skillsDir = path.join(tempDir, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });

    const config = {
      getSkillsDir: () => skillsDir,
      getAdditionalSkillsDirs: () => [],
      getAppDataDir: () => tempDir,
      get: (_key: string, defaultValue?: string) => defaultValue,
    };

    SkillVersioningService.resetInstance();
    service = new SkillService({ config });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("createSkill initializes versioning automatically", () => {
    const skill = service.createSkill("versioned_skill", "Versioned skill", "Initial content");
    const versioning = SkillVersioningService.getInstance();

    expect(versioning.isVersioned(skill.rootPath)).toBe(true);
    const versions = versioning.listVersions(skill.rootPath);
    expect(versions.some((version) => version.tag === "0.1.0")).toBe(true);

    const active = versioning.getActiveVersion(skill.rootPath);
    expect(active?.tag).toBe("0.1.0");
    expect(skill.fileCount).toBe(1);
  });

  it("enableSkillVersioning works for existing skills", () => {
    const legacyDir = path.join(skillsDir, "legacy_skill");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, "SKILL.md"),
      "---\nname: legacy_skill\ndescription: Legacy skill\n---\n\nLegacy content\n",
      "utf-8",
    );

    const version = service.enableSkillVersioning("legacy_skill");
    expect(version.tag).toBe("0.1.0");

    const versioning = SkillVersioningService.getInstance();
    expect(versioning.isVersioned(legacyDir)).toBe(true);
  });

  it("activateVersion restores content", () => {
    const skill = service.createSkill("restore_skill", "Restore skill", "Original content");
    const skillFile = path.join(skill.rootPath, "SKILL.md");
    const originalText = fs.readFileSync(skillFile, "utf-8");
    const updatedText = originalText.replace("Original content", "Updated content");
    fs.writeFileSync(skillFile, updatedText, "utf-8");

    const versioning = SkillVersioningService.getInstance();
    versioning.createVersion(skill.rootPath, "0.2.0", "Second version");
    versioning.activateVersion(skill.rootPath, "0.1.0");

    const revertedText = fs.readFileSync(skillFile, "utf-8");
    expect(revertedText).toContain("Original content");
    expect(revertedText).not.toContain("Updated content");
  });
});
