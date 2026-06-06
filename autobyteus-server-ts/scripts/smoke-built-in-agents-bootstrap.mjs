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
  skillEvolverDistAgentMdPath,
  skillEvolverDistAgentConfigPath,
] = await Promise.all([
  assertDistAssetPresent("memory-compactor", "agent.md"),
  assertDistAssetPresent("memory-compactor", "agent-config.json"),
  assertDistAssetPresent("skill-evolver", "agent.md"),
  assertDistAssetPresent("skill-evolver", "agent-config.json"),
]);
await assertDistTemplateAbsent("daily-assistant");

const { bootstrapBuiltInAgents } = await import(
  "../dist/built-in-agents/built-in-agent-bootstrapper.js"
);
const {
  MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
  SKILL_EVOLVER_AGENT_DEFINITION_ID,
} = await import(
  "../dist/built-in-agents/built-in-agent-registry.js"
);
const {
  AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID,
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
      name: definitionId === SKILL_EVOLVER_AGENT_DEFINITION_ID ? "Skill Self-Evolver" : "Memory Compactor",
    };
  },
  async refreshCache() {},
};

const fakeServerSettingsService = {
  getSettingValue(key) {
    return settingsByKey.get(key) ?? null;
  },
  updateSetting(key, value) {
    if (
      key === AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID ||
      key === AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID
    ) {
      settingsByKey.set(key, value);
      return [true, "ok"];
    }
    return [false, `unexpected setting key ${key}`];
  },
};

try {
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
  assert.equal(resultById.get(MEMORY_COMPACTOR_AGENT_DEFINITION_ID).seededAgentMd, true);
  assert.equal(resultById.get(MEMORY_COMPACTOR_AGENT_DEFINITION_ID).seededAgentConfig, true);

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
  const skillEvolverAgentDir = path.join(agentsDir, SKILL_EVOLVER_AGENT_DEFINITION_ID);
  const [skillEvolverAgentMd, skillEvolverAgentConfig, skillEvolverDistAgentMd, skillEvolverDistAgentConfig] =
    await Promise.all([
      fs.readFile(path.join(skillEvolverAgentDir, "agent.md"), "utf8"),
      fs.readFile(path.join(skillEvolverAgentDir, "agent-config.json"), "utf8"),
      fs.readFile(skillEvolverDistAgentMdPath, "utf8"),
      fs.readFile(skillEvolverDistAgentConfigPath, "utf8"),
    ]);

  assert.equal(skillEvolverAgentMd, skillEvolverDistAgentMd);
  assert.equal(skillEvolverAgentConfig, skillEvolverDistAgentConfig);
  assert.match(skillEvolverAgentMd, /Skill Self-Evolver/);
  assert.equal(settingsByKey.get(AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID), MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
  assert.equal(settingsByKey.get(AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID), SKILL_EVOLVER_AGENT_DEFINITION_ID);
  await assert.rejects(
    () => fs.stat(path.join(agentsDir, "daily-assistant")),
    (error) => error && error.code === "ENOENT",
    "Daily Assistant must not be server-seeded as a built-in agent",
  );
  console.info("Built-in agents bootstrap smoke check passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
