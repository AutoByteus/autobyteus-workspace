import {
  AgentConfig,
  AgentEventStream,
  BaseAgentUserInputMessageProcessor,
  BaseLLMResponseProcessor,
  BaseLifecycleEventProcessor,
  BaseSystemPromptProcessor,
  BaseToolExecutionResultProcessor,
  BaseToolInvocationPreprocessor,
  SkillAccessMode,
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
import type { Agent } from "autobyteus-ts/agent/agent.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { mergeMandatoryAndOptional } from "../../agent-definition/utils/processor-defaults.js";
import { PromptLoader, getPromptLoader } from "../../prompt-engineering/utils/prompt-loader.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { TempWorkspace } from "../../workspaces/temp-workspace.js";
import { WorkspaceManager, getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentCreationError, AgentTerminationError } from "../errors.js";
import { appConfigProvider } from "../../config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentFactoryLike = typeof defaultAgentFactory;
type LlmFactoryLike = typeof LLMFactory;

type ProcessorOption = { name: string; isMandatory: boolean };

type ProcessorRegistry<T> = {
  getProcessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

type PreprocessorRegistry<T> = {
  getPreprocessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

type ProcessorRegistries = {
  input: ProcessorRegistry<BaseAgentUserInputMessageProcessor>;
  llmResponse: ProcessorRegistry<BaseLLMResponseProcessor>;
  systemPrompt: ProcessorRegistry<BaseSystemPromptProcessor>;
  toolExecutionResult: ProcessorRegistry<BaseToolExecutionResultProcessor>;
  toolInvocationPreprocessor: PreprocessorRegistry<BaseToolInvocationPreprocessor>;
  lifecycle: ProcessorRegistry<BaseLifecycleEventProcessor>;
};

type AgentLike = {
  // Core boundary: autobyteus-ts runtime still exposes run identity as `agentId`.
  agentId: string;
  context?: {
    statusManager?: {
      notifier?: unknown;
    } | null;
  };
};

type AgentRunManagerOptions = {
  agentFactory?: AgentFactoryLike;
  agentDefinitionService?: AgentDefinitionService;
  llmFactory?: LlmFactoryLike;
  workspaceManager?: WorkspaceManager;
  skillService?: SkillService;
  promptLoader?: PromptLoader;
  registries?: Partial<ProcessorRegistries>;
  waitForIdle?: (agent: Agent, timeout?: number) => Promise<void>;
};

type AgentRunConfigInput = {
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  llmConfig?: Record<string, unknown> | null;
  skillAccessMode?: SkillAccessMode | null;
};

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private agentFactory: AgentFactoryLike;
  private agentDefinitionService: AgentDefinitionService;
  private llmFactory: LlmFactoryLike;
  private workspaceManager: WorkspaceManager;
  private skillService: SkillService;
  private promptLoader: PromptLoader;
  private registries: ProcessorRegistries;
  private waitForIdle: (agent: Agent, timeout?: number) => Promise<void>;

  static getInstance(options: AgentRunManagerOptions = {}): AgentRunManager {
    if (!AgentRunManager.instance) {
      AgentRunManager.instance = new AgentRunManager(options);
    }
    return AgentRunManager.instance;
  }

  constructor(options: AgentRunManagerOptions = {}) {
    this.agentFactory = options.agentFactory ?? defaultAgentFactory;
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.llmFactory = options.llmFactory ?? LLMFactory;
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.skillService = options.skillService ?? SkillService.getInstance();
    this.promptLoader = options.promptLoader ?? getPromptLoader();
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
    logger.info("AgentRunManager initialized.");
  }

  async createAgentRun(options: AgentRunConfigInput): Promise<string> {
    const built = await this.buildAgentConfig(options);
    const agent = this.agentFactory.createAgent(built.agentConfig) as AgentLike & {
      start?: () => void;
    };
    agent.start?.();
    await this.waitForIdle(agent as Agent);
    const agentRunId = agent.agentId;
    logger.info(
      `Successfully created and started agent run '${agentRunId}' from definition '${built.agentName}'.`,
    );
    return agentRunId;
  }

  async restoreAgentRun(
    options: AgentRunConfigInput & { runId: string },
  ): Promise<string> {
    const built = await this.buildAgentConfig(options);
    const agent = this.agentFactory.restoreAgent(
      options.runId,
      built.agentConfig,
      appConfigProvider.config.getMemoryDir(),
    ) as AgentLike & { start?: () => void };
    agent.start?.();
    await this.waitForIdle(agent as Agent);
    const agentRunId = agent.agentId;
    logger.info(
      `Successfully restored and started agent run '${agentRunId}' from definition '${built.agentName}'.`,
    );
    return agentRunId;
  }

  private async buildAgentConfig(
    options: AgentRunConfigInput,
  ): Promise<{ agentConfig: AgentConfig; agentName: string }> {
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
      agentDef = await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
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

    const systemPrompt = await this.promptLoader.getPromptTemplateForAgent(
      agentDefinitionId,
      llmModelIdentifier,
    );

    const resolvedPrompt = systemPrompt ?? agentDef.description;
    if (!systemPrompt) {
      logger.warn(
        `No suitable active system prompt found for AgentDefinition ${agentDefinitionId} and model '${llmModelIdentifier}'. Using agent description as fallback.`,
      );
    } else {
      logger.info(
        `Resolved system prompt for AgentDefinition ${agentDefinitionId} and model '${llmModelIdentifier}'.`,
      );
    }

    const tools = [];
    if (agentDef.toolNames?.length) {
      for (const name of agentDef.toolNames) {
        if (!defaultToolRegistry.getToolDefinition(name)) {
          logger.warn(
            `Tool '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
          );
          continue;
        }
        try {
          tools.push(defaultToolRegistry.createTool(name));
        } catch (error) {
          logger.error(
            `Failed to create tool instance for '${name}' from agent definition '${agentDef.name}': ${String(error)}`,
          );
        }
      }
    }

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
      for (const skillName of agentDef.skillNames) {
        const skill = this.skillService.getSkill(skillName);
        if (skill) {
          skillPaths.push(skill.rootPath);
          logger.info(`Resolved skill '${skillName}' to path: ${skill.rootPath}`);
        } else {
          logger.warn(
            `Skill '${skillName}' defined in agent definition '${agentDef.name}' not found via SkillService. Skipping.`,
          );
        }
      }
    }

    const config = llmConfig ? new LLMConfig({ extraParams: llmConfig }) : undefined;
    const llmInstance = await this.llmFactory.createLLM(llmModelIdentifier, config);

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

    const initialCustomData = {
      agent_definition_id: agentDefinitionId,
      is_first_user_turn: true,
      workspace_id: workspaceInstance?.workspaceId ?? null,
      workspace_root_path: workspaceRootPath,
      workspace_name: workspaceInstance?.getName?.() ?? workspaceInstance?.workspaceId ?? null,
      workspace_is_temp:
        workspaceInstance?.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID,
    };

    return {
      agentName: agentDef.name,
      agentConfig: new AgentConfig(
        agentDef.name,
        agentDef.role,
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
        appConfigProvider.config.getMemoryDir(),
        skillAccessMode ?? null,
      ),
    };
  }

  getAgentRun(runId: string): AgentLike | null {
    return (this.agentFactory.getAgent(runId) as AgentLike | undefined) ?? null;
  }

  listActiveRuns(): string[] {
    return this.agentFactory.listActiveAgentIds();
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    try {
      return await this.agentFactory.removeAgent(runId);
    } catch (error) {
      logger.error(`Failed to terminate agent run '${runId}': ${String(error)}`);
      throw new AgentTerminationError(String(error));
    }
  }

  getAgentEventStream(runId: string): AgentEventStream | null {
    const agent = this.getAgentRun(runId);
    if (!agent) {
      logger.warn(
        `AgentRunManager: Attempted to get event stream for non-existent agent run '${runId}'.`,
      );
      return null;
    }
    return new AgentEventStream(agent as any);
  }
}
