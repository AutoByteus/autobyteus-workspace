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
import type { Agent } from "autobyteus-ts/agent/agent.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { AgentDefinition } from "../../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { mergeMandatoryAndOptional } from "../../../agent-definition/utils/processor-defaults.js";
import {
  RuntimeKind,
  runtimeKindFromString,
} from "../../../runtime-management/runtime-kind-enum.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamManifestInjectorProcessor } from "autobyteus-ts/agent-team/system-prompt-processor/team-manifest-injector-processor.js";
import { TempWorkspace } from "../../../workspaces/temp-workspace.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { AgentCreationError } from "../../errors.js";
import { AgentRunConfig } from "../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../domain/agent-run-context.js";
import { APPLICATION_SESSION_CONTEXT_KEY } from "../../../application-sessions/utils/application-producer-provenance.js";
import {
  AutoByteusAgentRunBackend,
  type AutoByteusAgentLike,
} from "./autobyteus-agent-run-backend.js";
import type { AgentRunBackendFactory } from "../agent-run-backend-factory.js";
import { resolveAutoByteusStandaloneToolNames } from "./autobyteus-mixed-tool-exposure.js";
import { buildAutoByteusStandaloneTeamContext } from "./autobyteus-team-communication-context-builder.js";

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

export type AutoByteusAgentRunBackendFactoryOptions = {
  agentFactory?: AgentFactoryLike;
  agentDefinitionService?: AgentDefinitionService;
  llmFactory?: LlmFactoryLike;
  workspaceManager?: WorkspaceManager;
  skillService?: SkillService;
  registries?: Partial<ProcessorRegistries>;
  waitForIdle?: (agent: Agent, timeout?: number) => Promise<void>;
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class AutoByteusAgentRunBackendFactory implements AgentRunBackendFactory {
  private readonly agentFactory: AgentFactoryLike;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly llmFactory: LlmFactoryLike;
  private readonly workspaceManager: WorkspaceManager;
  private readonly skillService: SkillService;
  private readonly registries: ProcessorRegistries;
  private readonly waitForIdle: (agent: Agent, timeout?: number) => Promise<void>;

  constructor(options: AutoByteusAgentRunBackendFactoryOptions = {}) {
    this.agentFactory = options.agentFactory ?? defaultAgentFactory;
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.llmFactory = options.llmFactory ?? LLMFactory;
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
  }

  async createBackend(
    config: AgentRunConfig,
    preferredRunId: string | null = null,
  ): Promise<AutoByteusAgentRunBackend> {
    const built = await this.buildAgentConfig(config);
    const runId = preferredRunId?.trim() || null;
    if (!runId) {
      throw new AgentCreationError(
        "AutoByteus standalone backend creation requires a prepared preferredRunId.",
      );
    }
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
      applicationSessionContext: built.resolvedRunConfig.applicationSessionContext,
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
    const built = await this.buildAgentConfig(context.config);
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
          applicationSessionContext: context.config.applicationSessionContext,
        }),
        runtimeContext: (agent as AutoByteusRuntimeAgentLike).context ?? context.runtimeContext,
      }),
      agent as AutoByteusRuntimeAgentLike,
    );
  }

  private async buildAgentConfig(
    options: AgentRunConfig,
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
    const resolvedPrompt = systemPrompt ?? agentDef.description;
    if (!systemPrompt) {
      logger.warn(
        `No non-blank definition instructions found for AgentDefinition ${agentDefinitionId}. Using agent description as fallback.`,
      );
    } else {
      logger.info(
        `Resolved system prompt from fresh definition instructions for AgentDefinition ${agentDefinitionId}.`,
      );
    }

    const resolvedToolNames = resolveAutoByteusStandaloneToolNames({
      toolNames: agentDef.toolNames,
      memberTeamContext: options.memberTeamContext,
    });
    const tools = [];
    for (const name of resolvedToolNames) {
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
    if (
      options.memberTeamContext &&
      !systemPromptProcessors.some(
        (processor) => processor instanceof TeamManifestInjectorProcessor,
      )
    ) {
      systemPromptProcessors.push(new TeamManifestInjectorProcessor());
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
      ...(options.memberTeamContext
        ? { teamContext: buildAutoByteusStandaloneTeamContext(options.memberTeamContext) }
        : {}),
      ...(options.applicationSessionContext
        ? { [APPLICATION_SESSION_CONTEXT_KEY]: options.applicationSessionContext }
        : {}),
    };

    return {
      resolvedRunConfig: new AgentRunConfig({
        agentDefinitionId,
        llmModelIdentifier,
        autoExecuteTools,
        workspaceId: workspaceInstance?.workspaceId ?? null,
        memoryDir: options.memoryDir ?? null,
        llmConfig: llmConfig ?? null,
        skillAccessMode: skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
        runtimeKind:
          runtimeKindFromString(options.runtimeKind, RuntimeKind.AUTOBYTEUS) ??
          RuntimeKind.AUTOBYTEUS,
        memberTeamContext: options.memberTeamContext ?? null,
        applicationSessionContext: options.applicationSessionContext ?? null,
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
