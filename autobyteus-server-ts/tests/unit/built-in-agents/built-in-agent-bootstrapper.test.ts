import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { serializeAgentMd } from "../../../src/agent-definition/utils/agent-md-parser.js";
import { bootstrapBuiltInAgents } from "../../../src/built-in-agents/built-in-agent-bootstrapper.js";
import {
  MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
  SKILL_EVOLVER_AGENT_DEFINITION_ID,
} from "../../../src/built-in-agents/built-in-agent-registry.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { FEATURED_CATALOG_ITEMS_SETTING_KEY } from "../../../src/config/featured-catalog-items-setting.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID,
  ServerSettingsService,
} from "../../../src/services/server-settings-service.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";

const TEMPLATES_DIR = fileURLToPath(new URL("../../../src/built-in-agents/templates/", import.meta.url));

const createTempDataDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-built-in-agents-"));

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

const readTemplate = async (templateDirName: string, fileName: string): Promise<string> =>
  fs.readFile(path.join(TEMPLATES_DIR, templateDirName, fileName), "utf-8");

describe("BuiltInAgentBootstrapper", () => {
  let tempDataDir: string;
  let previousFeaturedSetting: string | undefined;
  let previousCompactorSetting: string | undefined;
  let previousSkillEvolverSetting: string | undefined;
  let previousAgentPackageRoots: string | undefined;

  beforeEach(async () => {
    previousFeaturedSetting = process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    previousCompactorSetting = process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    previousSkillEvolverSetting = process.env[AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID];
    previousAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    delete process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    delete process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    delete process.env[AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID];
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = "";
    appConfigProvider.resetForTests();
    tempDataDir = await createTempDataDir();
    appConfigProvider.initialize({ appDataDir: tempDataDir });
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    if (previousFeaturedSetting === undefined) {
      delete process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    } else {
      process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY] = previousFeaturedSetting;
    }
    if (previousCompactorSetting === undefined) {
      delete process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    } else {
      process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID] = previousCompactorSetting;
    }
    if (previousSkillEvolverSetting === undefined) {
      delete process.env[AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID];
    } else {
      process.env[AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID] = previousSkillEvolverSetting;
    }
    if (previousAgentPackageRoots === undefined) {
      delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    } else {
      process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = previousAgentPackageRoots;
    }
    await fs.rm(tempDataDir, { recursive: true, force: true });
  });

  const createServices = () => ({
    agentDefinitionService: new AgentDefinitionService(),
    serverSettingsService: new ServerSettingsService(),
  });

  const agentDir = (agentDefinitionId: string): string => path.join(
    tempDataDir,
    "agents",
    agentDefinitionId,
  );

  const compactorAgentDir = (): string => agentDir(MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
  const skillEvolverAgentDir = (): string => agentDir(SKILL_EVOLVER_AGENT_DEFINITION_ID);
  const skillEvolverPrivateSkillDir = (): string => path.join(
    skillEvolverAgentDir(),
    "skills",
    "retrospective-skill-improver",
  );
  const dailyAssistantAgentDir = (): string => path.join(tempDataDir, "agents", "daily-assistant");

  const resultFor = <T extends { builtInAgents: Array<{ agentDefinitionId: string }> }>(
    result: T,
    agentDefinitionId: string,
  ): T["builtInAgents"][number] => {
    const item = result.builtInAgents.find(
      (candidate) => candidate.agentDefinitionId === agentDefinitionId,
    );
    expect(item).toBeDefined();
    return item as T["builtInAgents"][number];
  };

  it("syncs registry-defined built-ins and initializes blank built-in settings", async () => {
    const services = createServices();

    const result = await bootstrapBuiltInAgents(services);

    expect(result).toMatchObject({
      agentsDir: path.join(tempDataDir, "agents"),
      refreshedCache: true,
    });
    expect(result.builtInAgents).toHaveLength(2);
    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      displayName: "Memory Compactor",
      agentDir: compactorAgentDir(),
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
      initializedSetting: true,
    });
    expect(resultFor(result, SKILL_EVOLVER_AGENT_DEFINITION_ID)).toMatchObject({
      agentDefinitionId: SKILL_EVOLVER_AGENT_DEFINITION_ID,
      displayName: "Retrospective Skill Improver",
      agentDir: skillEvolverAgentDir(),
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
      initializedSetting: true,
    });

    await expect(
      fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8"),
    ).resolves.toContain("name: Memory Compactor");
    await expect(
      fs.readFile(path.join(skillEvolverAgentDir(), "agent.md"), "utf-8"),
    ).resolves.toContain("name: Retrospective Skill Improver");
    await expect(
      fs.readFile(path.join(skillEvolverPrivateSkillDir(), "SKILL.md"), "utf-8"),
    ).resolves.toContain("name: retrospective-skill-improver");
    expect(await readJson(path.join(skillEvolverAgentDir(), "agent-config.json"))).toMatchObject({
      skillNames: ["retrospective-skill-improver"],
    });
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    );
    expect(services.serverSettingsService.getSelfEvolutionDefaultEvolverAgentDefinitionId()).toBe(
      SKILL_EVOLVER_AGENT_DEFINITION_ID,
    );

    await expect(services.agentDefinitionService.getFreshAgentDefinitionById(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    )).resolves.toMatchObject({
      id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      name: "Memory Compactor",
      ownershipScope: "shared",
      defaultLaunchConfig: null,
    });
    const skillEvolverDefinition = await services.agentDefinitionService.getFreshAgentDefinitionById(
      SKILL_EVOLVER_AGENT_DEFINITION_ID,
    );
    expect(skillEvolverDefinition).toMatchObject({
      id: SKILL_EVOLVER_AGENT_DEFINITION_ID,
      name: "Retrospective Skill Improver",
      skillNames: ["retrospective-skill-improver"],
      ownershipScope: "shared",
      defaultLaunchConfig: null,
    });
    const resolvedConfiguredSkills = new SkillService().resolveConfiguredSkillsForAgent(skillEvolverDefinition);
    expect(resolvedConfiguredSkills).toHaveLength(1);
    expect(resolvedConfiguredSkills[0]).toMatchObject({
      name: "retrospective-skill-improver",
      rootPath: path.resolve(skillEvolverPrivateSkillDir()),
    });
    expect(resolvedConfiguredSkills[0]?.content).toContain("Retrospective Skill Improver");

    await expect(
      services.agentDefinitionService.getFreshAgentDefinitionById("daily-assistant"),
    ).resolves.toBeNull();
  });

  it("preserves existing built-in settings and leaves featured settings untouched", async () => {
    const services = createServices();
    services.serverSettingsService.updateSetting(
      AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
      "custom-memory-compactor",
    );
    services.serverSettingsService.updateSetting(
      AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID,
      "custom-retrospective-skill-improver",
    );

    const result = await bootstrapBuiltInAgents(services);

    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      resolved: true,
      initializedSetting: false,
    });
    expect(resultFor(result, SKILL_EVOLVER_AGENT_DEFINITION_ID)).toMatchObject({
      resolved: true,
      initializedSetting: false,
    });
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      "custom-memory-compactor",
    );
    expect(services.serverSettingsService.getSelfEvolutionDefaultEvolverAgentDefinitionId()).toBe(
      "custom-retrospective-skill-improver",
    );
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("overwrites stale built-in files for both registry ids and preserves standalone local agents", async () => {
    await fs.mkdir(compactorAgentDir(), { recursive: true });
    await fs.mkdir(skillEvolverAgentDir(), { recursive: true });
    const staleCompactorMd = serializeAgentMd(
      {
        name: "Stale Memory Compactor",
        description: "Old app-data instructions",
        category: "memory",
        role: "stale compactor",
      },
      "STALE COMPACTOR INSTRUCTIONS",
    );
    await fs.writeFile(path.join(compactorAgentDir(), "agent.md"), staleCompactorMd, "utf-8");
    await fs.writeFile(path.join(compactorAgentDir(), "agent-config.json"), JSON.stringify({ toolNames: ["stale_tool"] }), "utf-8");
    await fs.mkdir(path.join(compactorAgentDir(), "skills", "stale-compactor-skill"), { recursive: true });
    await fs.writeFile(path.join(compactorAgentDir(), "skills", "stale-compactor-skill", "SKILL.md"), "# stale\n", "utf-8");
    await fs.writeFile(path.join(skillEvolverAgentDir(), "agent.md"), "stale retrospective skill improver", "utf-8");
    await fs.writeFile(path.join(skillEvolverAgentDir(), "agent-config.json"), JSON.stringify({ skillNames: ["stale_skill"] }), "utf-8");
    await fs.mkdir(skillEvolverPrivateSkillDir(), { recursive: true });
    await fs.writeFile(path.join(skillEvolverPrivateSkillDir(), "stale.md"), "stale private skill file\n", "utf-8");

    await fs.mkdir(dailyAssistantAgentDir(), { recursive: true });
    const dailyAgentMd = serializeAgentMd(
      {
        name: "Daily Assistant",
        description: "User-owned standalone agent",
        category: "personal",
        role: "assistant",
      },
      "USER STANDALONE INSTRUCTIONS",
    );
    await fs.writeFile(path.join(dailyAssistantAgentDir(), "agent.md"), dailyAgentMd, "utf-8");
    await fs.writeFile(path.join(dailyAssistantAgentDir(), "agent-config.json"), JSON.stringify({ toolNames: ["calendar"] }), "utf-8");

    const services = createServices();

    const result = await bootstrapBuiltInAgents(services);

    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
      initializedSetting: true,
    });
    expect(resultFor(result, SKILL_EVOLVER_AGENT_DEFINITION_ID)).toMatchObject({
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
      initializedSetting: true,
    });
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      await readTemplate("memory-compactor", "agent.md"),
    );
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent-config.json"), "utf-8")).resolves.toBe(
      await readTemplate("memory-compactor", "agent-config.json"),
    );
    await expect(fs.readFile(path.join(skillEvolverAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      await readTemplate("retrospective-skill-improver", "agent.md"),
    );
    await expect(fs.readFile(path.join(skillEvolverAgentDir(), "agent-config.json"), "utf-8")).resolves.toBe(
      await readTemplate("retrospective-skill-improver", "agent-config.json"),
    );
    await expect(fs.stat(path.join(compactorAgentDir(), "skills"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(path.join(skillEvolverPrivateSkillDir(), "stale.md"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.readFile(path.join(skillEvolverPrivateSkillDir(), "SKILL.md"), "utf-8")).resolves.toBe(
      await readTemplate("retrospective-skill-improver", "skills/retrospective-skill-improver/SKILL.md"),
    );
    await expect(fs.readFile(path.join(dailyAssistantAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      dailyAgentMd,
    );
    expect(await readJson(path.join(dailyAssistantAgentDir(), "agent-config.json"))).toMatchObject({
      toolNames: ["calendar"],
    });
  });

  it("does not overwrite user package roots while syncing the app-data built-ins", async () => {
    const packageRoot = path.join(tempDataDir, "user-package-root");
    const packageCompactorDir = path.join(packageRoot, "agents", MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
    await fs.mkdir(packageCompactorDir, { recursive: true });
    const packageCompactorMd = serializeAgentMd(
      {
        name: "Package Memory Compactor",
        description: "Package-owned instructions",
        category: "memory",
        role: "package compactor",
      },
      "PACKAGE SOURCE INSTRUCTIONS",
    );
    await fs.writeFile(path.join(packageCompactorDir, "agent.md"), packageCompactorMd, "utf-8");
    await fs.writeFile(path.join(packageCompactorDir, "agent-config.json"), JSON.stringify({ skillNames: ["package_skill"] }), "utf-8");
    await fs.mkdir(path.join(packageCompactorDir, "skills", "package_skill"), { recursive: true });
    await fs.writeFile(
      path.join(packageCompactorDir, "skills", "package_skill", "SKILL.md"),
      "---\nname: package_skill\ndescription: Package-owned skill.\n---\n\n# Package Skill\n",
      "utf-8",
    );

    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = packageRoot;
    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: tempDataDir });
    const services = createServices();

    await bootstrapBuiltInAgents(services);

    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      await readTemplate("memory-compactor", "agent.md"),
    );
    await expect(fs.readFile(path.join(packageCompactorDir, "agent.md"), "utf-8")).resolves.toBe(
      packageCompactorMd,
    );
    expect(await readJson(path.join(packageCompactorDir, "agent-config.json"))).toMatchObject({
      skillNames: ["package_skill"],
    });
    await expect(
      fs.readFile(path.join(packageCompactorDir, "skills", "package_skill", "SKILL.md"), "utf-8"),
    ).resolves.toContain("Package-owned skill");
  });

  it("overwrites invalid stale Memory Compactor instructions before resolving defaults", async () => {
    const warn = vi.fn();
    await fs.mkdir(compactorAgentDir(), { recursive: true });
    await fs.writeFile(path.join(compactorAgentDir(), "agent.md"), "not frontmatter", "utf-8");
    await fs.writeFile(path.join(compactorAgentDir(), "agent-config.json"), "{}\n", "utf-8");
    const services = createServices();

    const result = await bootstrapBuiltInAgents({
      ...services,
      logger: { info: vi.fn(), warn },
    });

    expect(result.builtInAgents).toHaveLength(2);
    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
      initializedSetting: true,
    });
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    );
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      await readTemplate("memory-compactor", "agent.md"),
    );
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("is invalid"));
  });

  it("lists synced built-ins through normal paths and restores product-managed files on the next startup", async () => {
    const services = createServices();
    await bootstrapBuiltInAgents(services);

    const visibleDefinitions = await services.agentDefinitionService.getVisibleAgentDefinitions();
    expect(
      visibleDefinitions.some((definition) => definition.id === MEMORY_COMPACTOR_AGENT_DEFINITION_ID),
    ).toBe(true);
    expect(
      visibleDefinitions.some((definition) => definition.id === SKILL_EVOLVER_AGENT_DEFINITION_ID),
    ).toBe(true);
    expect(visibleDefinitions.some((definition) => definition.id === "daily-assistant")).toBe(false);

    await services.agentDefinitionService.updateAgentDefinition(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      {
        instructions: "USER EDITED COMPACTOR INSTRUCTIONS",
        defaultLaunchConfig: {
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "codex:gpt-5.4",
          llmConfig: { reasoning_effort: "medium" },
        },
      },
    );

    const result = await bootstrapBuiltInAgents(services);

    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
      initializedSetting: false,
    });
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      await readTemplate("memory-compactor", "agent.md"),
    );
    expect(await readJson(path.join(compactorAgentDir(), "agent-config.json"))).toMatchObject({
      defaultLaunchConfig: null,
    });
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
  });
});
