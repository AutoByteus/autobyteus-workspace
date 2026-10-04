import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
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

  beforeEach(() => {
    tempRoot = createTempRoot();
    skillsDir = path.join(tempRoot, "skills");
    fs.mkdirSync(skillsDir, { recursive: true });
    additionalDirs = [];
    additionalDefinitionRoots = [];

    const config = {
      getSkillsDir: () => skillsDir,
      getAdditionalSkillsDirs: () => additionalDirs,
      getAdditionalAgentPackageRoots: () => additionalDefinitionRoots,
      getAppDataDir: () => tempRoot,
      getAgentOrgsDir: () => path.join(tempRoot, "agent-orgs"),
      get: (_key: string, defaultValue = "") => defaultValue,
    };

    service = new SkillService({ config });
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
    expect(fs.existsSync(path.join(skillsDir, "test_skill", ".git"))).toBe(false);

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

    expect(service.reloadSkillCatalog().map((skill) => skill.name)).toEqual([
      "removed_skill",
      "stable_skill",
    ]);

    service.disableSkill("stable_skill");
    writeSkill(skillsDir, "stable_skill", "Updated skill", "Updated content");
    fs.rmSync(removedSkillDir, { recursive: true, force: true });
    writeSkill(skillsDir, "added_skill", "Added skill", "Added content");

    const result = service.reloadSkillCatalog();
    const stableSkill = result.find((skill) => skill.name === "stable_skill");

    expect(result.map((skill) => skill.name)).toEqual(["added_skill", "stable_skill"]);
    expect(stableSkill).toEqual(
      expect.objectContaining({
        description: "Updated skill",
        content: "Updated content",
        isDisabled: true,
      }),
    );

  });

  it("rejects invalid skill names", () => {
    expect(() => service.createSkill("invalid name!", "desc", "content")).toThrow(
      "Invalid skill name",
    );
  });

  it("rejects duplicate skill creation as a skill-name conflict (D-19)", () => {
    service.createSkill("duplicate", "First", "Content");

    expect(() => service.createSkill("duplicate", "Second", "Different")).toThrow(
      "Duplicate skill names: duplicate",
    );
  });

  it("rejects creating over a non-skill folder of the same name", () => {
    fs.mkdirSync(path.join(skillsDir, "occupied"));

    expect(() => service.createSkill("occupied", "Second", "Different")).toThrow("already exists");
  });

  it("returns null for missing skills", () => {
    expect(service.getSkill("nonexistent")).toBeNull();
  });

  it("records an unresolved binding only when the catalog has no copy of the name (D-19)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agentDir = path.join(tempRoot, "agents", "codex");
    fs.mkdirSync(agentDir, { recursive: true });
    const definition = new AgentDefinition({ name: "Codex", description: "Test", instructions: "",
      skillNames: ["workflow"], sourceInfo: { agentDirPath: agentDir } });
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)).toEqual([
      { kind: "unresolved", name: "workflow" },
    ]);
    const globalRoot = writeSkill(skillsDir, "workflow", "Global", "Global content");
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)[0]).toMatchObject({ kind: "resolved",
      skill: { rootPath: globalRoot } });
    // A folder without a manifest is not a catalog copy; the catalog's copy still resolves.
    fs.mkdirSync(path.join(agentDir, "skills", "workflow"), { recursive: true });
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)[0]).toMatchObject({ kind: "resolved",
      skill: { rootPath: globalRoot } });
  });

  it("does not take malformed or wrong-name manifests into the catalog under the configured name", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agentDir = path.join(tempRoot, "agents", "codex");
    const candidate = path.join(agentDir, "skills", "workflow");
    fs.mkdirSync(candidate, { recursive: true });
    const definition = new AgentDefinition({ name: "Codex", description: "Test", instructions: "",
      skillNames: ["workflow"], sourceInfo: { agentDirPath: agentDir } });
    fs.writeFileSync(path.join(candidate, "SKILL.md"), "malformed");
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)).toEqual([{ kind: "unresolved", name: "workflow" }]);
    writeSkillDirectory(candidate, "other", "Wrong name", "Body");
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)).toEqual([{ kind: "unresolved", name: "workflow" }]);
  });

  it("never takes a symlinked skill folder into the catalog", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agentDir = path.join(tempRoot, "agents", "codex");
    const outside = writeSkillDirectory(path.join(tempRoot, "outside", "workflow"), "workflow", "Test", "Body");
    fs.mkdirSync(path.join(agentDir, "skills"), { recursive: true });
    fs.symlinkSync(outside, path.join(agentDir, "skills", "workflow"));
    fs.symlinkSync(outside, path.join(skillsDir, "workflow"));
    const definition = new AgentDefinition({ name: "Codex", description: "Test", instructions: "",
      skillNames: ["workflow"], sourceInfo: { agentDirPath: agentDir } });
    expect(service.getSkill("workflow")).toBeNull();
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)).toEqual([{ kind: "unresolved", name: "workflow" }]);
  });

  it("does not loop on a cyclic nested skills link", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeSkill(skillsDir, "present", "Present", "Body");
    fs.symlinkSync(skillsDir, path.join(skillsDir, "skills"));
    const definition = new AgentDefinition({ name: "Codex", description: "Test", instructions: "",
      skillNames: ["missing"] });
    expect(service.listSkills().map((skill) => skill.name)).toEqual(["present"]);
    expect(service.resolveConfiguredSkillBindingsForAgent(definition)).toEqual([{ kind: "unresolved", name: "missing" }]);
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

  it("resolves a configured private skill of a package agent from the catalog", () => {
    const packageRoot = path.join(tempRoot, "package-root");
    additionalDefinitionRoots = [packageRoot];
    const agentDir = path.join(packageRoot, "agents", "writer");
    writeSkillDirectory(path.join(agentDir, "skills", "tone"), "tone", "Tone", "Tone content");
    writeSkillDirectory(path.join(agentDir, "skills", "outline"), "outline", "Outline", "Outline content");
    const writer = new AgentDefinition({ id: "writer", name: "Writer", description: "Writes", instructions: "",
      skillNames: ["tone", "outline"], sourceInfo: { agentDirPath: agentDir } });

    expect(service.resolveConfiguredSkillsForAgent(writer).map((skill) => skill.rootPath)).toEqual([
      path.resolve(path.join(agentDir, "skills", "tone")),
      path.resolve(path.join(agentDir, "skills", "outline")),
    ]);
    expect(service.resolveConfiguredSkillBindingsForAgent(writer)[0]).toEqual({ kind: "resolved",
      skill: expect.objectContaining({ name: "tone" }) });
  });

  it("resolves team-shared and team-local private skills from the catalog", () => {
    const packageRoot = path.join(tempRoot, "package-root");
    additionalDefinitionRoots = [packageRoot];
    const teamDir = path.join(packageRoot, "agent-teams", "editorial");
    const agentDir = path.join(teamDir, "agents", "reviewer");
    const rubric = writeSkillDirectory(path.join(teamDir, "skills", "rubric"), "rubric", "Team rubric", "Team content");
    const style = writeSkillDirectory(path.join(agentDir, "skills", "review-style"), "review-style", "Review style", "Body");
    const reviewer = new AgentDefinition({ id: "editorial:reviewer", name: "Reviewer", description: "Reviews",
      instructions: "", skillNames: ["rubric", "review-style"], ownershipScope: "team_local",
      sourceInfo: { agentDirPath: agentDir, teamDirPath: teamDir } });

    expect(service.resolveConfiguredSkillBindingsForAgent(reviewer).map((binding) =>
      binding.kind === "resolved" ? binding.skill.rootPath : null)).toEqual([path.resolve(rubric), path.resolve(style)]);
  });

  it("gives a configured agent the catalog's copy even when it ships its own (DEC-017)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const packageRoot = path.join(tempRoot, "package-root");
    additionalDefinitionRoots = [packageRoot];
    const agentDir = path.join(packageRoot, "agents", "reviewer");
    writeSkillDirectory(path.join(agentDir, "skills", "style"), "style", "Private", "Private content");
    const globalRoot = writeSkill(skillsDir, "style", "Global", "Global content");
    const definition = new AgentDefinition({ name: "Reviewer", description: "Reviews", instructions: "",
      skillNames: ["style"], sourceInfo: { agentDirPath: agentDir } });

    expect(service.resolveConfiguredSkillBindingsForAgent(definition)[0]).toMatchObject({ kind: "resolved",
      skill: { rootPath: globalRoot } });
    const allInstalled = new AgentDefinition({ name: "Daily Assistant", description: "All", instructions: "",
      skillNames: [], skillScope: "ALL_INSTALLED" });
    const fromCatalog = service.resolveConfiguredSkillBindingsForAgent(allInstalled)
      .find((binding) => binding.kind === "resolved" && binding.skill.name === "style");
    expect(fromCatalog).toMatchObject({ kind: "resolved", skill: { rootPath: globalRoot } });
  });

  it("resolves a skill bundled in another package agent for a configured agent (one catalog)", () => {
    const packageRoot = path.join(tempRoot, "package-root");
    additionalDefinitionRoots = [packageRoot];
    const leadDir = path.join(packageRoot, "agents", "desk-lead");
    const helperSkill = writeSkillDirectory(path.join(packageRoot, "agents", "desk-helper", "skills", "desk-alpha"),
      "desk-alpha", "Desk alpha", "Body");
    fs.mkdirSync(leadDir, { recursive: true });

    const resolved = service.resolveConfiguredSkillsForAgent(new AgentDefinition({ id: "desk-lead", name: "Desk Lead",
      description: "Lead", instructions: "", skillNames: ["desk-alpha"], sourceInfo: { agentDirPath: leadDir } }));

    expect(resolved.map((skill) => skill.rootPath)).toEqual([path.resolve(helperSkill)]);
  });

  it("does not resolve a configured root-level agent SKILL.md", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const packageRoot = path.join(tempRoot, "package-root");
    additionalDefinitionRoots = [packageRoot];
    const agentDir = path.join(packageRoot, "agents", "writer");
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

  it("resolves a skill from the default skills folder", () => {
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

  it("preserves safe unresolved configured bindings in order while omitting unsafe names", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeSkill(skillsDir, "global_skill", "Global skill", "Global content");
    const definition = new AgentDefinition({
      id: "writer",
      name: "Writer",
      description: "Writes",
      instructions: "",
      skillNames: ["global_skill", "missing-safe", "../unsafe", "also-missing"],
    });

    const bindings = service.resolveConfiguredSkillBindingsForAgent(definition);

    expect(bindings).toHaveLength(3);
    expect(bindings[0]).toMatchObject({ kind: "resolved", skill: { name: "global_skill" } });
    expect(bindings[1]).toEqual({ kind: "unresolved", name: "missing-safe" });
    expect(bindings[2]).toEqual({ kind: "unresolved", name: "also-missing" });
    expect(service.resolveConfiguredSkillsForAgent(definition).map((skill) => skill.name)).toEqual(["global_skill"]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Recording an unresolved binding"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name"));
  });

  it("skips unsafe configured skill names", () => {
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

  it("lists a folder under its declared name, so a mismatched folder does not satisfy the configured name", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const packageRoot = path.join(tempRoot, "package-root");
    additionalDefinitionRoots = [packageRoot];
    const teamDir = path.join(packageRoot, "agent-teams", "editorial");
    const agentDir = path.join(teamDir, "agents", "reviewer");
    writeSkillDirectory(path.join(agentDir, "skills", "rubric"), "wrong-agent-name", "Bad", "Bad");

    const resolved = service.resolveConfiguredSkillsForAgent(new AgentDefinition({ id: "editorial:reviewer",
      name: "Reviewer", description: "Reviews", instructions: "", skillNames: ["rubric"], ownershipScope: "team_local",
      sourceInfo: { agentDirPath: agentDir, teamDirPath: teamDir } }));

    expect(resolved).toEqual([]);
    expect(service.getSkill("wrong-agent-name")?.rootPath).toBe(path.resolve(path.join(agentDir, "skills", "rubric")));
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
