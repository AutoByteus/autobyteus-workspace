import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentConfig } from "autobyteus-ts/agent/context/agent-config.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import {
  parseAgentMd,
  serializeAgentMd,
} from "../../../src/agent-definition/utils/agent-md-parser.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

describe("AgentRunService fresh definition runtime integration", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const target of cleanupPaths) {
      await fs.rm(target, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
  });

  const buildRunService = (
    agentDefinitionService: AgentDefinitionService,
    onCreateAgent: (config: AgentConfig) => void,
  ) => {
    const workspaceById = new Map<string, { workspaceId: string; getBasePath: () => string }>();
    const workspaceManager = {
      ensureWorkspaceByRootPath: async (workspaceRootPath: string) => {
        const workspace = {
          workspaceId: "ws_runtime_fresh_definition",
          getBasePath: () => workspaceRootPath,
          getName: () => "ws_runtime_fresh_definition",
        };
        workspaceById.set(workspace.workspaceId, workspace);
        return workspace;
      },
      getWorkspaceById: (workspaceId: string) => workspaceById.get(workspaceId) ?? null,
      getOrCreateTempWorkspace: async () => ({
        workspaceId: "ws_runtime_fresh_definition",
        getBasePath: () => appConfigProvider.config.getMemoryDir(),
        getName: () => "ws_runtime_fresh_definition",
      }),
    };
    const autoByteusBackendFactory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService,
      llmFactory: {
        createLLM: async () => ({}) as any,
      } as any,
      agentFactory: {
        createAgentWithId: (agentId: string, config: AgentConfig) => {
          onCreateAgent(config);
          return {
            agentId,
            currentStatus: "IDLE",
            context: {
              config,
              state: { activeTurnId: null },
            },
            start: () => undefined,
            postUserMessage: async () => undefined,
            postToolExecutionApproval: async () => undefined,
            stop: async () => undefined,
          };
        },
        restoreAgent: (agentId: string, config: AgentConfig) => ({
          agentId,
          currentStatus: "IDLE",
          context: {
            config,
            state: { activeTurnId: null },
          },
          start: () => undefined,
          postUserMessage: async () => undefined,
          postToolExecutionApproval: async () => undefined,
          stop: async () => undefined,
        }),
        getAgent: () => null,
        listActiveAgentIds: () => [],
        removeAgent: async () => true,
      } as any,
      workspaceManager: workspaceManager as any,
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

    const manager = new AgentRunManager({
      autoByteusBackendFactory,
    });
    return new AgentRunService(appConfigProvider.config.getMemoryDir(), {
      agentRunManager: manager,
      workspaceManager: workspaceManager as never,
      agentDefinitionService,
    });
  };

  it("uses fresh definition instructions for the next run even when the cache is stale", async () => {
    const agentDefinitionService = new AgentDefinitionService();
    const unique = `fresh_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const initialInstructions = `Initial instructions for ${unique}`;
    const updatedInstructions = `Updated instructions for ${unique}`;
    const description = `Description fallback for ${unique}`;

    const created = await agentDefinitionService.createAgentDefinition({
      name: `Fresh Agent ${unique}`,
      role: "assistant",
      description,
      instructions: initialInstructions,
      toolNames: [],
    });
    expect(created.id).toBeTruthy();

    const agentDir = path.join(appConfigProvider.config.getAppDataDir(), "agents", created.id as string);
    cleanupPaths.add(agentDir);

    const cachedBeforeEdit = await agentDefinitionService.getAgentDefinitionById(created.id as string);
    expect(cachedBeforeEdit?.instructions).toBe(initialInstructions);

    const agentMdPath = path.join(agentDir, "agent.md");
    const parsedBeforeEdit = parseAgentMd(await fs.readFile(agentMdPath, "utf-8"), agentMdPath);
    await fs.writeFile(
      agentMdPath,
      serializeAgentMd(
        {
          name: parsedBeforeEdit.name,
          description: parsedBeforeEdit.description,
          category: parsedBeforeEdit.category,
          role: parsedBeforeEdit.role,
        },
        updatedInstructions,
      ),
      "utf-8",
    );

    const cachedAfterEdit = await agentDefinitionService.getAgentDefinitionById(created.id as string);
    expect(cachedAfterEdit?.instructions).toBe(initialInstructions);

    let capturedConfig: AgentConfig | null = null;
    const runService = buildRunService(agentDefinitionService, (config) => {
      capturedConfig = config;
    });

    await runService.createAgentRun({
      agentDefinitionId: created.id as string,
      workspaceRootPath: appConfigProvider.config.getMemoryDir(),
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      runtimeKind: "autobyteus",
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
    });

    expect(capturedConfig?.systemPrompt).toBe(updatedInstructions);
  });

  it("falls back to description when fresh definition instructions are blank", async () => {
    const agentDefinitionService = new AgentDefinitionService();
    const unique = `blank_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const initialInstructions = `Initial instructions for ${unique}`;
    const description = `Fallback description for ${unique}`;

    const created = await agentDefinitionService.createAgentDefinition({
      name: `Blank Instructions Agent ${unique}`,
      role: "assistant",
      description,
      instructions: initialInstructions,
      toolNames: [],
    });
    expect(created.id).toBeTruthy();

    const agentDir = path.join(appConfigProvider.config.getAppDataDir(), "agents", created.id as string);
    cleanupPaths.add(agentDir);

    await agentDefinitionService.getAgentDefinitionById(created.id as string);

    const agentMdPath = path.join(agentDir, "agent.md");
    const parsed = parseAgentMd(await fs.readFile(agentMdPath, "utf-8"), agentMdPath);
    await fs.writeFile(
      agentMdPath,
      serializeAgentMd(
        {
          name: parsed.name,
          description,
          category: parsed.category,
          role: parsed.role,
        },
        "",
      ),
      "utf-8",
    );

    let capturedConfig: AgentConfig | null = null;
    const runService = buildRunService(agentDefinitionService, (config) => {
      capturedConfig = config;
    });

    await runService.createAgentRun({
      agentDefinitionId: created.id as string,
      workspaceRootPath: appConfigProvider.config.getMemoryDir(),
      llmModelIdentifier: "dummy-model",
      autoExecuteTools: false,
      runtimeKind: "autobyteus",
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      llmConfig: null,
    });

    expect(capturedConfig?.systemPrompt).toBe(description);
  });
});
