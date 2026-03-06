import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentConfig } from "autobyteus-ts/agent/context/agent-config.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { PromptLoader } from "../../../src/agent-definition/utils/prompt-loader.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

describe("AgentRunManager prompt loading integration (no mocks)", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const target of cleanupPaths) {
      await fs.rm(target, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  it("uses instructions from agent.md as the system prompt", async () => {
    const provider = new FileAgentDefinitionProvider();
    const agentDefinitionService = new AgentDefinitionService({
      provider,
    });

    const unique = `fallback_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const description = `Description fallback for ${unique}`;
    const instructions = `Follow instructions for ${unique}`;
    const created = await agentDefinitionService.createAgentDefinition({
      name: `Fallback Agent ${unique}`,
      role: "assistant",
      description,
      instructions,
      toolNames: [],
    });
    expect(created.id).toBeTruthy();
    const agentDir = path.join(appConfigProvider.config.getAppDataDir(), "agents", created.id as string);
    cleanupPaths.add(agentDir);

    let capturedConfig: AgentConfig | null = null;
    const manager = new AgentRunManager({
      agentDefinitionService,
      promptLoader: new PromptLoader({ agentDefinitionService }),
      llmFactory: {
        createLLM: async () => ({}) as any,
      } as any,
      agentFactory: {
        createAgent: (config: AgentConfig) => {
          capturedConfig = config;
          return {
            agentId: `run_${unique}`,
            start: () => undefined,
          };
        },
      } as any,
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: `ws_${unique}`,
          getBasePath: () => appConfigProvider.config.getMemoryDir(),
          getName: () => `ws_${unique}`,
        }),
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
      registries: {
        input: {
          getProcessor: () => undefined,
          getOrderedProcessorOptions: () => [],
        },
        llmResponse: {
          getProcessor: () => undefined,
          getOrderedProcessorOptions: () => [],
        },
        systemPrompt: {
          getProcessor: () => undefined,
          getOrderedProcessorOptions: () => [],
        },
        toolExecutionResult: {
          getProcessor: () => undefined,
          getOrderedProcessorOptions: () => [],
        },
        toolInvocationPreprocessor: {
          getPreprocessor: () => undefined,
          getOrderedProcessorOptions: () => [],
        },
        lifecycle: {
          getProcessor: () => undefined,
          getOrderedProcessorOptions: () => [],
        },
      },
      waitForIdle: async () => undefined,
    });

    const runId = await manager.createAgentRun({
      agentDefinitionId: created.id as string,
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
    });

    expect(runId).toBe(`run_${unique}`);
    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig?.systemPrompt).toBe(instructions);
  });
});
