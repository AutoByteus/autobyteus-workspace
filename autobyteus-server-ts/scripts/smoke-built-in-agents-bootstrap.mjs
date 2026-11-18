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
  dailyAssistantDistAgentMdPath,
  dailyAssistantDistAgentConfigPath,
  modelRouterDistAgentMdPath,
  modelRouterDistAgentConfigPath,
] = await Promise.all([
  assertDistAssetPresent("daily-assistant", "agent.md"),
  assertDistAssetPresent("daily-assistant", "agent-config.json"),
  assertDistAssetPresent("model-router", "agent.md"),
  assertDistAssetPresent("model-router", "agent-config.json"),
]);
await assertDistTemplateAbsent("memory-compactor");
await assertDistTemplateAbsent("project-task-manager");

const { bootstrapBuiltInAgents } = await import(
  "../dist/built-in-agents/built-in-agent-bootstrapper.js"
);
const {
  DAILY_ASSISTANT_AGENT_DEFINITION_ID,
  MODEL_ROUTER_AGENT_DEFINITION_ID,
} = await import(
  "../dist/built-in-agents/built-in-agent-registry.js"
);

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-built-in-agents-smoke-"));
const agentsDir = path.join(tempRoot, "agents");

const fakeAgentDefinitionService = {
  async getAgentDefinitionById(definitionId) {
    return { id: definitionId, name: "Daily Assistant" };
  },
  async reloadAgentPackageDefinitions() {},
};

try {
  const staleCompactorAgentDir = path.join(agentsDir, 'autobyteus-memory-compactor');
  const standaloneAgentDir = path.join(agentsDir, "daily-assistant");
  await fs.mkdir(staleCompactorAgentDir, { recursive: true });
  await fs.mkdir(standaloneAgentDir, { recursive: true });
  await fs.writeFile(path.join(staleCompactorAgentDir, "agent.md"), "stale memory compactor", "utf8");
  await fs.writeFile(path.join(staleCompactorAgentDir, "agent-config.json"), "{\"toolNames\":[\"stale_tool\"]}", "utf8");
  await fs.writeFile(path.join(standaloneAgentDir, "agent.md"), "standalone local agent", "utf8");
  await fs.writeFile(path.join(standaloneAgentDir, "agent-config.json"), "{\"toolNames\":[\"calendar\"]}", "utf8");

  const result = await bootstrapBuiltInAgents({
    agentsDir,
    agentDefinitionService: fakeAgentDefinitionService,
    logger: {
      info() {},
      warn() {},
    },
  });

  assert.deepEqual(result.builtInAgents.map(item => item.agentDefinitionId), [DAILY_ASSISTANT_AGENT_DEFINITION_ID, MODEL_ROUTER_AGENT_DEFINITION_ID]);
  assert.equal(result.refreshedCache, true);

  assert.equal(await fs.readFile(path.join(staleCompactorAgentDir, 'agent.md'), 'utf8'), 'stale memory compactor');
  assert.equal(await fs.readFile(path.join(staleCompactorAgentDir, 'agent-config.json'), 'utf8'), '{"toolNames":["stale_tool"]}');
  await assert.rejects(
    () => fs.stat(path.join(agentsDir, "autobyteus-project-task-manager")),
    (error) => error && error.code === "ENOENT",
    "the retired built-in Project Task Manager must not be created",
  );
  const dailyAssistantAgentDir = path.join(agentsDir, DAILY_ASSISTANT_AGENT_DEFINITION_ID);
  assert.equal(
    await fs.readFile(path.join(dailyAssistantAgentDir, "agent.md"), "utf8"),
    await fs.readFile(dailyAssistantDistAgentMdPath, "utf8"),
  );
  assert.equal(
    await fs.readFile(path.join(dailyAssistantAgentDir, "agent-config.json"), "utf8"),
    await fs.readFile(dailyAssistantDistAgentConfigPath, "utf8"),
  );
  // autobyteus-32: the internal Model Router ships its instructions and tools the same way.
  const modelRouterAgentDir = path.join(agentsDir, MODEL_ROUTER_AGENT_DEFINITION_ID);
  assert.equal(await fs.readFile(path.join(modelRouterAgentDir, "agent.md"), "utf8"), await fs.readFile(modelRouterDistAgentMdPath, "utf8"));
  assert.equal(await fs.readFile(path.join(modelRouterAgentDir, "agent-config.json"), "utf8"), await fs.readFile(modelRouterDistAgentConfigPath, "utf8"));
  await fs.writeFile(path.join(dailyAssistantAgentDir, "agent.md"), "user edited daily assistant", "utf8");
  const resyncResult = await bootstrapBuiltInAgents({
    agentsDir,
    agentDefinitionService: fakeAgentDefinitionService,
    logger: { info() {}, warn() {} },
  });
  const resyncById = new Map(resyncResult.builtInAgents.map((item) => [item.agentDefinitionId, item]));
  assert.equal(resyncById.get(DAILY_ASSISTANT_AGENT_DEFINITION_ID).syncedAgentMd, true);
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
