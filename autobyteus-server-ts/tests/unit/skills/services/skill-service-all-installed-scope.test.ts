import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { createAgyRunCapsule } from "../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { WorkspaceSkillMaterializer } from "../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import { SkillService } from "../../../../src/skills/services/skill-service.js";

const writeSkill = (skillDir: string, name: string, description = `${name} skill`) => {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
    "utf-8",
  );
  return skillDir;
};


describe("SkillService ALL_INSTALLED skill scope", () => {
  let tempRoot: string;
  let appDataDir: string;
  let skillsDir: string;
  let packageRoot: string;
  let service: SkillService;
  let layout: {
    globalSkill: string;
    nestedGlobalSkill: string;
    agentPrivateSkill: string;
    teamAgentPrivateSkill: string;
    teamSharedSkill: string;
    researchAgentDir: string;
    teamDir: string;
  };

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-all-installed-"));
    appDataDir = path.join(tempRoot, "app-data");
    skillsDir = path.join(tempRoot, "skills");
    packageRoot = path.join(tempRoot, "autobyteus-agents");
    fs.mkdirSync(appDataDir, { recursive: true });

    const researchAgentDir = path.join(packageRoot, "agents", "research-engineer");
    const teamDir = path.join(packageRoot, "agent-teams", "product-team");
    layout = {
      globalSkill: writeSkill(path.join(skillsDir, "global-writer"), "global-writer"),
      nestedGlobalSkill: writeSkill(path.join(skillsDir, "skills", "nested-reviewer"), "nested-reviewer"),
      // A skill bundled inside another agent package's own folder.
      agentPrivateSkill: writeSkill(path.join(researchAgentDir, "skills", "paper-digest"), "paper-digest"),
      teamAgentPrivateSkill: writeSkill(
        path.join(teamDir, "agents", "designer", "skills", "wireframe"),
        "wireframe",
      ),
      teamSharedSkill: writeSkill(path.join(teamDir, "skills", "team-handbook"), "team-handbook"),
      researchAgentDir,
      teamDir,
    };

    service = new SkillService({
      config: {
        getSkillsDir: () => skillsDir,
        getAdditionalSkillsDirs: () => [],
        getAdditionalAgentPackageRoots: () => [packageRoot],
        getAppDataDir: () => appDataDir,
        getAgentOrgsDir: () => path.join(appDataDir, "agent-orgs"),
        get: (_key: string, defaultValue = "") => defaultValue,
      },
    });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const dailyAssistant = (overrides: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) =>
    new AgentDefinition({
      id: "autobyteus-daily-assistant",
      name: "Daily Assistant",
      description: "General assistant",
      instructions: "Help.",
      skillNames: [],
      skillScope: "ALL_INSTALLED",
      sourceInfo: { agentDirPath: path.join(appDataDir, "agents", "autobyteus-daily-assistant") },
      ...overrides,
    });

  it("enumerates installed skill records with the real root path of each layout", () => {
    const records = service.listInstalledSkillRecords();
    const byName = new Map(records.map((record) => [record.skill.name, record]));

    expect([...byName.keys()]).toEqual([
      "global-writer",
      "nested-reviewer",
      "paper-digest",
      "team-handbook",
      "wireframe",
    ]);
    expect([...byName.values()].map((record) => record.skill.rootPath)).toEqual([
      path.resolve(layout.globalSkill),
      path.resolve(layout.nestedGlobalSkill),
      path.resolve(layout.agentPrivateSkill),
      path.resolve(layout.teamSharedSkill),
      path.resolve(layout.teamAgentPrivateSkill),
    ]);
    expect(service.listSkills().map((skill) => skill.name)).toEqual([...byName.keys()]);
  });

  it("keeps listSkills precedence: a global skill wins over a bundled skill with the same name", () => {
    writeSkill(path.join(layout.researchAgentDir, "skills", "global-writer"), "global-writer");

    const record = service.listInstalledSkillRecords().find((entry) => entry.skill.name === "global-writer");
    expect(record?.skill.rootPath).toBe(path.resolve(layout.globalSkill));
  });

  it("builds regular ALL_INSTALLED bindings from enabled records, including skills bundled in another agent's folder", () => {
    service.disableSkill("team-handbook");

    const bindings = service.resolveConfiguredSkillBindingsForAgent(dailyAssistant());
    const resolved = bindings.map((binding) => {
      if (binding.kind !== "resolved") throw new Error("expected resolved binding");
      return [binding.skill.name, binding.skill.rootPath] as const;
    });

    expect(resolved).toEqual([
      ["global-writer", path.resolve(layout.globalSkill)],
      ["nested-reviewer", path.resolve(layout.nestedGlobalSkill)],
      ["paper-digest", path.resolve(layout.agentPrivateSkill)],
      ["wireframe", path.resolve(layout.teamAgentPrivateSkill)],
    ]);
    expect(service.hasEffectiveSkills(dailyAssistant())).toBe(true);
  });

  it("leaves CONFIGURED resolution unchanged", () => {
    const configured = dailyAssistant({ skillScope: "CONFIGURED", skillNames: ["global-writer"] });
    const bindings = service.resolveConfiguredSkillBindingsForAgent(configured);

    expect(bindings.map((binding) => binding.kind === "resolved" ? binding.skill.name : binding.name))
      .toEqual(["global-writer"]);
    expect(service.hasEffectiveSkills(dailyAssistant({ skillScope: "CONFIGURED" }))).toBe(false);
    expect(service.hasEffectiveSkills(configured)).toBe(true);
  });

  it("resolves the normalized skill scope that runtimes map to a request strength (D-15)", () => {
    expect(service.resolveSkillScope(dailyAssistant())).toBe("ALL_INSTALLED");
    expect(service.resolveSkillScope(dailyAssistant({ skillScope: "CONFIGURED" }))).toBe("CONFIGURED");
    expect(service.resolveSkillScope(dailyAssistant({ skillScope: "unknown" as never }))).toBe("CONFIGURED");
    expect(service.resolveSkillScope(null)).toBe("CONFIGURED");
  });

  it("reports no effective skills when every installed skill is disabled", () => {
    for (const record of service.listInstalledSkillRecords()) service.disableSkill(record.skill.name);

    expect(service.hasEffectiveSkills(dailyAssistant())).toBe(false);
    expect(service.resolveConfiguredSkillBindingsForAgent(dailyAssistant())).toEqual([]);
  });

  describe("runtime paths", () => {
    it("AutoByteus: effective skills resolve to the bundled skill's real root path", () => {
      const paths = service.resolveConfiguredSkillsForAgent(dailyAssistant()).map((skill) => skill.rootPath);
      expect(paths).toContain(path.resolve(layout.agentPrivateSkill));
      expect(paths).toContain(path.resolve(layout.teamAgentPrivateSkill));
    });

    it("Codex / Claude / ACP: the shared workspace materializer exposes the bundled skill", async () => {
      const workspace = await fsp.mkdtemp(path.join(tempRoot, "workspace-"));
      const bindings = service.resolveConfiguredSkillBindingsForAgent(dailyAssistant());
      const materializer = new WorkspaceSkillMaterializer({
        runtimeLabel: "Test",
        workspaceSkillsRootSegments: [".test", "skills"],
      });

      const descriptors = await materializer.materializeConfiguredWorkspaceSkills({
        runId: "run-all-installed",
        workingDirectory: workspace,
        workspaceCollisionPolicy: "prefer_workspace",
        requests: bindings.map((binding) => binding.kind === "resolved"
          ? { kind: "expose-resolved" as const, skill: binding.skill }
          : { kind: "reconcile-unresolved" as const, name: binding.name }),
      });

      const exposed = path.join(workspace, ".test", "skills", "paper-digest");
      expect(descriptors.map((descriptor) => descriptor.materializedRootPath)).toContain(exposed);
      expect(fs.readFileSync(path.join(exposed, "SKILL.md"), "utf-8")).toContain("name: paper-digest");
      await materializer.cleanupMaterializedWorkspaceSkills(descriptors);
    });

    it("AGY: the run capsule links every layout, including the bundled agent-private skill", async () => {
      const workspace = await fsp.mkdtemp(path.join(tempRoot, "agy-workspace-"));
      const capsule = await createAgyRunCapsule({
        agentDefinitionId: "autobyteus-daily-assistant",
        runId: "agy-all-installed",
        memoryDir: path.join(tempRoot, "agy-memory"),
        workspacePath: workspace,
        identity: "Identity",
        workspaceCollisionPolicy: "prefer_workspace",
        configuredSkillBindings: service.resolveConfiguredSkillBindingsForAgent(dailyAssistant()),
        mcpDescriptor: null,
      });

      for (const name of ["global-writer", "nested-reviewer", "paper-digest", "team-handbook", "wireframe"]) {
        expect(fs.lstatSync(path.join(capsule.path, ".agents", "skills", name)).isSymbolicLink()).toBe(true);
        expect(fs.existsSync(path.join(capsule.path, ".agents", "skills", name, "SKILL.md"))).toBe(true);
      }
    });
  });
});
