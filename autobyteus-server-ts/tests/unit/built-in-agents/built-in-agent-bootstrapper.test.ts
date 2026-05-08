import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { serializeAgentMd } from "../../../src/agent-definition/utils/agent-md-parser.js";
import { bootstrapBuiltInAgents } from "../../../src/built-in-agents/built-in-agent-bootstrapper.js";
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { FEATURED_CATALOG_ITEMS_SETTING_KEY } from "../../../src/config/featured-catalog-items-setting.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  ServerSettingsService,
} from "../../../src/services/server-settings-service.js";

const createTempDataDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-built-in-agents-"));

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

describe("BuiltInAgentBootstrapper", () => {
  let tempDataDir: string;
  let previousFeaturedSetting: string | undefined;
  let previousCompactorSetting: string | undefined;
  let previousAgentPackageRoots: string | undefined;

  beforeEach(async () => {
    previousFeaturedSetting = process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    previousCompactorSetting = process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    previousAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    delete process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    delete process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
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

  const compactorAgentDir = (): string => path.join(
    tempDataDir,
    "agents",
    MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
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

  it("seeds Memory Compactor only and initializes the blank compaction setting", async () => {
    const services = createServices();

    const result = await bootstrapBuiltInAgents(services);

    expect(result).toMatchObject({
      agentsDir: path.join(tempDataDir, "agents"),
      refreshedCache: true,
    });
    expect(result.builtInAgents).toHaveLength(1);
    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      displayName: "Memory Compactor",
      agentDir: compactorAgentDir(),
      seededAgentMd: true,
      seededAgentConfig: true,
      resolved: true,
      initializedSetting: true,
    });

    await expect(
      fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8"),
    ).resolves.toContain("name: Memory Compactor");
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    );

    await expect(services.agentDefinitionService.getFreshAgentDefinitionById(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    )).resolves.toMatchObject({
      id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      name: "Memory Compactor",
      ownershipScope: "shared",
      defaultLaunchConfig: null,
    });
    await expect(
      services.agentDefinitionService.getFreshAgentDefinitionById("daily-assistant"),
    ).resolves.toBeNull();
  });

  it("preserves an existing compaction setting and leaves featured settings untouched", async () => {
    const services = createServices();
    services.serverSettingsService.updateSetting(
      AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
      "custom-memory-compactor",
    );

    const result = await bootstrapBuiltInAgents(services);

    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      resolved: true,
      initializedSetting: false,
    });
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      "custom-memory-compactor",
    );
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves user-edited Memory Compactor instructions while seeding only missing files", async () => {
    await fs.mkdir(compactorAgentDir(), { recursive: true });
    const customCompactorMd = serializeAgentMd(
      {
        name: "User Edited Memory Compactor",
        description: "User-owned custom instructions",
        category: "memory",
        role: "custom compactor",
      },
      "USER EDITED COMPACTOR INSTRUCTIONS",
    );
    await fs.writeFile(path.join(compactorAgentDir(), "agent.md"), customCompactorMd, "utf-8");
    const services = createServices();

    const result = await bootstrapBuiltInAgents(services);

    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: true,
      resolved: true,
      initializedSetting: true,
    });
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      customCompactorMd,
    );
    await expect(
      fs.readFile(path.join(compactorAgentDir(), "agent-config.json"), "utf-8"),
    ).resolves.toContain('"defaultLaunchConfig": null');
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
  });

  it("does not initialize the compaction setting when Memory Compactor is invalid", async () => {
    const warn = vi.fn();
    await fs.mkdir(compactorAgentDir(), { recursive: true });
    await fs.writeFile(path.join(compactorAgentDir(), "agent.md"), "not frontmatter", "utf-8");
    await fs.writeFile(path.join(compactorAgentDir(), "agent-config.json"), "{}\n", "utf-8");
    const services = createServices();

    const result = await bootstrapBuiltInAgents({
      ...services,
      logger: { info: vi.fn(), warn },
    });

    expect(result.builtInAgents).toHaveLength(1);
    expect(resultFor(result, MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: false,
      resolved: false,
      initializedSetting: false,
    });
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBeNull();
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("is invalid"));
  });

  it("lists Memory Compactor through normal paths and preserves normal user edits", async () => {
    const services = createServices();
    await bootstrapBuiltInAgents(services);

    const visibleDefinitions = await services.agentDefinitionService.getVisibleAgentDefinitions();
    expect(
      visibleDefinitions.some((definition) => definition.id === MEMORY_COMPACTOR_AGENT_DEFINITION_ID),
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
      seededAgentMd: false,
      seededAgentConfig: false,
      resolved: true,
      initializedSetting: false,
    });
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toContain(
      "USER EDITED COMPACTOR INSTRUCTIONS",
    );
    expect(await readJson(path.join(compactorAgentDir(), "agent-config.json"))).toMatchObject({
      defaultLaunchConfig: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "codex:gpt-5.4",
        llmConfig: { reasoning_effort: "medium" },
      },
    });
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
  });
});
