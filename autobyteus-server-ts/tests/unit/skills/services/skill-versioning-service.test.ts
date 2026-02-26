import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkillVersioningService } from "../../../../src/skills/services/skill-versioning-service.js";

const hasGit = (() => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-git-check-"));
    execFileSync("git", ["init"], { cwd: tempDir, stdio: "ignore" });
    fs.rmSync(tempDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
})();

const describeGit = hasGit ? describe : describe.skip;

describeGit("SkillVersioningService", () => {
  let tempDir: string;
  let skillPath: string;
  let service: SkillVersioningService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-git-"));
    skillPath = tempDir;
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), "# Test Skill\n\nThis is a test skill.");
    SkillVersioningService.resetInstance();
    service = SkillVersioningService.getInstance();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns false for non-git directory", () => {
    expect(service.isVersioned(skillPath)).toBe(false);
  });

  it("returns true after init", () => {
    service.initRepo(skillPath);
    expect(service.isVersioned(skillPath)).toBe(true);
  });

  it("initRepo creates .git directory", () => {
    service.initRepo(skillPath);
    const gitDir = path.join(skillPath, ".git");
    expect(fs.existsSync(gitDir)).toBe(true);
  });

  it("initRepo throws if already versioned", () => {
    service.initRepo(skillPath);
    expect(() => service.initRepo(skillPath)).toThrowError(/already versioned/);
  });

  it("initializeVersioning creates initial tag", () => {
    const version = service.initializeVersioning(skillPath);
    expect(service.isVersioned(skillPath)).toBe(true);
    expect(version.tag).toBe("0.1.0");
    expect(version.isActive).toBe(true);
    expect(version.commitHash.length).toBe(7);
  });

  it("initializeVersioning throws if already versioned", () => {
    service.initRepo(skillPath);
    expect(() => service.initializeVersioning(skillPath)).toThrowError(/already versioned/);
  });

  it("createVersion creates tag", () => {
    service.initRepo(skillPath);
    const version = service.createVersion(skillPath, "v1.0.0", "Initial version");
    expect(version.tag).toBe("v1.0.0");
    expect(version.message).toBe("Initial version");
    expect(version.isActive).toBe(true);
    expect(version.commitHash.length).toBe(7);
  });

  it("createVersion throws if not versioned", () => {
    expect(() => service.createVersion(skillPath, "v1.0.0", "Test")).toThrowError(
      /not versioned/,
    );
  });

  it("createVersion throws if tag exists", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First");
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), "# Updated");
    expect(() => service.createVersion(skillPath, "v1.0.0", "Duplicate")).toThrowError(
      /already exists/,
    );
  });

  it("listVersions returns empty for non-versioned", () => {
    expect(service.listVersions(skillPath)).toEqual([]);
  });

  it("listVersions returns all tags", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First version");
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), "# Updated\n\nNew content");
    service.createVersion(skillPath, "v1.1.0", "Second version");

    const versions = service.listVersions(skillPath);
    const tags = versions.map((version) => version.tag);
    expect(tags).toContain("v1.0.0");
    expect(tags).toContain("v1.1.0");
  });

  it("getActiveVersion returns null for non-versioned", () => {
    expect(service.getActiveVersion(skillPath)).toBeNull();
  });

  it("getActiveVersion returns latest after create", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First");
    const active = service.getActiveVersion(skillPath);
    expect(active?.tag).toBe("v1.0.0");
  });

  it("activateVersion throws if not versioned", () => {
    expect(() => service.activateVersion(skillPath, "v1.0.0")).toThrowError(/not versioned/);
  });

  it("activateVersion throws if tag not found", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First");
    expect(() => service.activateVersion(skillPath, "v99.0.0")).toThrowError(/not found/);
  });

  it("activateVersion changes working tree", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First");

    const skillFile = path.join(skillPath, "SKILL.md");
    fs.writeFileSync(skillFile, "# Version 2 Content");
    service.createVersion(skillPath, "v2.0.0", "Second");

    expect(fs.readFileSync(skillFile, "utf-8")).toContain("Version 2");
    service.activateVersion(skillPath, "v1.0.0");
    expect(fs.readFileSync(skillFile, "utf-8")).toContain("Test Skill");
  });

  it("diffVersions throws if not versioned", () => {
    expect(() => service.diffVersions(skillPath, "v1.0.0", "v2.0.0")).toThrowError(
      /not versioned/,
    );
  });

  it("diffVersions throws if from tag not found", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First");
    expect(() => service.diffVersions(skillPath, "v99.0.0", "v1.0.0")).toThrowError(
      /not found/,
    );
  });

  it("diffVersions returns diff string", () => {
    service.initRepo(skillPath);
    service.createVersion(skillPath, "v1.0.0", "First");
    fs.writeFileSync(skillPath + "/SKILL.md", "# Updated Skill\n\nCompletely new content.");
    service.createVersion(skillPath, "v2.0.0", "Second");

    const diff = service.diffVersions(skillPath, "v1.0.0", "v2.0.0");
    expect(typeof diff).toBe("string");
    expect(diff.length).toBeGreaterThan(0);
  });
});
