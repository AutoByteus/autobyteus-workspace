import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../../src/agent-definition/services/agent-definition-service.js";
import { serializeAgentMd } from "../../../../src/agent-definition/utils/agent-md-parser.js";
import {
  bootstrapDefaultCompactorAgent,
  DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
} from "../../../../src/agent-execution/compaction/default-compactor-agent-bootstrapper.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  ServerSettingsService,
} from "../../../../src/services/server-settings-service.js";

const createTempDataDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-default-compactor-"));

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

describe("DefaultCompactorAgentBootstrapper", () => {
  let tempDataDir: string;
  let previousCompactorSetting: string | undefined;
  let previousAgentPackageRoots: string | undefined;

  beforeEach(async () => {
    previousCompactorSetting = process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    previousAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    delete process.env[AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID];
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = "";
    appConfigProvider.resetForTests();
    tempDataDir = await createTempDataDir();
    appConfigProvider.initialize({ appDataDir: tempDataDir });
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
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

  it("seeds the default shared compactor and selects it when the setting is blank", async () => {
    const services = createServices();

    const result = await bootstrapDefaultCompactorAgent(services);

    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );
    expect(result).toMatchObject({
      agentDefinitionId: DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
      agentDir,
      seededAgentMd: true,
      seededAgentConfig: true,
      resolved: true,
      selectedAsDefault: true,
    });
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toContain(
      "name: Memory Compactor",
    );
    const config = await readJson(path.join(agentDir, "agent-config.json"));
    expect(config.defaultLaunchConfig).toBeNull();
    expect(config).not.toMatchObject({
      runtimeKind: expect.anything(),
      llmModelIdentifier: expect.anything(),
    });
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );

    const definition = await services.agentDefinitionService.getFreshAgentDefinitionById(
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );
    expect(definition).toMatchObject({
      id: DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
      name: "Memory Compactor",
      ownershipScope: "shared",
      defaultLaunchConfig: null,
    });
  });

  it("preserves an existing user-selected compactor setting", async () => {
    const services = createServices();
    services.serverSettingsService.updateSetting(
      AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
      "custom-memory-compactor",
    );

    const result = await bootstrapDefaultCompactorAgent(services);

    expect(result).toMatchObject({
      resolved: true,
      selectedAsDefault: false,
    });
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBe(
      "custom-memory-compactor",
    );
  });

  it("creates only a missing config file and preserves existing agent instructions", async () => {
    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );
    await fs.mkdir(agentDir, { recursive: true });
    const customMd = serializeAgentMd(
      {
        name: "User Edited Memory Compactor",
        description: "User-owned custom instructions",
        category: "memory",
        role: "custom compactor",
      },
      "USER EDITED INSTRUCTIONS",
    );
    await fs.writeFile(path.join(agentDir, "agent.md"), customMd, "utf-8");
    const services = createServices();

    const result = await bootstrapDefaultCompactorAgent(services);

    expect(result).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: true,
      resolved: true,
      selectedAsDefault: true,
    });
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toBe(
      customMd,
    );
    await expect(fs.readFile(path.join(agentDir, "agent-config.json"), "utf-8")).resolves.toContain(
      '"defaultLaunchConfig": null',
    );
  });

  it("lists the default through normal paths and preserves normal user edits on later startup", async () => {
    const services = createServices();
    await bootstrapDefaultCompactorAgent(services);

    const visibleDefinitions = await services.agentDefinitionService.getVisibleAgentDefinitions();
    expect(visibleDefinitions.some((definition) => definition.id === DEFAULT_COMPACTOR_AGENT_DEFINITION_ID)).toBe(true);

    await services.agentDefinitionService.updateAgentDefinition(
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
      {
        instructions: "USER EDITED COMPACTOR INSTRUCTIONS",
        defaultLaunchConfig: {
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "codex:gpt-5.4",
          llmConfig: { reasoning_effort: "medium" },
        },
      },
    );

    const result = await bootstrapDefaultCompactorAgent(services);

    expect(result).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: false,
      resolved: true,
      selectedAsDefault: false,
    });
    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toContain(
      "USER EDITED COMPACTOR INSTRUCTIONS",
    );
    expect(await readJson(path.join(agentDir, "agent-config.json"))).toMatchObject({
      defaultLaunchConfig: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "codex:gpt-5.4",
        llmConfig: { reasoning_effort: "medium" },
      },
    });
  });

  it("does not overwrite invalid existing files or force-select an unresolved default", async () => {
    const warn = vi.fn();
    const agentDir = path.join(
      tempDataDir,
      "agents",
      DEFAULT_COMPACTOR_AGENT_DEFINITION_ID,
    );
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), "not frontmatter", "utf-8");
    await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");
    const services = createServices();

    const result = await bootstrapDefaultCompactorAgent({
      ...services,
      logger: { info: vi.fn(), warn },
    });

    expect(result).toMatchObject({
      seededAgentMd: false,
      seededAgentConfig: false,
      resolved: false,
      selectedAsDefault: false,
    });
    await expect(fs.readFile(path.join(agentDir, "agent.md"), "utf-8")).resolves.toBe(
      "not frontmatter",
    );
    expect(services.serverSettingsService.getCompactionAgentDefinitionId()).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("is invalid and was not selected"));
  });
});
