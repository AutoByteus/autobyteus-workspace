import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  AgentMdParseError,
  serializeAgentMd,
} from "../../../src/agent-definition/utils/agent-md-parser.js";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { PromptLoader } from "../../../src/agent-definition/utils/prompt-loader.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("md-centric provider integration", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("throws AgentMdParseError when agent.md is malformed", async () => {
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = uniqueId("bad_agent");
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), "name: malformed", "utf-8");
    await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");

    const provider = new FileAgentDefinitionProvider();
    await expect(provider.getById(agentId)).rejects.toBeInstanceOf(AgentMdParseError);
  });

  it("loads system prompt from agent.md body via PromptLoader", async () => {
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = uniqueId("prompt_agent");
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

    const expectedInstructions = "You are a prompt-loader integration test agent.";
    const md = serializeAgentMd(
      {
        name: "Prompt Loader Agent",
        description: "Prompt loader integration",
        category: "integration",
        role: "assistant",
      },
      expectedInstructions,
    );

    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), md, "utf-8");
    await fs.writeFile(
      path.join(agentDir, "agent-config.json"),
      JSON.stringify({
        toolNames: [],
        skillNames: [],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        avatarUrl: null,
      }),
      "utf-8",
    );

    const loader = new PromptLoader();
    await expect(loader.getPromptTemplateForAgent(agentId)).resolves.toBe(expectedInstructions);
  });

  it("preserves unknown agent-config fields across update round-trips", async () => {
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = uniqueId("unknown_field_agent");
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

    const provider = new FileAgentDefinitionProvider();
    await provider.create(
      new AgentDefinition({
        id: agentId,
        name: "Unknown Field Agent",
        role: "assistant",
        description: "unknown field preservation",
        category: "integration",
        instructions: "Keep unknown config fields during update.",
        toolNames: ["tool-a"],
        skillNames: ["skill-a"],
      }),
    );

    const agentConfigPath = path.join(agentDir, "agent-config.json");
    const originalConfig = JSON.parse(await fs.readFile(agentConfigPath, "utf-8")) as Record<string, unknown>;
    originalConfig.futureConfig = { nestedFlag: true };
    await fs.writeFile(agentConfigPath, JSON.stringify(originalConfig, null, 2), "utf-8");

    await provider.update(
      new AgentDefinition({
        id: agentId,
        name: "Unknown Field Agent",
        role: "assistant",
        description: "updated unknown field preservation",
        category: "integration",
        instructions: "Updated instructions.",
        toolNames: ["tool-a", "tool-b"],
        skillNames: ["skill-a", "skill-b"],
      }),
    );

    const updatedConfig = JSON.parse(await fs.readFile(agentConfigPath, "utf-8")) as Record<string, unknown>;
    expect(updatedConfig.futureConfig).toEqual({ nestedFlag: true });
    expect(updatedConfig.toolNames).toEqual(["tool-a", "tool-b"]);
    expect(updatedConfig.skillNames).toEqual(["skill-a", "skill-b"]);
  });
});
