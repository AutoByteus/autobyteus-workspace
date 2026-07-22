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
  compactorDistAgentMdPath,
  compactorDistAgentConfigPath,
  skillImproverDistAgentMdPath,
  skillImproverDistAgentConfigPath,
] = await Promise.all([
  assertDistAssetPresent("memory-compactor", "agent.md"),
  assertDistAssetPresent("memory-compactor", "agent-config.json"),
  assertDistAssetPresent("retrospective-skill-improver", "agent.md"),
  assertDistAssetPresent("retrospective-skill-improver", "agent-config.json"),
]);
await assertDistTemplateAbsent("daily-assistant");

const { bootstrapBuiltInAgents } = await import(
  "../dist/built-in-agents/built-in-agent-bootstrapper.js"
);
const {
  MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
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
const runtimeDefaultsByKey = new Map();

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
  initializeRuntimeDefault(key, value) {
    if (key !== AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID) {
      throw new Error(`unexpected setting key ${key}`);
    }
    if (runtimeDefaultsByKey.has(key)) {
      return false;
    }
    runtimeDefaultsByKey.set(key, value);
    return true;
  },
};

try {
  const staleCompactorAgentDir = path.join(agentsDir, MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
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

  assert.equal(result.builtInAgents.length, 2);
  assert.equal(result.refreshedCache, true);

  const resultById = new Map(result.builtInAgents.map((item) => [item.agentDefinitionId, item]));
  assert.equal(resultById.get(MEMORY_COMPACTOR_AGENT_DEFINITION_ID).syncedAgentMd, true);
  assert.equal(resultById.get(MEMORY_COMPACTOR_AGENT_DEFINITION_ID).syncedAgentConfig, true);
  assert.equal(resultById.get(MEMORY_COMPACTOR_AGENT_DEFINITION_ID).initializedRuntimeDefault, false);
  assert.equal(resultById.get(RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID).syncedAgentMd, true);
  assert.equal(resultById.get(RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID).syncedAgentConfig, true);
  assert.equal(resultById.get(RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID).initializedRuntimeDefault, true);

  const compactorAgentDir = path.join(agentsDir, MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
  const [compactorAgentMd, compactorAgentConfig, compactorDistAgentMd, compactorDistAgentConfig] =
    await Promise.all([
      fs.readFile(path.join(compactorAgentDir, "agent.md"), "utf8"),
      fs.readFile(path.join(compactorAgentDir, "agent-config.json"), "utf8"),
      fs.readFile(compactorDistAgentMdPath, "utf8"),
      fs.readFile(compactorDistAgentConfigPath, "utf8"),
    ]);

  assert.equal(compactorAgentMd, compactorDistAgentMd);
  assert.equal(compactorAgentConfig, compactorDistAgentConfig);
  assert.match(compactorAgentMd, /Memory Compactor/);
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
  assert.equal(runtimeDefaultsByKey.get(AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID), RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID);
  const standaloneAgentMd = await fs.readFile(path.join(standaloneAgentDir, "agent.md"), "utf8");
  const standaloneAgentConfig = await fs.readFile(path.join(standaloneAgentDir, "agent-config.json"), "utf8");
  assert.equal(standaloneAgentMd, "standalone local agent");
  assert.equal(standaloneAgentConfig, "{\"toolNames\":[\"calendar\"]}");
  console.info("Built-in agents bootstrap smoke check passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
