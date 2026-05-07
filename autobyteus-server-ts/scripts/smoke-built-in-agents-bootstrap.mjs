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

const [compactorDistAgentMdPath, compactorDistAgentConfigPath] = await Promise.all([
  assertDistAssetPresent("memory-compactor", "agent.md"),
  assertDistAssetPresent("memory-compactor", "agent-config.json"),
]);
await assertDistTemplateAbsent("daily-assistant");

const { bootstrapBuiltInAgents } = await import(
  "../dist/built-in-agents/built-in-agent-bootstrapper.js"
);
const { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } = await import(
  "../dist/built-in-agents/built-in-agent-registry.js"
);
const { AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID } = await import(
  "../dist/services/server-settings-service.js"
);

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-built-in-agents-smoke-"));
const agentsDir = path.join(tempRoot, "agents");
let compactionSettingValue = null;

const fakeAgentDefinitionService = {
  async getFreshAgentDefinitionById(definitionId) {
    return {
      id: definitionId,
      name: "Memory Compactor",
    };
  },
  async refreshCache() {},
};

const fakeServerSettingsService = {
  getCompactionAgentDefinitionId() {
    return compactionSettingValue;
  },
  updateSetting(key, value) {
    if (key === AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID) {
      compactionSettingValue = value;
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

  assert.equal(result.builtInAgents.length, 1);
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
  assert.equal(compactionSettingValue, MEMORY_COMPACTOR_AGENT_DEFINITION_ID);
  await assert.rejects(
    () => fs.stat(path.join(agentsDir, "daily-assistant")),
    (error) => error && error.code === "ENOENT",
    "Daily Assistant must not be server-seeded as a built-in agent",
  );
  console.info("Built-in agents bootstrap smoke check passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
