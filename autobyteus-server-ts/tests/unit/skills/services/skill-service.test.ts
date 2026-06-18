import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { SkillVersion } from "../../../../src/skills/domain/skill-version.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";

const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-service-"));

const writeSkillDirectory = (
  skillDir: string,
  name: string,
  description: string,
  content: string,
) => {
  fs.mkdirSync(skillDir, { recursive: true });
  const skillMd = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}\n`;
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd, "utf-8");
  return skillDir;
};

const writeSkill = (root: string, name: string, description: string, content: string) =>
  writeSkillDirectory(path.join(root, name), name, description, content);

describe("SkillService", () => {
  let tempRoot: string;
  let skillsDir: string;
  let service: SkillService;
  let additionalDirs: string[];
  let additionalDefinitionRoots: string[];
  let versioningService: { initializeVersioning: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tempRoot = createTempRoot();
    skillsDir = path.join(tempRoot, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    additionalDirs = [];
    additionalDefinitionRoots = [];

    versioningService = {
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

    const config = {
      getSkillsDir: () => skillsDir,
      getAdditionalSkillsDirs: () => additionalDirs,
      getAdditionalAgentPackageRoots: () => additionalDefinitionRoots,
      getAppDataDir: () => tempRoot,
      get: (_key: string, defaultValue = "") => defaultValue,
    };

    service = new SkillService({ config, versioningService: versioningService as any });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(versioningService.initializeVersioning).toHaveBeenCalledWith(
      path.join(skillsDir, "test_skill"),
    );

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

  it("reloads edited, added, and removed skills from disk while preserving disabled state", () => {
    writeSkill(skillsDir, "stable_skill", "Old skill", "Old content");
    const removedSkillDir = writeSkill(
      skillsDir,
      "removed_skill",
      "Removed skill",
      "Removed content",
    );

    expect(service.reloadSkillCatalog().skills.map((skill) => skill.name)).toEqual([
      "removed_skill",
      "stable_skill",
    ]);

    service.disableSkill("stable_skill");
    writeSkill(skillsDir, "stable_skill", "Updated skill", "Updated content");
    fs.rmSync(removedSkillDir, { recursive: true, force: true });
    writeSkill(skillsDir, "added_skill", "Added skill", "Added content");

    const result = service.reloadSkillCatalog();
    const stableSkill = result.skills.find((skill) => skill.name === "stable_skill");

    expect(result.skills.map((skill) => skill.name)).toEqual(["added_skill", "stable_skill"]);
    expect(stableSkill).toEqual(
      expect.objectContaining({
        description: "Updated skill",
        content: "Updated content",
        isDisabled: true,
      }),
    );
    expect(result.skillSources).toEqual([
      expect.objectContaining({
        path: skillsDir,
        skillCount: 2,
        isDefault: true,
      }),
    ]);
  });

  it("rejects invalid skill names", () => {
    expect(() => service.createSkill("invalid name!", "desc", "content")).toThrow(
      "Invalid skill name",
    );
  });

  it("rejects duplicate skill creation", () => {
    service.createSkill("duplicate", "First", "Content");

    expect(() => service.createSkill("duplicate", "Second", "Different")).toThrow(
      "already exists",
    );
  });

  it("returns null for missing skills", () => {
    expect(service.getSkill("nonexistent")).toBeNull();
  });

  it("returns resolved skills by configured names and skips unknown entries", () => {
    service.createSkill("configured_skill", "Configured skill", "Configured content");

    const resolved = service.getSkills(["configured_skill", "", "missing"]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.name).toBe("configured_skill");
  });

  it("lists and retrieves bundled package skills from canonical definition-root layouts", () => {
    const packageRoot = path.join(tempRoot, "package-root");
    const sharedSingleDir = writeSkillDirectory(
      path.join(packageRoot, "agents", "requirements-engineer", "skills", "requirements-engineer"),
      "requirements-engineer",
      "Bundled shared single skill",
      "Shared single content",
    );
    const sharedMultiDir = writeSkillDirectory(
      path.join(packageRoot, "agents", "writer", "skills", "writer-tone"),
      "writer-tone",
      "Bundled shared multi skill",
      "Shared multi content",
    );
    const teamLocalSingleDir = writeSkillDirectory(
      path.join(packageRoot, "agent-teams", "software-engineering-team", "agents", "reviewer", "skills", "review-style"),
      "review-style",
      "Bundled team-local single skill",
      "Team-local single content",
    );
    const teamLocalMultiDir = writeSkillDirectory(
      path.join(packageRoot, "agent-teams", "software-engineering-team", "agents", "reviewer", "skills", "review-rubric"),
      "review-rubric",
      "Bundled team-local multi skill",
      "Team-local multi content",
    );
    const teamSharedDir = writeSkillDirectory(
      path.join(packageRoot, "agent-teams", "software-engineering-team", "skills", "handoff-checklist"),
      "handoff-checklist",
      "Bundled team-shared skill",
      "Team-shared content",
    );
    additionalDefinitionRoots = [packageRoot];

    const skills = service.listSkills();
    expect(skills.map((skill) => skill.name)).toEqual([
      "handoff-checklist",
      "requirements-engineer",
      "review-rubric",
      "review-style",
      "writer-tone",
    ]);

    expect(service.getSkill("requirements-engineer")?.rootPath).toBe(path.resolve(sharedSingleDir));
    expect(service.getSkill("writer-tone")?.rootPath).toBe(path.resolve(sharedMultiDir));
    expect(service.getSkill("review-style")?.rootPath).toBe(path.resolve(teamLocalSingleDir));
    expect(service.getSkill("review-rubric")?.rootPath).toBe(path.resolve(teamLocalMultiDir));
    expect(service.getSkill("handoff-checklist")?.rootPath).toBe(path.resolve(teamSharedDir));
  });

  it("discovers bundled skills from app-data definition roots", () => {
    const bundledDir = writeSkillDirectory(
      path.join(tempRoot, "agents", "app-data-agent", "skills", "app-data-skill"),
      "app-data-skill",
      "App data bundled skill",
      "App data content",
    );

    const skill = service.getSkill("app-data-skill");

    expect(service.listSkills().map((entry) => entry.name)).toContain("app-data-skill");
    expect(skill?.rootPath).toBe(path.resolve(bundledDir));
    expect(skill?.content).toBe("App data content");
  });

  it("prefers standalone skills over bundled canonical agent package skills when names collide", () => {
    writeSkill(skillsDir, "requirements-engineer", "Standalone skill", "Standalone content");

    const packageRoot = path.join(tempRoot, "package-root");
    writeSkillDirectory(
      path.join(packageRoot, "agents", "requirements-engineer", "skills", "requirements-engineer"),
      "requirements-engineer",
      "Bundled skill",
      "Bundled content",
    );
    additionalDefinitionRoots = [packageRoot];

    const skill = service.getSkill("requirements-engineer");
    expect(skill?.description).toBe("Standalone skill");
    expect(skill?.rootPath).toBe(path.join(skillsDir, "requirements-engineer"));

    const listedMatches = service
      .listSkills()
      .filter((entry) => entry.name === "requirements-engineer");
    expect(listedMatches).toHaveLength(1);
    expect(listedMatches[0]?.description).toBe("Standalone skill");
  });

  it("does not list or retrieve root-level agent SKILL.md as a bundled package skill", () => {
    const packageRoot = path.join(tempRoot, "package-root");
    writeSkillDirectory(
      path.join(packageRoot, "agents", "writer"),
      "writer-style",
      "Unsupported root-level skill",
      "Unsupported root content",
    );
    writeSkillDirectory(
      path.join(packageRoot, "agent-teams", "editorial", "agents", "reviewer"),
      "review-style",
      "Unsupported team-local root-level skill",
      "Unsupported team-local root content",
    );
    additionalDefinitionRoots = [packageRoot];

    expect(service.getSkill("writer-style")).toBeNull();
    expect(service.getSkill("review-style")).toBeNull();
    const listedNames = service.listSkills().map((skill) => skill.name);
    expect(listedNames).not.toContain("writer-style");
    expect(listedNames).not.toContain("review-style");
  });

  it("resolves a configured canonical private single-skill folder for its owning agent", () => {
    const agentDir = path.join(tempRoot, "package-root", "agents", "writer");
    const skillDir = writeSkillDirectory(
      path.join(agentDir, "skills", "writer-style"),
      "writer-style",
      "Writer style",
      "Private single-skill content",
    );

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "writer",
        name: "Writer",
        description: "Writes",
        instructions: "",
        skillNames: ["writer-style"],
        sourceInfo: { agentDirPath: agentDir },
      }),
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.name).toBe("writer-style");
    expect(resolved[0]?.rootPath).toBe(path.resolve(skillDir));
  });

  it("resolves multiple configured private skills from an agent skills folder", () => {
    const agentDir = path.join(tempRoot, "package-root", "agents", "writer");
    writeSkillDirectory(path.join(agentDir, "skills", "tone"), "tone", "Tone", "Tone content");
    writeSkillDirectory(path.join(agentDir, "skills", "outline"), "outline", "Outline", "Outline content");

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "writer",
        name: "Writer",
        description: "Writes",
        instructions: "",
        skillNames: ["tone", "outline"],
        sourceInfo: { agentDirPath: agentDir },
      }),
    );

    expect(resolved.map((skill) => skill.name)).toEqual(["tone", "outline"]);
    expect(resolved.map((skill) => skill.rootPath)).toEqual([
      path.resolve(path.join(agentDir, "skills", "tone")),
      path.resolve(path.join(agentDir, "skills", "outline")),
    ]);
  });

  it("resolves team-shared skills after agent-private candidates", () => {
    const teamDir = path.join(tempRoot, "package-root", "agent-teams", "editorial");
    const agentDir = path.join(teamDir, "agents", "reviewer");
    writeSkillDirectory(path.join(teamDir, "skills", "rubric"), "rubric", "Team rubric", "Team content");

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "editorial:reviewer",
        name: "Reviewer",
        description: "Reviews",
        instructions: "",
        skillNames: ["rubric"],
        ownershipScope: "team_local",
        sourceInfo: { agentDirPath: agentDir, teamDirPath: teamDir },
      }),
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.description).toBe("Team rubric");
    expect(resolved[0]?.rootPath).toBe(path.resolve(path.join(teamDir, "skills", "rubric")));
  });

  it("resolves a team-local agent canonical private single-skill folder", () => {
    const teamDir = path.join(tempRoot, "package-root", "agent-teams", "editorial");
    const agentDir = path.join(teamDir, "agents", "reviewer");
    const skillDir = writeSkillDirectory(
      path.join(agentDir, "skills", "review-style"),
      "review-style",
      "Review style",
      "Single-skill content",
    );

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "editorial:reviewer",
        name: "Reviewer",
        description: "Reviews",
        instructions: "",
        skillNames: ["review-style"],
        ownershipScope: "team_local",
        sourceInfo: { agentDirPath: agentDir, teamDirPath: teamDir },
      }),
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.description).toBe("Review style");
    expect(resolved[0]?.rootPath).toBe(path.resolve(skillDir));
  });

  it("does not resolve a configured root-level agent SKILL.md from source context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agentDir = path.join(tempRoot, "package-root", "agents", "writer");
    writeSkillDirectory(agentDir, "writer-style", "Unsupported root-level skill", "Root content");

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "writer",
        name: "Writer",
        description: "Writes",
        instructions: "",
        skillNames: ["writer-style"],
        sourceInfo: { agentDirPath: agentDir },
      }),
    );

    expect(resolved).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("writer-style"));
  });

  it("resolves private skills from only the configured agent source context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agentOneDir = path.join(tempRoot, "package-root", "agents", "agent-one");
    const agentTwoDir = path.join(tempRoot, "package-root", "agents", "agent-two");
    writeSkillDirectory(path.join(agentOneDir, "skills", "tone-one"), "tone-one", "Agent one tone", "One");
    writeSkillDirectory(path.join(agentTwoDir, "skills", "tone-two"), "tone-two", "Agent two tone", "Two");

    const one = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "agent-one",
        name: "Agent One",
        description: "One",
        instructions: "",
        skillNames: ["tone-one", "tone-two"],
        sourceInfo: { agentDirPath: agentOneDir },
      }),
    );
    const two = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "agent-two",
        name: "Agent Two",
        description: "Two",
        instructions: "",
        skillNames: ["tone-two", "tone-one"],
        sourceInfo: { agentDirPath: agentTwoDir },
      }),
    );

    expect(one).toHaveLength(1);
    expect(one[0]?.description).toBe("Agent one tone");
    expect(two).toHaveLength(1);
    expect(two[0]?.description).toBe("Agent two tone");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("tone-two"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("tone-one"));
  });

  it("falls back to global skills only after contextual candidates miss", () => {
    writeSkill(skillsDir, "global_skill", "Global skill", "Global content");

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "writer",
        name: "Writer",
        description: "Writes",
        instructions: "",
        skillNames: ["global_skill"],
        sourceInfo: { agentDirPath: path.join(tempRoot, "package-root", "agents", "writer") },
      }),
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.description).toBe("Global skill");
    expect(resolved[0]?.rootPath).toBe(path.resolve(path.join(skillsDir, "global_skill")));
  });

  it("skips unsafe configured skill names before contextual path construction", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agentDir = path.join(tempRoot, "package-root", "agents", "writer");
    writeSkillDirectory(path.join(tempRoot, "package-root", "escape"), "escape", "Escaped", "Nope");

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "writer",
        name: "Writer",
        description: "Writes",
        instructions: "",
        skillNames: ["../escape", "a/b", "a\\b", ".", "..", ""],
        sourceInfo: { agentDirPath: agentDir },
      }),
    );

    expect(resolved).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("skips contextual candidates whose metadata name mismatches the configured name", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const teamDir = path.join(tempRoot, "package-root", "agent-teams", "editorial");
    const agentDir = path.join(teamDir, "agents", "reviewer");
    writeSkillDirectory(path.join(agentDir, "skills", "rubric"), "wrong-agent-name", "Bad", "Bad");
    writeSkillDirectory(path.join(teamDir, "skills", "rubric"), "wrong-team-name", "Bad team", "Bad");

    const resolved = service.resolveConfiguredSkillsForAgent(
      new AgentDefinition({
        id: "editorial:reviewer",
        name: "Reviewer",
        description: "Reviews",
        instructions: "",
        skillNames: ["rubric"],
        ownershipScope: "team_local",
        sourceInfo: { agentDirPath: agentDir, teamDirPath: teamDir },
      }),
    );

    expect(resolved).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("wrong-agent-name"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("wrong-team-name"));
  });

  it("enables versioning for existing skills", () => {
    writeSkill(skillsDir, "legacy_skill", "Legacy skill", "Legacy content");

    const version = service.enableSkillVersioning("legacy_skill");

    expect(version.tag).toBe("0.1.0");
    expect(versioningService.initializeVersioning).toHaveBeenCalledWith(
      path.join(skillsDir, "legacy_skill"),
    );
  });

  it("rejects versioning for read-only skills", () => {
    const skillDir = writeSkill(skillsDir, "readonly_skill", "Readonly skill", "Content");
    const skillMd = path.join(skillDir, "SKILL.md");

    fs.chmodSync(skillDir, 0o555);
    fs.chmodSync(skillMd, 0o444);

    try {
      expect(() => service.enableSkillVersioning("readonly_skill")).toThrow("read-only");
    } finally {
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
