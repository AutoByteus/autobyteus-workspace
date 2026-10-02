import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { SkillNameConflictError } from "../../../../src/skills/domain/skill-name-conflict-error.js";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { getServerSettingsService } from "../../../../src/services/server-settings-service.js";

// D-19: one skill per name, decided at load (REQ-022, REQ-024); duplicates blocked at import (REQ-023).
const writeSkill = (skillDir: string, name: string, body = "Body"): string => {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} description\n---\n\n${body}\n`, "utf-8");
  return skillDir;
};
const bundled = (root: string, agent: string, name: string, body = "Body"): string =>
  writeSkill(path.join(root, "agents", agent, "skills", name), name, body);

describe("SkillService catalog: one skill per name (D-19)", () => {
  let base: string;
  let appData: string;
  let skillsDir: string;
  let packageRoots: string[];
  let skillPaths: string[];
  let codexDefault: string;
  let claudeDefault: string;
  let service: SkillService;

  beforeEach(() => {
    base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "skill-catalog-d19-")));
    appData = path.join(base, "app-data");
    skillsDir = path.join(appData, "skills");
    codexDefault = path.join(base, "home", ".codex", "skills");
    claudeDefault = path.join(base, "home", ".claude", "skills");
    [skillsDir, codexDefault, claudeDefault].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
    packageRoots = [];
    skillPaths = [];
    service = new SkillService({
      config: {
        getSkillsDir: () => skillsDir,
        getAdditionalSkillsDirs: () => skillPaths,
        getAdditionalAgentPackageRoots: () => packageRoots,
        getAppDataDir: () => appData,
        getAgentOrgsDir: () => path.join(appData, "agent-orgs"),
        get: (_key: string, defaultValue = "") => defaultValue,
      },
      isRuntimeDefaultSkillFolder: (directory) => [codexDefault, claudeDefault].includes(path.resolve(directory)),
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(base, { recursive: true, force: true });
  });

  describe("precedence", () => {
    it("orders tier 1, then definition roots (app data, then package roots in order), then added folders, then runtime defaults", () => {
      const packageA = path.join(base, "package-a");
      const packageB = path.join(base, "package-b");
      const added = path.join(base, "autobyteus-skills");
      packageRoots = [packageA, packageB];
      // Settings order puts the Codex default folder first; tier 4 still comes last.
      skillPaths = [codexDefault, added];
      const tier1 = writeSkill(path.join(skillsDir, "one"), "one");
      bundled(appData, "agent", "one");
      const appDataCopy = bundled(appData, "agent", "two");
      bundled(packageA, "agent", "two");
      const packageACopy = bundled(packageA, "agent", "three");
      bundled(packageB, "agent", "three");
      const packageBCopy = bundled(packageB, "agent", "four");
      writeSkill(path.join(added, "four"), "four");
      const addedCopy = writeSkill(path.join(added, "five"), "five");
      writeSkill(path.join(codexDefault, "five"), "five");
      const codexOnly = writeSkill(path.join(codexDefault, "six"), "six");

      expect(Object.fromEntries(service.listInstalledSkillRecords().map((record) =>
        [record.skill.name, [record.skill.rootPath, record.tier]]))).toEqual({
        one: [tier1, 1], two: [appDataCopy, 2], three: [packageACopy, 2], four: [packageBCopy, 2],
        five: [addedCopy, 3], six: [codexOnly, 4],
      });
    });

    it("real layout: `~/.codex/skills` added before `autobyteus-skills` → the autobyteus-skills copy is used everywhere (AC-019)", () => {
      const autobyteusSkills = path.join(base, "autobyteus-skills");
      skillPaths = [codexDefault, autobyteusSkills];
      writeSkill(path.join(codexDefault, "resume-designer"), "resume-designer", "stale codex copy");
      const used = writeSkill(path.join(autobyteusSkills, "resume-designer"), "resume-designer", "maintained copy");

      expect(service.getSkill("resume-designer")?.rootPath).toBe(used);
      const configured = service.resolveConfiguredSkillBindingsForAgent(new AgentDefinition({ name: "Designer",
        description: "", instructions: "", skillNames: ["resume-designer"] }));
      const allInstalled = service.resolveConfiguredSkillBindingsForAgent(new AgentDefinition({ name: "Daily Assistant",
        description: "", instructions: "", skillNames: [], skillScope: "ALL_INSTALLED" }));
      const pathOf = (bindings: typeof configured) => bindings.flatMap((binding) =>
        binding.kind === "resolved" && binding.skill.name === "resume-designer" ? [binding.skill.rootPath] : []);
      expect(pathOf(configured)).toEqual([used]);
      expect(pathOf(allInstalled)).toEqual([used]);
    });

    it("a name only in a runtime default folder is used from there", () => {
      skillPaths = [codexDefault];
      const only = writeSkill(path.join(codexDefault, "codex-only"), "codex-only");
      expect(service.getSkill("codex-only")?.rootPath).toBe(only);
    });

    it("a folder reached through two sources is one copy, not a duplicate", () => {
      const packageRoot = path.join(base, "autobyteus-agents");
      packageRoots = [packageRoot];
      skillPaths = [packageRoot];
      const copy = bundled(packageRoot, "writer", "tone");
      expect(service.getSkill("tone")?.rootPath).toBe(copy);
      expect(service.listSkillNameIssues()).toEqual([]);
    });
  });

  describe("issues (REQ-024)", () => {
    it("reports conflicts among tiers 1–3 and shadowed runtime-default copies, and logs them once", () => {
      const packageRoot = path.join(base, "package");
      const added = path.join(base, "added");
      packageRoots = [packageRoot];
      skillPaths = [added, codexDefault];
      const used = bundled(packageRoot, "agent", "dup");
      const ignored = writeSkill(path.join(added, "dup"), "dup");
      const shadowed = writeSkill(path.join(codexDefault, "dup"), "dup");
      const warn = vi.mocked(console.warn);
      warn.mockClear();

      const issues = service.listSkillNameIssues();
      service.listSkillNameIssues();

      expect(issues).toEqual([
        { name: "dup", usedPath: used, ignoredPaths: [ignored], kind: "conflict" },
        { name: "dup", usedPath: used, ignoredPaths: [shadowed], kind: "shadowed_runtime_default" },
      ]);
      expect(warn.mock.calls.filter(([message]) => String(message).startsWith("Skill name 'dup'"))).toHaveLength(2);
    });
  });

  describe("every name-based operation acts on the used copy (AR-013)", () => {
    it.each([
      ["tier 4 vs tier 3", "runtime-default"],
      ["tier 2 vs tier 3", "package"],
    ] as const)("%s: detail, file tree, read, update and delete use the used copy; the ignored copy stays untouched", async (_label, ignoredKind) => {
      const added = path.join(base, "autobyteus-skills");
      const packageRoot = path.join(base, "package");
      packageRoots = [packageRoot];
      skillPaths = ignoredKind === "runtime-default" ? [codexDefault, added] : [added];
      const [used, ignored] = ignoredKind === "runtime-default"
        ? [writeSkill(path.join(added, "dup"), "dup", "USED"), writeSkill(path.join(codexDefault, "dup"), "dup", "IGNORED")]
        : [bundled(packageRoot, "agent", "dup", "USED"), writeSkill(path.join(added, "dup"), "dup", "IGNORED")];
      fs.writeFileSync(path.join(used, "used-only.md"), "used");
      const ignoredManifest = fs.readFileSync(path.join(ignored, "SKILL.md"), "utf-8");

      expect(service.getSkill("dup")).toMatchObject({ rootPath: used, content: "USED" });
      expect(JSON.stringify((await service.getSkillFileTree("dup")).toJson())).toContain("used-only.md");
      expect(service.readFile("dup", "used-only.md").toString()).toBe("used");
      expect(service.updateSkill("dup", "Edited", "EDITED").rootPath).toBe(used);
      expect(fs.readFileSync(path.join(used, "SKILL.md"), "utf-8")).toContain("EDITED");
      expect(service.listSkillNameIssues()[0]).toMatchObject({ usedPath: used, ignoredPaths: [ignored] });
      expect(service.deleteSkill("dup")).toBe(true);

      expect(fs.existsSync(used)).toBe(false);
      expect(fs.readFileSync(path.join(ignored, "SKILL.md"), "utf-8")).toBe(ignoredManifest);
      // With the used copy gone, the ignored one becomes the catalog's copy.
      expect(service.getSkill("dup")?.rootPath).toBe(ignored);
    });
  });

  describe("import validation (REQ-023)", () => {
    it("rejects adding a folder with a tiers 1–3 duplicate before persisting the setting", () => {
      const packageRoot = path.join(base, "package");
      packageRoots = [packageRoot];
      const existing = bundled(packageRoot, "agent", "dup");
      const added = path.join(base, "added");
      const incoming = writeSkill(path.join(added, "dup"), "dup");
      const updateSetting = vi.spyOn(getServerSettingsService(), "updateSetting");

      const error = (() => { try { service.addSkillSource(added); } catch (caught) { return caught; } return null; })();

      expect(error).toBeInstanceOf(SkillNameConflictError);
      expect((error as SkillNameConflictError).conflicts).toEqual([{ name: "dup", existingPath: existing, incomingPath: incoming }]);
      expect(updateSetting).not.toHaveBeenCalled();
    });

    it("accepts adding a runtime default folder; its duplicates are notices, not errors", () => {
      const used = writeSkill(path.join(skillsDir, "dup"), "dup");
      const shadowed = writeSkill(path.join(codexDefault, "dup"), "dup");

      expect(service.validateIncomingSkillNames({ path: codexDefault, layout: "skill_path" })).toEqual({
        conflicts: [], notices: [{ name: "dup", usedPath: used, ignoredPath: shadowed }],
      });
    });

    it("createSkill rejects a name that exists in tiers 1–3 and allows one that only exists in a runtime default folder", () => {
      const packageRoot = path.join(base, "package");
      packageRoots = [packageRoot];
      skillPaths = [codexDefault];
      const existing = bundled(packageRoot, "agent", "packaged");
      writeSkill(path.join(codexDefault, "codex-copy"), "codex-copy");

      expect(() => service.createSkill("packaged", "d", "c")).toThrow(SkillNameConflictError);
      expect(() => service.createSkill("packaged", "d", "c")).toThrow("Duplicate skill names: packaged");
      try { service.createSkill("packaged", "d", "c"); } catch (error) {
        expect((error as SkillNameConflictError).conflicts).toEqual([
          { name: "packaged", existingPath: existing, incomingPath: path.join(skillsDir, "packaged") },
        ]);
      }
      expect(fs.existsSync(path.join(skillsDir, "packaged"))).toBe(false);

      expect(service.createSkill("codex-copy", "d", "c").rootPath).toBe(path.join(skillsDir, "codex-copy"));
      expect(service.getSkill("codex-copy")?.rootPath).toBe(path.join(skillsDir, "codex-copy"));
    });
  });

  describe("application-owned agents (boundary)", () => {
    it("resolve their bundled skill first, then the catalog", () => {
      const bundleAgent = path.join(base, "applications", "brief-studio", "agents", "writer");
      const bundledCopy = writeSkill(path.join(bundleAgent, "skills", "tone"), "tone", "APP");
      writeSkill(path.join(skillsDir, "tone"), "tone", "INSTALLED");
      const catalogOnly = writeSkill(path.join(skillsDir, "outline"), "outline");
      const appAgent = new AgentDefinition({ id: "app:writer", name: "Writer", description: "", instructions: "",
        skillNames: ["tone", "outline"], ownershipScope: "application_owned", sourceInfo: { agentDirPath: bundleAgent } });
      const installedAgent = new AgentDefinition({ id: "writer", name: "Writer", description: "", instructions: "",
        skillNames: ["tone"], sourceInfo: { agentDirPath: bundleAgent } });

      expect(service.resolveConfiguredSkillsForAgent(appAgent).map((skill) => skill.rootPath)).toEqual([bundledCopy, catalogOnly]);
      expect(service.resolveConfiguredSkillBindingsForAgent(appAgent)[0]).toEqual({ kind: "resolved",
        skill: expect.objectContaining({ rootPath: bundledCopy }) });
      expect(service.resolveConfiguredSkillsForAgent(installedAgent).map((skill) => skill.rootPath))
        .toEqual([path.join(skillsDir, "tone")]);
    });
  });
});
