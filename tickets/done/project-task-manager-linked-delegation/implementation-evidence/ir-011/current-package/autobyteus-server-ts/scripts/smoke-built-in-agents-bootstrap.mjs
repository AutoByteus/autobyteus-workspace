import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const templatesDistDir = path.join(rootDir, "dist", "built-in-agents", "templates");

const assertDistAssetPresent = async (templateDirName, fileName) => {
  const filePath = path.join(templatesDistDir, templateDirName, fileName);
  const stat = await fs.stat(filePath);
  assert.equal(stat.isFile(), true, `${filePath} must be a file`);
  return filePath;
};

const assertDistTemplateAbsent = async (templateDirName) => {
  const filePath = path.join(templatesDistDir, templateDirName);
  await assert.rejects(
    () => fs.stat(filePath),
    (error) => error && error.code === "ENOENT",
    `${filePath} must not exist in built output`,
  );
};

const [
  skillImproverDistAgentMdPath,
  skillImproverDistAgentConfigPath,
  dailyAssistantDistAgentMdPath,
  dailyAssistantDistAgentConfigPath,
  projectTaskManagerDistAgentMdPath,
  projectTaskManagerDistAgentConfigPath,
] = await Promise.all([
  assertDistAssetPresent("retrospective-skill-improver", "agent.md"),
  assertDistAssetPresent("retrospective-skill-improver", "agent-config.json"),
  assertDistAssetPresent("daily-assistant", "agent.md"),
  assertDistAssetPresent("daily-assistant", "agent-config.json"),
  assertDistAssetPresent("project-task-manager", "agent.md"),
  assertDistAssetPresent("project-task-manager", "agent-config.json"),
]);
await assertDistTemplateAbsent("memory-compactor");

const { bootstrapBuiltInAgents } = await import(
  "../dist/built-in-agents/built-in-agent-bootstrapper.js"
);
const {
  DAILY_ASSISTANT_AGENT_DEFINITION_ID,
  PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID,
  RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
} = await import(
  "../dist/built-in-agents/built-in-agent-registry.js"
);
const {
  AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
} = await import(
  "../dist/services/server-settings-service.js"
);

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-built-in-agents-smoke-"));
const agentsDir = path.join(tempRoot, "agents");
const settingsByKey = new Map();

const fakeAgentDefinitionService = {
  async getFreshAgentDefinitionById(definitionId) {
    return {
      id: definitionId,
      name: definitionId === RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID ? "Retrospective Skill Improver" : "Memory Compactor",
    };
  },
  async refreshCache() {},
};

const fakeServerSettingsService = {
  getSettingValue(key) {
    return settingsByKey.get(key) ?? null;
  },
  updateSetting(key, value) {
    if (key === AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID) {
      settingsByKey.set(key, value);
      return [true, "ok"];
    }
    return [false, `unexpected setting key ${key}`];
  },
};

try {
  const staleCompactorAgentDir = path.join(agentsDir, 'autobyteus-memory-compactor');
  const staleSkillImproverAgentDir = path.join(agentsDir, RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID);
  const standaloneAgentDir = path.join(agentsDir, "daily-assistant");
  await fs.mkdir(staleCompactorAgentDir, { recursive: true });
  await fs.mkdir(staleSkillImproverAgentDir, { recursive: true });
  await fs.mkdir(standaloneAgentDir, { recursive: true });
  await fs.writeFile(path.join(staleCompactorAgentDir, "agent.md"), "stale memory compactor", "utf8");
  await fs.writeFile(path.join(staleCompactorAgentDir, "agent-config.json"), "{\"toolNames\":[\"stale_tool\"]}", "utf8");
  await fs.writeFile(path.join(staleSkillImproverAgentDir, "agent.md"), "stale skill improver", "utf8");
  await fs.writeFile(path.join(staleSkillImproverAgentDir, "agent-config.json"), "{\"skillNames\":[\"stale_skill\"]}", "utf8");
  await fs.writeFile(path.join(standaloneAgentDir, "agent.md"), "standalone local agent", "utf8");
  await fs.writeFile(path.join(standaloneAgentDir, "agent-config.json"), "{\"toolNames\":[\"calendar\"]}", "utf8");

  const result = await bootstrapBuiltInAgents({
    agentsDir,
    agentDefinitionService: fakeAgentDefinitionService,
    serverSettingsService: fakeServerSettingsService,
    logger: {
      info() {},
      warn() {},
    },
  });

  assert.deepEqual(result.builtInAgents.map(item => item.agentDefinitionId).sort(), [
    DAILY_ASSISTANT_AGENT_DEFINITION_ID,
    PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID,
    RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
  ].sort());
  assert.equal(result.refreshedCache, true);

  const resultById = new Map(result.builtInAgents.map((item) => [item.agentDefinitionId, item]));
  assert.equal(resultById.get(RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID).syncedAgentMd, true);
  assert.equal(resultById.get(RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID).syncedAgentConfig, true);

  assert.equal(await fs.readFile(path.join(staleCompactorAgentDir, 'agent.md'), 'utf8'), 'stale memory compactor');
  assert.equal(await fs.readFile(path.join(staleCompactorAgentDir, 'agent-config.json'), 'utf8'), '{"toolNames":["stale_tool"]}');
  const skillImproverAgentDir = path.join(agentsDir, RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID);
  const [skillImproverAgentMd, skillImproverAgentConfig, skillImproverDistAgentMd, skillImproverDistAgentConfig] =
    await Promise.all([
      fs.readFile(path.join(skillImproverAgentDir, "agent.md"), "utf8"),
      fs.readFile(path.join(skillImproverAgentDir, "agent-config.json"), "utf8"),
      fs.readFile(skillImproverDistAgentMdPath, "utf8"),
      fs.readFile(skillImproverDistAgentConfigPath, "utf8"),
    ]);

  assert.equal(skillImproverAgentMd, skillImproverDistAgentMd);
  assert.equal(skillImproverAgentConfig, skillImproverDistAgentConfig);
  assert.match(skillImproverAgentMd, /Retrospective Skill Improver/);
  assert.equal(settingsByKey.get(AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID), RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID);
  const managerDir = path.join(agentsDir, PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID);
  const assertManagerTemplate = async () => {
    assert.equal(await fs.readFile(path.join(managerDir, "agent.md"), "utf8"),
      await fs.readFile(projectTaskManagerDistAgentMdPath, "utf8"));
    const managerConfig = await fs.readFile(path.join(managerDir, "agent-config.json"), "utf8");
    assert.equal(managerConfig, await fs.readFile(projectTaskManagerDistAgentConfigPath, "utf8"));
    assert.deepEqual(JSON.parse(managerConfig).toolNames, [
      "list_projects", "list_project_tasks", "create_or_update_task", "list_available_agents",
      "delegate_task", "send_message_to", "read_file",
    ]);
    assert.equal(JSON.parse(managerConfig).defaultLaunchConfig, null);
  };
  assert.equal(resultById.get(PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID).syncedAgentMd, true);
  assert.equal(resultById.get(PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID).syncedAgentConfig, true);
  await assertManagerTemplate();
  const dailyAssistantAgentDir = path.join(agentsDir, DAILY_ASSISTANT_AGENT_DEFINITION_ID);
  assert.equal(
    await fs.readFile(path.join(dailyAssistantAgentDir, "agent.md"), "utf8"),
    await fs.readFile(dailyAssistantDistAgentMdPath, "utf8"),
  );
  assert.equal(
    await fs.readFile(path.join(dailyAssistantAgentDir, "agent-config.json"), "utf8"),
    await fs.readFile(dailyAssistantDistAgentConfigPath, "utf8"),
  );
  await fs.writeFile(path.join(dailyAssistantAgentDir, "agent.md"), "user edited daily assistant", "utf8");
  await fs.writeFile(path.join(managerDir, "agent.md"), "stale manager", "utf8");
  const resyncResult = await bootstrapBuiltInAgents({
    agentsDir,
    agentDefinitionService: fakeAgentDefinitionService,
    serverSettingsService: fakeServerSettingsService,
    logger: { info() {}, warn() {} },
  });
  const resyncById = new Map(resyncResult.builtInAgents.map((item) => [item.agentDefinitionId, item]));
  assert.equal(resyncById.get(DAILY_ASSISTANT_AGENT_DEFINITION_ID).syncedAgentMd, true);
  assert.equal(resyncById.get(PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID).syncedAgentMd, true);
  await assertManagerTemplate();
  assert.equal(
    await fs.readFile(path.join(dailyAssistantAgentDir, "agent.md"), "utf8"),
    await fs.readFile(dailyAssistantDistAgentMdPath, "utf8"),
  );
  assert.ok(
    JSON.parse(await fs.readFile(path.join(dailyAssistantAgentDir, "agent-config.json"), "utf8")).toolNames.includes("read_file"),
  );
  const standaloneAgentMd = await fs.readFile(path.join(standaloneAgentDir, "agent.md"), "utf8");
  const standaloneAgentConfig = await fs.readFile(path.join(standaloneAgentDir, "agent-config.json"), "utf8");
  assert.equal(standaloneAgentMd, "standalone local agent");
  assert.equal(standaloneAgentConfig, "{\"toolNames\":[\"calendar\"]}");
  console.info("Built-in agents bootstrap smoke check passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
