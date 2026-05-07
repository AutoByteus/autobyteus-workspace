import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../../src/agent-definition/services/agent-definition-service.js";
import { serializeAgentMd } from "../../../../src/agent-definition/utils/agent-md-parser.js";
import {
  bootstrapDefaultSuperAssistant,
  DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
} from "../../../../src/agent-definition/default-agents/default-super-assistant-bootstrapper.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import {
  FEATURED_CATALOG_ITEMS_SETTING_KEY,
  parseFeaturedCatalogItemsSetting,
  serializeFeaturedCatalogItemsSetting,
} from "../../../../src/config/featured-catalog-items-setting.js";
import { ServerSettingsService } from "../../../../src/services/server-settings-service.js";

const createTempDataDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-default-super-assistant-"));

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

describe("DefaultSuperAssistantBootstrapper", () => {
  let tempDataDir: string;
  let previousFeaturedSetting: string | undefined;
  let previousAgentPackageRoots: string | undefined;

  beforeEach(async () => {
    previousFeaturedSetting = process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
    previousAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    delete process.env[FEATURED_CATALOG_ITEMS_SETTING_KEY];
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

  it("seeds the shared Super Assistant and initializes it as the default featured agent", async () => {
    const services = createServices();

    const result = await bootstrapDefaultSuperAssistant(services);

    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
    );
    expect(result).toMatchObject({
      agentDefinitionId: DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
      agentDir,
      seededAgentMd: true,
      seededAgentConfig: true,
      resolved: true,
      initializedAsFeatured: true,
    });
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toContain(
      "name: AutoByteus Super Assistant",
    );
    expect(await readJson(path.join(agentDir, "agent-config.json"))).not.toMatchObject({
      featured: expect.anything(),
    });

    const rawFeaturedSetting = services.serverSettingsService.getFeaturedCatalogItemsSettingValue();
    const parsed = parseFeaturedCatalogItemsSetting(rawFeaturedSetting, { rejectDuplicates: true });
    expect(parsed).toMatchObject({
      ok: true,
      setting: {
        items: [
          {
            resourceKind: "AGENT",
            definitionId: DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
            sortOrder: 10,
          },
        ],
      },
    });

    const definition = await services.agentDefinitionService.getFreshAgentDefinitionById(
      DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
    );
    expect(definition).toMatchObject({
      id: DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
      name: "AutoByteus Super Assistant",
      ownershipScope: "shared",
      defaultLaunchConfig: null,
    });
  });

  it("initializes the featured setting when files already exist and the setting is blank", async () => {
    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
    );
    await fs.mkdir(agentDir, { recursive: true });
    const customMd = serializeAgentMd(
      {
        name: "User Edited Super Assistant",
        description: "User-owned general assistant",
        category: "general",
        role: "custom assistant",
      },
      "USER EDITED SUPER ASSISTANT INSTRUCTIONS",
    );
    await fs.writeFile(path.join(agentDir, "agent.md"), customMd, "utf-8");
    await fs.writeFile(path.join(agentDir, "agent-config.json"), JSON.stringify({ defaultLaunchConfig: null }), "utf-8");
    appConfigProvider.config.set(FEATURED_CATALOG_ITEMS_SETTING_KEY, "   ");
    const services = createServices();

    const result = await bootstrapDefaultSuperAssistant(services);

    expect(result).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: false,
      resolved: true,
      initializedAsFeatured: true,
    });
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toBe(customMd);
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toContain(
      DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
    );
  });

  it("preserves an existing intentional empty featured list", async () => {
    const services = createServices();
    const emptyFeaturedValue = serializeFeaturedCatalogItemsSetting({ version: 1, items: [] });
    services.serverSettingsService.updateSetting(FEATURED_CATALOG_ITEMS_SETTING_KEY, emptyFeaturedValue);

    const result = await bootstrapDefaultSuperAssistant(services);

    expect(result).toMatchObject({
      resolved: true,
      initializedAsFeatured: false,
    });
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBe(emptyFeaturedValue);
  });

  it("does not overwrite invalid existing files or initialize an unresolved default", async () => {
    const warn = vi.fn();
    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
    );
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), "not frontmatter", "utf-8");
    await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");
    const services = createServices();

    const result = await bootstrapDefaultSuperAssistant({
      ...services,
      logger: { info: vi.fn(), warn },
    });

    expect(result).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: false,
      resolved: false,
      initializedAsFeatured: false,
    });
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toBe(
      "not frontmatter",
    );
    expect(services.serverSettingsService.getFeaturedCatalogItemsSettingValue()).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("is invalid and was not featured"));
  });
});
