import {
  AgentConfig,
  BaseAgentUserInputMessageProcessor,
  BaseLLMResponseProcessor,
  BaseLifecycleEventProcessor,
  BaseSystemPromptProcessor,
  BaseToolExecutionResultProcessor,
  BaseToolInvocationPreprocessor,
  LLMFactory,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentDefinition } from "../../agent-definition/domain/models.js";
import { mergeMandatoryAndOptional } from "../../agent-definition/utils/processor-defaults.js";
import { PromptLoader, getPromptLoader } from "../../prompt-engineering/utils/prompt-loader.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { WorkspaceManager, getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentTeamCreationError } from "../errors.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-agent-id.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const EMBEDDED_LOCAL_NODE_ID = "embedded-local";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isMemberLocalToNode = (memberHomeNodeId: string | null | undefined): boolean => {
  const normalizedHomeNodeId = normalizeOptionalString(memberHomeNodeId);
  if (!normalizedHomeNodeId || normalizedHomeNodeId === EMBEDDED_LOCAL_NODE_ID) {
    return true;
  }
  const localNodeId = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID);
  return !!localNodeId && normalizedHomeNodeId === localNodeId;
};

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

export type HydrationProcessorRegistries = {
  input: ProcessorRegistry<BaseAgentUserInputMessageProcessor>;
  llmResponse: ProcessorRegistry<BaseLLMResponseProcessor>;
  systemPrompt: ProcessorRegistry<BaseSystemPromptProcessor>;
  toolExecutionResult: ProcessorRegistry<BaseToolExecutionResultProcessor>;
  toolInvocationPreprocessor: PreprocessorRegistry<BaseToolInvocationPreprocessor>;
  lifecycle: ProcessorRegistry<BaseLifecycleEventProcessor>;
};

export type TeamMemberHydrationConfigInput = {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberAgentId?: string | null;
  memoryDir?: string | null;
  hostNodeId?: string | null;
};

export class TeamMemberConfigHydrationService {
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly llmFactory: LlmFactoryLike;
  private readonly workspaceManager: WorkspaceManager;
  private readonly skillService: SkillService;
  private readonly promptLoader: PromptLoader;
  private readonly registries: HydrationProcessorRegistries;

  constructor(options: {
    agentDefinitionService: AgentDefinitionService;
    llmFactory?: LlmFactoryLike;
    workspaceManager?: WorkspaceManager;
    skillService?: SkillService;
    promptLoader?: PromptLoader;
    registries: HydrationProcessorRegistries;
  }) {
    this.agentDefinitionService = options.agentDefinitionService;
    this.llmFactory = options.llmFactory ?? LLMFactory;
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.skillService = options.skillService ?? SkillService.getInstance();
    this.promptLoader = options.promptLoader ?? getPromptLoader();
    this.registries = options.registries;
  }

  async buildAgentConfigFromDefinition(input: {
    memberName: string;
    agentDefinitionId: string;
    memberConfig: TeamMemberHydrationConfigInput;
    memberRouteKey: string;
    memberHomeNodeId: string | null | undefined;
  }): Promise<AgentConfig> {
    const agentDefinitionResolution = await this.resolveAgentDefinitionForMember({
      memberName: input.memberName,
      agentDefinitionId: input.agentDefinitionId,
      memberConfig: input.memberConfig,
      memberHomeNodeId: input.memberHomeNodeId,
    });
    const agentDef = agentDefinitionResolution.agentDefinition;

    const systemPrompt =
      agentDefinitionResolution.resolutionType === "resolved"
        ? await this.promptLoader.getPromptTemplateForAgent(
            agentDefinitionResolution.resolvedAgentDefinitionId,
            input.memberConfig.llmModelIdentifier,
          )
        : null;
    const resolvedPrompt = systemPrompt ?? agentDef.description;

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
            `Failed to create tool object for '${name}' from agent definition '${agentDef.name}': ${String(error)}`,
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

    const workspaceId = normalizeOptionalString(input.memberConfig.workspaceId);
    const workspaceRootPath = normalizeOptionalString(input.memberConfig.workspaceRootPath);
    const memberIsLocal = isMemberLocalToNode(input.memberHomeNodeId);
    const normalizedMemberHomeNodeId = normalizeOptionalString(input.memberHomeNodeId);
    let workspaceInstance = workspaceId ? this.workspaceManager.getWorkspaceById(workspaceId) : undefined;
    if (!workspaceInstance && workspaceId && workspaceRootPath && memberIsLocal) {
      workspaceInstance = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    }
    if (!workspaceInstance && !workspaceId && workspaceRootPath && memberIsLocal) {
      workspaceInstance = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    }
    if (!workspaceInstance && workspaceId && memberIsLocal) {
      logger.warn(
        `Workspace '${workspaceId}' not found for member '${input.memberName}'. Proceeding without workspace binding.`,
      );
    }

    const skillPaths: string[] = [];
    if (agentDef.skillNames?.length) {
      for (const skillName of agentDef.skillNames) {
        const skill = this.skillService.getSkill(skillName);
        if (skill) {
          skillPaths.push(skill.rootPath);
          logger.info(
            `Resolved skill '${skillName}' to path: ${skill.rootPath} for team member '${input.memberName}'`,
          );
        } else {
          logger.warn(
            `Skill '${skillName}' defined in agent definition '${agentDef.name}' not found via SkillService. Skipping.`,
          );
        }
      }
    }

    const config = input.memberConfig.llmConfig
      ? new LLMConfig({ extraParams: input.memberConfig.llmConfig })
      : undefined;
    const llmInstance = await this.llmFactory.createLLM(
      input.memberConfig.llmModelIdentifier,
      config,
    );

    const initialCustomData: Record<string, unknown> = {
      agent_definition_id: agentDefinitionResolution.resolvedAgentDefinitionId,
      is_first_user_turn: true,
      teamMemberPlacement: {
        homeNodeId: normalizedMemberHomeNodeId ?? EMBEDDED_LOCAL_NODE_ID,
        isLocalToCurrentNode: memberIsLocal,
      },
    };

    const normalizedRouteKey = normalizeMemberRouteKey(
      input.memberConfig.memberRouteKey ?? input.memberRouteKey,
    );
    const memberAgentId =
      typeof input.memberConfig.memberAgentId === "string" &&
      input.memberConfig.memberAgentId.trim().length > 0
        ? input.memberConfig.memberAgentId.trim()
        : null;
    const memoryDir =
      typeof input.memberConfig.memoryDir === "string" && input.memberConfig.memoryDir.trim().length > 0
        ? input.memberConfig.memoryDir.trim()
        : null;

    if (memberAgentId) {
      initialCustomData.teamMemberIdentity = {
        memberRouteKey: normalizedRouteKey,
        memberAgentId,
      };

      if (memoryDir) {
        initialCustomData.teamRestore = {
          [input.memberName]: {
            memberAgentId,
            memoryDir,
          },
        };
      }
    }

    return new AgentConfig(
      input.memberName,
      agentDef.role,
      agentDef.description,
      llmInstance,
      resolvedPrompt,
      tools,
      input.memberConfig.autoExecuteTools,
      inputProcessors,
      llmResponseProcessors,
      systemPromptProcessors,
      toolExecutionResultProcessors,
      toolInvocationPreprocessors,
      workspaceInstance ?? null,
      lifecycleProcessors,
      initialCustomData,
      skillPaths,
      memoryDir,
    );
  }

  private async resolveAgentDefinitionForMember(input: {
    memberName: string;
    agentDefinitionId: string;
    memberConfig: TeamMemberHydrationConfigInput;
    memberHomeNodeId: string | null | undefined;
  }): Promise<{
    agentDefinition: AgentDefinition;
    resolvedAgentDefinitionId: string;
    resolutionType: "resolved" | "synthetic-remote";
  }> {
    const normalizedReferenceId = normalizeOptionalString(input.agentDefinitionId);
    if (!normalizedReferenceId) {
      throw new AgentTeamCreationError(
        `Agent definition ID for member '${input.memberName}' is required.`,
      );
    }

    const definitionByReference = await this.agentDefinitionService.getAgentDefinitionById(
      normalizedReferenceId,
    );
    if (definitionByReference) {
      return {
        agentDefinition: definitionByReference,
        resolvedAgentDefinitionId: normalizedReferenceId,
        resolutionType: "resolved",
      };
    }

    const memberIsLocal = isMemberLocalToNode(input.memberHomeNodeId);
    if (memberIsLocal) {
      throw new Error(`AgentDefinition with ID ${normalizedReferenceId} not found.`);
    }

    const normalizedConfigDefinitionId = normalizeOptionalString(input.memberConfig.agentDefinitionId);
    if (normalizedConfigDefinitionId && normalizedConfigDefinitionId !== normalizedReferenceId) {
      const definitionByConfigId = await this.agentDefinitionService.getAgentDefinitionById(
        normalizedConfigDefinitionId,
      );
      if (definitionByConfigId) {
        return {
          agentDefinition: definitionByConfigId,
          resolvedAgentDefinitionId: normalizedConfigDefinitionId,
          resolutionType: "resolved",
        };
      }
    }

    const resolvedAgentDefinitionId = normalizedConfigDefinitionId ?? normalizedReferenceId;
    const normalizedHomeNodeId = normalizeOptionalString(input.memberHomeNodeId) ?? "unknown-remote-node";
    logger.warn(
      `Agent definition '${normalizedReferenceId}' for remote member '${input.memberName}' on node '${normalizedHomeNodeId}' was not found locally. Using synthetic remote proxy definition '${resolvedAgentDefinitionId}'.`,
    );
    return {
      agentDefinition: new AgentDefinition({
        id: resolvedAgentDefinitionId,
        name: `RemoteMember:${input.memberName}`,
        role: input.memberName,
        description: `Remote team member '${input.memberName}' executes on node '${normalizedHomeNodeId}'.`,
      }),
      resolvedAgentDefinitionId,
      resolutionType: "synthetic-remote",
    };
  }
}
