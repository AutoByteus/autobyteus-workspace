import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { parseAgentMd, serializeAgentMd } from "../../../src/agent-definition/utils/agent-md-parser.js";
import { bootstrapBuiltInAgents } from "../../../src/built-in-agents/built-in-agent-bootstrapper.js";
import { DAILY_ASSISTANT_AGENT_DEFINITION_ID, MODEL_ROUTER_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const MEMORY_COMPACTOR_AGENT_DEFINITION_ID = "autobyteus-memory-compactor";
const RETIRED_PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID = "autobyteus-project-task-manager";
const TEMPLATES_DIR = fileURLToPath(new URL("../../../src/built-in-agents/templates/", import.meta.url));

const createTempDataDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-built-in-agents-"));

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

const readTemplate = async (templateDirName: string, fileName: string): Promise<string> =>
  fs.readFile(path.join(TEMPLATES_DIR, templateDirName, fileName), "utf-8");

describe("BuiltInAgentBootstrapper", () => {
  let tempDataDir: string;
  let previousAgentPackageRoots: string | undefined;

  beforeEach(async () => {
    previousAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = "";
    appConfigProvider.resetForTests();
    tempDataDir = await createTempDataDir();
    appConfigProvider.initialize({ appDataDir: tempDataDir });
  });

  afterEach(async () => {
    appConfigProvider.resetForTests();
    if (previousAgentPackageRoots === undefined) {
      delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    } else {
      process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = previousAgentPackageRoots;
    }
    await fs.rm(tempDataDir, { recursive: true, force: true });
  });

  const createServices = () => ({
    agentDefinitionService: new AgentDefinitionService(),
  });

  const agentDir = (agentDefinitionId: string): string => path.join(
    tempDataDir,
    "agents",
    agentDefinitionId,
  );

  it("neither creates nor rewrites the retired Project Task Manager; removing an installed copy is the migration's job", async () => {
    const retiredDir = agentDir(RETIRED_PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID);
    await fs.mkdir(retiredDir, { recursive: true });
    await fs.writeFile(path.join(retiredDir, "agent.md"), "installed copy from an earlier build", "utf-8");

    const result = await bootstrapBuiltInAgents(createServices());

    expect(result.builtInAgents.some(item => item.agentDefinitionId === RETIRED_PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID)).toBe(false);
    await expect(fs.readFile(path.join(retiredDir, "agent.md"), "utf-8")).resolves.toBe("installed copy from an earlier build");
    await expect(fs.stat(path.join(retiredDir, "agent-config.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  const compactorAgentDir = (): string => agentDir(MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
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

  it("syncs only the registry-defined built-ins", async () => {
    const result = await bootstrapBuiltInAgents(createServices());

    expect(result).toMatchObject({
      agentsDir: path.join(tempDataDir, "agents"),
      refreshedCache: true,
    });
    // autobyteus-32: the internal Model Router is the second built-in.
    expect(result.builtInAgents.map(item => item.agentDefinitionId)).toEqual([DAILY_ASSISTANT_AGENT_DEFINITION_ID, MODEL_ROUTER_AGENT_DEFINITION_ID]);
    expect(resultFor(result, DAILY_ASSISTANT_AGENT_DEFINITION_ID)).toEqual({
      agentDefinitionId: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
      displayName: "Daily Assistant",
      agentDir: agentDir(DAILY_ASSISTANT_AGENT_DEFINITION_ID),
      templateDir: expect.stringContaining("daily-assistant"),
      syncedAgentMd: true,
      syncedAgentConfig: true,
      syncedSkills: true,
      resolved: true,
    });
    expect(result.builtInAgents.some(item => item.agentDefinitionId === MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toBe(false);
    await expect(fs.stat(dailyAssistantAgentDir())).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("leaves the old compactor source intact and preserves standalone local agents", async () => {
    await fs.mkdir(compactorAgentDir(), { recursive: true });
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

    expect(result.builtInAgents.some(item => item.agentDefinitionId === MEMORY_COMPACTOR_AGENT_DEFINITION_ID)).toBe(false);
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent.md"), "utf-8")).resolves.toBe(
      staleCompactorMd,
    );
    await expect(fs.readFile(path.join(compactorAgentDir(), "agent-config.json"), "utf-8")).resolves.toBe(
      JSON.stringify({ toolNames: ["stale_tool"] }),
    );
    expect((await fs.stat(path.join(compactorAgentDir(), "skills"))).isDirectory()).toBe(true);
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

    await expect(fs.stat(compactorAgentDir())).rejects.toMatchObject({code:"ENOENT"});
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

  it("does not overwrite even invalid historical compactor instructions", async () => {
    await fs.mkdir(compactorAgentDir(), {recursive:true});
    await fs.writeFile(path.join(compactorAgentDir(), 'agent.md'), 'historical source');
    await bootstrapBuiltInAgents(createServices());
    expect(await fs.readFile(path.join(compactorAgentDir(), 'agent.md'),'utf8')).toBe('historical source');
  });

  describe("Daily Assistant (platform-owned)", () => {
    const builtInDailyAssistantDir = (): string => agentDir(DAILY_ASSISTANT_AGENT_DEFINITION_ID);

    it("creates the Daily Assistant at the stable default ID with the exact approved template and config", async () => {
      const services = createServices();

      const result = await bootstrapBuiltInAgents(services);

      expect(resultFor(result, DAILY_ASSISTANT_AGENT_DEFINITION_ID)).toMatchObject({
        displayName: "Daily Assistant",
        agentDir: builtInDailyAssistantDir(),
        syncedAgentMd: true,
        syncedAgentConfig: true,
        syncedSkills: true,
        resolved: true,
      });
      expect(DAILY_ASSISTANT_AGENT_DEFINITION_ID).toBe("autobyteus-daily-assistant");
      const template = await readTemplate("daily-assistant", "agent.md");
      expect(createHash("sha256").update(template).digest("hex")).toBe(
        "49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7",
      );
      await expect(fs.readFile(path.join(builtInDailyAssistantDir(), "agent.md"), "utf-8"))
        .resolves.toBe(template);
      const config = await readJson(path.join(builtInDailyAssistantDir(), "agent-config.json"));
      expect(config).toEqual({
        toolNames: [
          "run_bash", "read_file", "read_url", "search_web", "close_tab", "dom_snapshot",
          "list_tabs", "navigate_to", "open_tab", "run_script", "screenshot",
          "get_process_output", "start_background_process", "stop_background_process",
          "download_media", "edit_image", "generate_image", "generate_speech",
          "read_media_file", "list_available_agents",
        ],
        skillNames: [],
        skillScope: "ALL_INSTALLED",
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        avatarUrl: null,
        defaultLaunchConfig: null,
      });
      const visibleDefinitions = await services.agentDefinitionService.getVisibleAgentDefinitions();
      const visible = visibleDefinitions.find((definition) => definition.id === DAILY_ASSISTANT_AGENT_DEFINITION_ID);
      expect(visibleDefinitions.filter((definition) => definition.id === DAILY_ASSISTANT_AGENT_DEFINITION_ID))
        .toHaveLength(1);
      expect(visible).toMatchObject({
        id: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
        ...parseAgentMd(template),
        skillScope: "ALL_INSTALLED",
        ownershipScope: "shared",
        toolNames: config.toolNames,
        defaultLaunchConfig: null,
      });
    });

    it("refreshes an existing same-ID old identity without rewriting history or saved references", async () => {
      await fs.mkdir(builtInDailyAssistantDir(), { recursive: true });
      await fs.writeFile(path.join(builtInDailyAssistantDir(), "agent.md"), serializeAgentMd({
        name: "General Agent",
        description: "Previous built-in identity",
        role: "General Agent",
      }, "OLD BUILT-IN INSTRUCTIONS"));
      await fs.writeFile(path.join(builtInDailyAssistantDir(), "agent-config.json"), '{"toolNames":["read_file"]}');
      const historyDir = path.join(tempDataDir, "memory");
      await fs.mkdir(historyDir, { recursive: true });
      const historyPath = path.join(historyDir, "run_history_index.json");
      const history = JSON.stringify([{
        runId: "existing-run",
        agentDefinitionId: DAILY_ASSISTANT_AGENT_DEFINITION_ID,
        agentName: "General Agent",
        workspaceRootPath: tempDataDir,
        summary: "Previous conversation",
        createdAt: "2026-10-02T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: "2026-10-02T11:00:00.000Z",
      }]);
      await fs.writeFile(historyPath, history);
      const services = createServices();

      await bootstrapBuiltInAgents(services);

      await expect(fs.readFile(historyPath, "utf-8")).resolves.toBe(history);
      await expect(fs.readFile(path.join(builtInDailyAssistantDir(), "agent.md"), "utf-8"))
        .resolves.toBe(await readTemplate("daily-assistant", "agent.md"));
      const definition = await services.agentDefinitionService.getAgentDefinitionById(DAILY_ASSISTANT_AGENT_DEFINITION_ID);
      expect(definition).toMatchObject({ id: DAILY_ASSISTANT_AGENT_DEFINITION_ID, name: "Daily Assistant" });
      expect(definition?.toolNames).toContain("list_available_agents");
      expect((await fs.readdir(path.join(tempDataDir, "agents"))).sort()).toEqual([DAILY_ASSISTANT_AGENT_DEFINITION_ID, MODEL_ROUTER_AGENT_DEFINITION_ID].sort());
    });

    it("replaces edited files and agent-local skills from the template on the next startup", async () => {
      const services = createServices();
      await bootstrapBuiltInAgents(services);
      await services.agentDefinitionService.updateAgentDefinition(DAILY_ASSISTANT_AGENT_DEFINITION_ID, {
        instructions: "USER EDITED GENERAL AGENT",
        skillScope: "CONFIGURED",
        skillNames: ["my-skill"],
        toolNames: ["run_bash"],
        defaultLaunchConfig: {
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: "codex:gpt-5.4",
          llmConfig: null,
        },
      });
      await fs.mkdir(path.join(builtInDailyAssistantDir(), "skills", "local-skill"), { recursive: true });
      await fs.writeFile(path.join(builtInDailyAssistantDir(), "skills", "local-skill", "SKILL.md"), "# local", "utf-8");

      const result = await bootstrapBuiltInAgents(services);

      expect(resultFor(result, DAILY_ASSISTANT_AGENT_DEFINITION_ID)).toMatchObject({
        syncedAgentMd: true,
        syncedAgentConfig: true,
        syncedSkills: true,
        resolved: true,
      });
      await expect(fs.readFile(path.join(builtInDailyAssistantDir(), "agent.md"), "utf-8"))
        .resolves.toBe(await readTemplate("daily-assistant", "agent.md"));
      expect(await readJson(path.join(builtInDailyAssistantDir(), "agent-config.json")))
        .toEqual(JSON.parse(await readTemplate("daily-assistant", "agent-config.json")));
      await expect(fs.stat(path.join(builtInDailyAssistantDir(), "skills"))).rejects.toMatchObject({ code: "ENOENT" });
    });

    it("recreates a missing file from the template", async () => {
      const services = createServices();
      await bootstrapBuiltInAgents(services);
      await fs.rm(path.join(builtInDailyAssistantDir(), "agent-config.json"));

      const result = await bootstrapBuiltInAgents(services);

      expect(resultFor(result, DAILY_ASSISTANT_AGENT_DEFINITION_ID)).toMatchObject({ syncedAgentConfig: true, resolved: true });
      expect(await readJson(path.join(builtInDailyAssistantDir(), "agent-config.json")))
        .toEqual(JSON.parse(await readTemplate("daily-assistant", "agent-config.json")));
    });
  });
});
