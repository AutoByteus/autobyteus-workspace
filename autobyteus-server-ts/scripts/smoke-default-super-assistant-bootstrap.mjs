import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const superAssistantDistDir = path.join(
  rootDir,
  "dist",
  "agent-definition",
  "default-agents",
  "super-assistant",
);

const assertDistAssetPresent = async (fileName) => {
  const filePath = path.join(superAssistantDistDir, fileName);
  const stat = await fs.stat(filePath);
  assert.equal(stat.isFile(), true, `${filePath} must be a file`);
  return filePath;
};

const [distAgentMdPath, distAgentConfigPath] = await Promise.all([
  assertDistAssetPresent("agent.md"),
  assertDistAssetPresent("agent-config.json"),
]);

const {
  bootstrapDefaultSuperAssistant,
  DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
} = await import("../dist/agent-definition/default-agents/default-super-assistant-bootstrapper.js");
const { FEATURED_CATALOG_ITEMS_SETTING_KEY } = await import(
  "../dist/config/featured-catalog-items-setting.js"
);

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-super-assistant-smoke-"));
const agentsDir = path.join(tempRoot, "agents");
let featuredSettingValue = null;

const fakeAgentDefinitionService = {
  async getFreshAgentDefinitionById(definitionId) {
    return {
      id: definitionId,
      name: "AutoByteus Super Assistant",
    };
  },
  async refreshCache() {},
};

const fakeServerSettingsService = {
  getFeaturedCatalogItemsSettingValue() {
    return featuredSettingValue;
  },
  updateSetting(key, value) {
    assert.equal(key, FEATURED_CATALOG_ITEMS_SETTING_KEY);
    featuredSettingValue = value;
    return [true, "ok"];
  },
};

try {
  const result = await bootstrapDefaultSuperAssistant({
    agentsDir,
    agentDefinitionService: fakeAgentDefinitionService,
    serverSettingsService: fakeServerSettingsService,
    logger: {
      info() {},
      warn() {},
    },
  });

  assert.equal(result.seededAgentMd, true);
  assert.equal(result.seededAgentConfig, true);
  assert.equal(result.resolved, true);
  assert.equal(result.initializedAsFeatured, true);

  const seededAgentDir = path.join(agentsDir, DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID);
  const [seededAgentMd, seededAgentConfig, distAgentMd, distAgentConfig] = await Promise.all([
    fs.readFile(path.join(seededAgentDir, "agent.md"), "utf8"),
    fs.readFile(path.join(seededAgentDir, "agent-config.json"), "utf8"),
    fs.readFile(distAgentMdPath, "utf8"),
    fs.readFile(distAgentConfigPath, "utf8"),
  ]);

  assert.equal(seededAgentMd, distAgentMd);
  assert.equal(seededAgentConfig, distAgentConfig);
  assert.match(seededAgentMd, /AutoByteus Super Assistant/);
  assert.deepEqual(JSON.parse(featuredSettingValue), {
    version: 1,
    items: [
      {
        resourceKind: "AGENT",
        definitionId: DEFAULT_SUPER_ASSISTANT_AGENT_DEFINITION_ID,
        sortOrder: 10,
      },
    ],
  });
  console.info("Default Super Assistant built-output bootstrap smoke check passed.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
