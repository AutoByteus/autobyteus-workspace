import { createGeminiRuntimeResolver } from '../../../llm-management/services/gemini-runtime-resolver-adapter.js';
import fs from "node:fs/promises";
import {
  AgentConfig,
  BaseAgentUserInputMessageProcessor,
  BaseLLMResponseProcessor,
  BaseLifecycleEventProcessor,
  BaseSystemPromptProcessor,
  BaseToolExecutionResultProcessor,
  BaseToolInvocationPreprocessor,
  defaultAgentFactory,
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultLifecycleEventProcessorRegistry,
  defaultSystemPromptProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  LLMFactory,
  waitForAgentToBeIdle,
} from "autobyteus-ts";
import type { BaseLLM, LLMFactoryConfigInput } from "autobyteus-ts";
import type { Agent } from "autobyteus-ts/agent/agent.js";
import type { CompactionAgentRunner } from "autobyteus-ts/memory/compaction/compaction-agent-runner.js";
import { AgentDefinition } from "../../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { mergeMandatoryAndOptional } from "../../../agent-definition/utils/processor-defaults.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../../runtime-management/runtime-kind-enum.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TempWorkspace } from "../../../workspaces/temp-workspace.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { AgentCreationError } from "../../errors.js";
import { AgentRunConfig } from "../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../domain/agent-run-context.js";
import { APPLICATION_EXECUTION_CONTEXT_KEY } from "../../../application-orchestration/domain/models.js";
import {
  AutoByteusAgentRunBackend,
  type AutoByteusAgentLike,
} from "./autobyteus-agent-run-backend.js";
import type { AgentRunBackendFactory } from "../agent-run-backend-factory.js";
import { buildAutoByteusManagedTeamContext } from "./autobyteus-managed-team-context-builder.js";
import { composeAutoByteusMemberSystemPrompt } from "./autobyteus-member-system-prompt-composer.js";
import { resolveAutoByteusAgentTools } from "./autobyteus-agent-tool-resolver.js";
import { createLlmProviderApiKeyResolver } from "../../../secret-management/resolution/secret-management-provider-api-key-resolver.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentFactoryLike = typeof defaultAgentFactory;

type ProcessorOption = { name: string; isMandatory: boolean };

type ProcessorRegistry<T> = {
  getProcessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

type PreprocessorRegistry<T> = {
  getPreprocessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

export type ProcessorRegistries = {
  input: ProcessorRegistry<BaseAgentUserInputMessageProcessor>;
  llmResponse: ProcessorRegistry<BaseLLMResponseProcessor>;
  systemPrompt: ProcessorRegistry<BaseSystemPromptProcessor>;
  toolExecutionResult: ProcessorRegistry<BaseToolExecutionResultProcessor>;
  toolInvocationPreprocessor: PreprocessorRegistry<BaseToolInvocationPreprocessor>;
  lifecycle: ProcessorRegistry<BaseLifecycleEventProcessor>;
};

type AgentLike = {
  agentId: string;
  start?: () => void;
};

type AutoByteusRuntimeAgentLike = AgentLike & AutoByteusAgentLike;

export type CompactionAgentRunnerFactoryInput = {
  agentDefinitionId: string;
  workspaceRootPath: string | null;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
};

export type CompactionAgentRunnerFactory = (
  input: CompactionAgentRunnerFactoryInput,
) => Promise<CompactionAgentRunner | null> | CompactionAgentRunner | null;

const createDefaultCompactionAgentRunner: CompactionAgentRunnerFactory = async ({
  agentDefinitionId,
  workspaceRootPath,
  runtimeKind,
  llmModelIdentifier,
}) => {
  const module = await import("../../compaction/server-compaction-agent-runner.js");
  return new module.ServerCompactionAgentRunner({
    workspaceRootPath,
    parentLaunchFallback: {
      runtimeKind,
      llmModelIdentifier,
      sourceAgentDefinitionId: agentDefinitionId,
    },
  });
};

export type AutoByteusAgentRunBackendFactoryOptions = {
  agentFactory?: AgentFactoryLike;
  agentDefinitionService?: AgentDefinitionService;
  createLLM?: (modelIdentifier: string, configInput?: LLMFactoryConfigInput) => Promise<BaseLLM>;
  workspaceManager?: WorkspaceManager;
  skillService?: SkillService;
  registries?: Partial<ProcessorRegistries>;
  waitForIdle?: (agent: Agent, timeout?: number) => Promise<void>;
  compactionAgentRunnerFactory?: CompactionAgentRunnerFactory;
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class AutoByteusAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly agentFactory: AgentFactoryLike;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly createLLM: (
    modelIdentifier: string,
    configInput?: LLMFactoryConfigInput,
  ) => Promise<BaseLLM>;
  private readonly workspaceManager: WorkspaceManager;
  private readonly skillService: SkillService;
  private readonly registries: ProcessorRegistries;
  private readonly waitForIdle: (agent: Agent, timeout?: number) => Promise<void>;
  private readonly compactionAgentRunnerFactory: CompactionAgentRunnerFactory;

  constructor(options: AutoByteusAgentRunBackendFactoryOptions = {}) {
    this.agentFactory = options.agentFactory ?? defaultAgentFactory;
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.createLLM = options.createLLM ??
      (async (modelIdentifier, configInput) =>
        LLMFactory.createLLM(
          modelIdentifier,
          configInput,
          createLlmProviderApiKeyResolver(),
          await LLMFactory.requiresGeminiRuntimeResolver(modelIdentifier)
            ? createGeminiRuntimeResolver()
            : undefined,
        ));
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.skillService = options.skillService ?? SkillService.getInstance();
    this.registries = {
      input: options.registries?.input ?? defaultInputProcessorRegistry,
      llmResponse: options.registries?.llmResponse ?? defaultLlmResponseProcessorRegistry,
      systemPrompt: options.registries?.systemPrompt ?? defaultSystemPromptProcessorRegistry,
      toolExecutionResult:
        options.registries?.toolExecutionResult ??
        defaultToolExecutionResultProcessorRegistry,
      toolInvocationPreprocessor:
        options.registries?.toolInvocationPreprocessor ??
        defaultToolInvocationPreprocessorRegistry,
      lifecycle: options.registries?.lifecycle ?? defaultLifecycleEventProcessorRegistry,
    };
    this.waitForIdle = options.waitForIdle ?? waitForAgentToBeIdle;
    this.compactionAgentRunnerFactory =
      options.compactionAgentRunnerFactory ?? createDefaultCompactionAgentRunner;
  }

  async createBackend(
    config: AgentRunConfig,
    agentRunId: string,
  ): Promise<AutoByteusAgentRunBackend> {
    const runId = agentRunId.trim();
    if (!runId) {
      throw new AgentCreationError(
        "AutoByteus standalone backend creation requires agentRunId.",
      );
    }
    const built = await this.buildAgentConfig(config, runId);
    const memoryDir = built.resolvedRunConfig.memoryDir;
    if (!memoryDir) {
      throw new AgentCreationError(
        `AutoByteus standalone backend creation for run '${runId}' requires an explicit memoryDir.`,
      );
    }
    await fs.mkdir(memoryDir, { recursive: true });
    built.agentConfig.memoryDir = memoryDir;
    const resolvedRunConfig = new AgentRunConfig({
      agentDefinitionId: built.resolvedRunConfig.agentDefinitionId,
      llmModelIdentifier: built.resolvedRunConfig.llmModelIdentifier,
      autoExecuteTools: built.resolvedRunConfig.autoExecuteTools,
      workspaceId: built.resolvedRunConfig.workspaceId,
      memoryDir,
      llmConfig: built.resolvedRunConfig.llmConfig,
      skillAccessMode: built.resolvedRunConfig.skillAccessMode,
      runtimeKind: built.resolvedRunConfig.runtimeKind,
      memberTeamContext: built.resolvedRunConfig.memberTeamContext,
      applicationExecutionContext: built.resolvedRunConfig.applicationExecutionContext,
    });
    const createAgentWithId = (
      this.agentFactory as AgentFactoryLike & {
        createAgentWithId?: (agentId: string, config: AgentConfig) => AgentLike;
      }
    ).createAgentWithId;
    if (typeof createAgentWithId !== "function") {
      throw new AgentCreationError(
        "AutoByteus AgentFactory must support createAgentWithId(...) for explicit standalone run provisioning.",
      );
    }
    const agent = createAgentWithId.call(this.agentFactory, runId, built.agentConfig) as AgentLike;
    if (agent.agentId !== runId) {
      throw new AgentCreationError(
        `AutoByteus AgentFactory returned agent id '${agent.agentId}' but '${runId}' was requested.`,
      );
    }
    agent.start?.();
    await this.waitForIdle(agent as Agent);
    return this.createBackendFromAgent(
      new AgentRunContext({
        runId: agent.agentId,
        config: resolvedRunConfig,
        runtimeContext: (agent as AutoByteusRuntimeAgentLike).context ?? null,
      }),
      agent as AutoByteusRuntimeAgentLike,
    );
  }

  async restoreBackend(
    context: AgentRunContext<RuntimeAgentRunContext>,
  ): Promise<AutoByteusAgentRunBackend> {
    const built = await this.buildAgentConfig(context.config, context.runId);
    const memoryDir = context.config.memoryDir;
    if (!memoryDir) {
      throw new AgentCreationError(
        `AutoByteus standalone restore for run '${context.runId}' requires an explicit memoryDir.`,
      );
    }
    await fs.mkdir(memoryDir, { recursive: true });
    built.agentConfig.memoryDir = memoryDir;
    const agent = this.agentFactory.restoreAgent(
      context.runId,
      built.agentConfig,
      memoryDir,
    ) as AgentLike;
    agent.start?.();
    await this.waitForIdle(agent as Agent);
    return this.createBackendFromAgent(
      new AgentRunContext({
        runId: agent.agentId,
        config: new AgentRunConfig({
          agentDefinitionId: context.config.agentDefinitionId,
          llmModelIdentifier: context.config.llmModelIdentifier,
          autoExecuteTools: context.config.autoExecuteTools,
          workspaceId: context.config.workspaceId,
          memoryDir,
          llmConfig: context.config.llmConfig,
          skillAccessMode: context.config.skillAccessMode,
          runtimeKind: context.config.runtimeKind,
          memberTeamContext: context.config.memberTeamContext,
          applicationExecutionContext: context.config.applicationExecutionContext,
        }),
        runtimeContext: (agent as AutoByteusRuntimeAgentLike).context ?? context.runtimeContext,
      }),
      agent as AutoByteusRuntimeAgentLike,
    );
  }

  private async buildAgentConfig(
    options: AgentRunConfig,
    runId: string,
  ): Promise<{ agentConfig: AgentConfig; resolvedRunConfig: AgentRunConfig }> {
    const {
      agentDefinitionId,
      llmModelIdentifier,
      autoExecuteTools,
      workspaceId,
      llmConfig,
      skillAccessMode,
    } = options;

    let agentDef: AgentDefinition | null = null;
    try {
      const getFreshAgentDefinitionById = (
        this.agentDefinitionService as AgentDefinitionService & {
          getFreshAgentDefinitionById?: (definitionId: string) => Promise<AgentDefinition | null>;
        }
      ).getFreshAgentDefinitionById;
      agentDef =
        typeof getFreshAgentDefinitionById === "function"
          ? await getFreshAgentDefinitionById.call(this.agentDefinitionService, agentDefinitionId)
          : await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    } catch (error) {
      logger.error(
        `Failed to fetch agent definition '${agentDefinitionId}': ${String(error)}`,
      );
    }

    if (!agentDef) {
      throw new AgentCreationError(
        `AgentDefinition with ID ${agentDefinitionId} not found.`,
      );
    }

    const systemPrompt = asTrimmedString(agentDef.instructions);
    const basePrompt = systemPrompt ?? agentDef.description;
    if (!systemPrompt) {
      logger.warn(
        `No non-blank definition instructions found for AgentDefinition ${agentDefinitionId}. Using agent description as fallback.`,
      );
    } else {
      logger.info(
        `Resolved system prompt from fresh definition instructions for AgentDefinition ${agentDefinitionId}.`,
      );
    }

    const { tools, actualToolNames } = resolveAutoByteusAgentTools({
      agentDefinition: agentDef,
      senderRunId: runId,
      senderName: agentDef.name,
      runtimeKind: options.runtimeKind,
      memberTeamContext: options.memberTeamContext,
      logger,
    });
    const resolvedPrompt = composeAutoByteusMemberSystemPrompt({
      baseAgentInstruction: basePrompt,
      memberTeamContext: options.memberTeamContext ?? null,
      resolvedToolNames: actualToolNames,
    });

    const inputProcessors: BaseAgentUserInputMessageProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(agentDef.inputProcessorNames, this.registries.input)) {
      const processor = this.registries.input.getProcessor(name);
      if (processor) {
        inputProcessors.push(processor);
      } else {
        logger.warn(
          `Input processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const llmResponseProcessors: BaseLLMResponseProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.llmResponseProcessorNames,
      this.registries.llmResponse,
    )) {
      const processor = this.registries.llmResponse.getProcessor(name);
      if (processor) {
        llmResponseProcessors.push(processor);
      } else {
        logger.warn(
          `LLM response processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const systemPromptProcessors: BaseSystemPromptProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.systemPromptProcessorNames,
      this.registries.systemPrompt,
    )) {
      const processor = this.registries.systemPrompt.getProcessor(name);
      if (processor) {
        systemPromptProcessors.push(processor);
      } else {
        logger.warn(
          `System prompt processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }
    const toolExecutionResultProcessors: BaseToolExecutionResultProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.toolExecutionResultProcessorNames,
      this.registries.toolExecutionResult,
    )) {
      const processor = this.registries.toolExecutionResult.getProcessor(name);
      if (processor) {
        toolExecutionResultProcessors.push(processor);
      } else {
        logger.warn(
          `Tool result processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const toolInvocationPreprocessors: BaseToolInvocationPreprocessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.toolInvocationPreprocessorNames,
      this.registries.toolInvocationPreprocessor,
    )) {
      const processor = this.registries.toolInvocationPreprocessor.getPreprocessor(name);
      if (processor) {
        toolInvocationPreprocessors.push(processor);
      } else {
        logger.warn(
          `Tool invocation preprocessor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const lifecycleProcessors: BaseLifecycleEventProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.lifecycleProcessorNames,
      this.registries.lifecycle,
    )) {
      const processor = this.registries.lifecycle.getProcessor(name);
      if (processor) {
        lifecycleProcessors.push(processor);
      } else {
        logger.warn(
          `Lifecycle processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const skillPaths: string[] = [];
    if (agentDef.skillNames?.length) {
      for (const skill of this.skillService.resolveConfiguredSkillsForAgent(agentDef)) {
        skillPaths.push(skill.rootPath);
        logger.info(`Resolved skill '${skill.name}' to path: ${skill.rootPath}`);
      }
    }

    const llmInstance = await this.createLLM(
      llmModelIdentifier,
      llmConfig ?? undefined,
    );

    let workspaceInstance = workspaceId
      ? this.workspaceManager.getWorkspaceById(workspaceId)
      : undefined;
    if (workspaceId && !workspaceInstance) {
      logger.warn(
        `Workspace with ID ${workspaceId} not found. Falling back to temp workspace.`,
      );
    }
    if (!workspaceInstance) {
      workspaceInstance = await this.workspaceManager.getOrCreateTempWorkspace();
      logger.info(`Using temp workspace (ID: ${workspaceInstance.workspaceId}) for agent.`);
    }
    const workspaceRootPath = workspaceInstance?.getBasePath?.() ?? null;
    const effectiveRuntimeKind =
      runtimeKindFromString(options.runtimeKind, RuntimeKind.AUTOBYTEUS) ??
      RuntimeKind.AUTOBYTEUS;

    const initialCustomData = {
      agent_definition_id: agentDefinitionId,
      is_first_user_turn: true,
      workspace_id: workspaceInstance?.workspaceId ?? null,
      workspace_root_path: workspaceRootPath,
      workspace_name: workspaceInstance?.getName?.() ?? workspaceInstance?.workspaceId ?? null,
      workspace_is_temp:
        workspaceInstance?.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID,
      ...(options.memberTeamContext
        ? { teamContext: buildAutoByteusManagedTeamContext(options.memberTeamContext) }
        : {}),
      ...(options.applicationExecutionContext
        ? { [APPLICATION_EXECUTION_CONTEXT_KEY]: options.applicationExecutionContext }
        : {}),
    };

    const compactionAgentRunner = await this.compactionAgentRunnerFactory({
      agentDefinitionId,
      workspaceRootPath,
      runtimeKind: effectiveRuntimeKind,
      llmModelIdentifier,
    });

    return {
      resolvedRunConfig: new AgentRunConfig({
        agentDefinitionId,
        llmModelIdentifier,
        autoExecuteTools,
        workspaceId: workspaceInstance?.workspaceId ?? null,
        memoryDir: options.memoryDir ?? null,
        llmConfig: llmConfig ?? null,
        skillAccessMode: skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: effectiveRuntimeKind,
        memberTeamContext: options.memberTeamContext ?? null,
        applicationExecutionContext: options.applicationExecutionContext ?? null,
      }),
      agentConfig: new AgentConfig(
        agentDef.name,
        agentDef.role ?? "",
        agentDef.description,
        llmInstance,
        resolvedPrompt,
        tools,
        autoExecuteTools,
        inputProcessors,
        llmResponseProcessors,
        systemPromptProcessors,
        toolExecutionResultProcessors,
        toolInvocationPreprocessors,
        workspaceRootPath,
        lifecycleProcessors,
        initialCustomData,
        skillPaths,
        null,
        skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
        compactionAgentRunner,
      ),
    };
  }

  private createBackendFromAgent(
    context: AgentRunContext<RuntimeAgentRunContext>,
    agent: AutoByteusRuntimeAgentLike,
  ): AutoByteusAgentRunBackend {
    return new AutoByteusAgentRunBackend(context, agent, {
      isActive: () => this.resolveAutoByteusAgent(agent.agentId) !== null,
      removeAgent: async (runId: string) => this.agentFactory.removeAgent(runId),
    });
  }
  private resolveAutoByteusAgent(runId: string): AutoByteusRuntimeAgentLike | null {
    return (this.agentFactory.getAgent(runId) as AutoByteusRuntimeAgentLike | undefined) ?? null;
  }
}

let cachedAutoByteusAgentRunBackendFactory: AutoByteusAgentRunBackendFactory | null = null;

export const getAutoByteusAgentRunBackendFactory = (
  options: AutoByteusAgentRunBackendFactoryOptions = {},
): AutoByteusAgentRunBackendFactory => {
  if (!cachedAutoByteusAgentRunBackendFactory) {
    cachedAutoByteusAgentRunBackendFactory = new AutoByteusAgentRunBackendFactory(options);
  }
  return cachedAutoByteusAgentRunBackendFactory;
};
