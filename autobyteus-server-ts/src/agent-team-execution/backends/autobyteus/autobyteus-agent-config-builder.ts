import {
  AgentConfig,
  BaseTool,
  BaseToolInvocationPreprocessor,
  LLMFactory,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { mergeMandatoryAndOptional } from "../../../agent-definition/utils/processor-defaults.js";
import type { TeamMemberRunConfig } from "../../domain/team-run-config.js";
import { normalizeMemberRouteKey } from "../../../run-history/utils/team-member-run-id.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import { TempWorkspace } from "../../../workspaces/temp-workspace.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import type { TeamProcessorRegistries } from "./team-processor-registries.js";
import { APPLICATION_SESSION_CONTEXT_KEY } from "../../../application-sessions/utils/application-producer-provenance.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

type LlmFactoryLike = typeof LLMFactory;

type AutoByteusAgentConfigBuilderOptions = {
  agentDefinitionService: AgentDefinitionService;
  llmFactory: LlmFactoryLike;
  workspaceManager: WorkspaceManager;
  skillService: SkillService;
  registries: TeamProcessorRegistries;
};

export class AutoByteusAgentConfigBuilder {
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly llmFactory: LlmFactoryLike;
  private readonly workspaceManager: WorkspaceManager;
  private readonly skillService: SkillService;
  private readonly registries: TeamProcessorRegistries;

  constructor(options: AutoByteusAgentConfigBuilderOptions) {
    this.agentDefinitionService = options.agentDefinitionService;
    this.llmFactory = options.llmFactory;
    this.workspaceManager = options.workspaceManager;
    this.skillService = options.skillService;
    this.registries = options.registries;
  }

  async build(
    memberName: string,
    agentDefinitionId: string,
    memberConfig: TeamMemberRunConfig,
  ): Promise<AgentConfig> {
    const agentDef = await this.resolveAgentDefinition(agentDefinitionId);
    const systemPrompt = asTrimmedString(agentDef.instructions);
    const resolvedPrompt = systemPrompt ?? agentDef.description;
    const workspaceInstance = await this.resolveWorkspace(memberConfig);
    const workspaceRootPath = workspaceInstance?.getBasePath?.() ?? null;
    const skillPaths = this.resolveSkillPaths(memberName, agentDef);
    const llmConfig = memberConfig.llmConfig
      ? new LLMConfig({ extraParams: memberConfig.llmConfig })
      : undefined;
    const llmInstance = await this.llmFactory.createLLM(
      memberConfig.llmModelIdentifier,
      llmConfig,
    );
    const memoryDir =
      typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
        ? memberConfig.memoryDir.trim()
        : null;

    return new AgentConfig(
      memberName,
      agentDef.role ?? "",
      agentDef.description,
      llmInstance,
      resolvedPrompt,
      this.buildTools(agentDef),
      memberConfig.autoExecuteTools,
      this.collectProcessors(
        agentDef.inputProcessorNames,
        this.registries.input.getProcessor.bind(this.registries.input),
        this.registries.input,
        "Input processor",
        agentDef.name,
      ),
      this.collectProcessors(
        agentDef.llmResponseProcessorNames,
        this.registries.llmResponse.getProcessor.bind(this.registries.llmResponse),
        this.registries.llmResponse,
        "LLM response processor",
        agentDef.name,
      ),
      this.collectProcessors(
        agentDef.systemPromptProcessorNames,
        this.registries.systemPrompt.getProcessor.bind(this.registries.systemPrompt),
        this.registries.systemPrompt,
        "System prompt processor",
        agentDef.name,
      ),
      this.collectProcessors(
        agentDef.toolExecutionResultProcessorNames,
        this.registries.toolExecutionResult.getProcessor.bind(
          this.registries.toolExecutionResult,
        ),
        this.registries.toolExecutionResult,
        "Tool result processor",
        agentDef.name,
      ),
      this.collectProcessors<BaseToolInvocationPreprocessor>(
        agentDef.toolInvocationPreprocessorNames,
        this.registries.toolInvocationPreprocessor.getPreprocessor.bind(
          this.registries.toolInvocationPreprocessor,
        ),
        this.registries.toolInvocationPreprocessor,
        "Tool invocation preprocessor",
        agentDef.name,
      ),
      workspaceRootPath,
      this.collectProcessors(
        agentDef.lifecycleProcessorNames,
        this.registries.lifecycle.getProcessor.bind(this.registries.lifecycle),
        this.registries.lifecycle,
        "Lifecycle processor",
        agentDef.name,
      ),
      {
        agent_definition_id: agentDefinitionId,
        member_route_key:
          typeof memberConfig.memberRouteKey === "string" &&
          memberConfig.memberRouteKey.trim().length > 0
            ? normalizeMemberRouteKey(memberConfig.memberRouteKey)
            : normalizeMemberRouteKey(memberName),
        member_run_id:
          typeof memberConfig.memberRunId === "string" &&
          memberConfig.memberRunId.trim().length > 0
            ? memberConfig.memberRunId.trim()
            : null,
        is_first_user_turn: true,
        workspace_id: workspaceInstance?.workspaceId ?? null,
        workspace_root_path: workspaceRootPath,
        workspace_name:
          workspaceInstance?.getName?.() ?? workspaceInstance?.workspaceId ?? null,
        workspace_is_temp:
          workspaceInstance?.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID,
        ...(memberConfig.applicationSessionContext
          ? { [APPLICATION_SESSION_CONTEXT_KEY]: memberConfig.applicationSessionContext }
          : {}),
      },
      skillPaths,
      memoryDir,
    );
  }

  private async resolveAgentDefinition(agentDefinitionId: string): Promise<AgentDefinition> {
    const getFreshAgentDefinitionById = (
      this.agentDefinitionService as AgentDefinitionService & {
        getFreshAgentDefinitionById?: (definitionId: string) => Promise<AgentDefinition | null>;
      }
    ).getFreshAgentDefinitionById;
    const agentDef =
      typeof getFreshAgentDefinitionById === "function"
        ? await getFreshAgentDefinitionById.call(
          this.agentDefinitionService,
          agentDefinitionId,
        )
        : await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    if (!agentDef) {
      throw new Error(`AgentDefinition with ID ${agentDefinitionId} not found.`);
    }
    return agentDef;
  }

  private buildTools(agentDef: AgentDefinition): BaseTool[] {
    const tools: BaseTool[] = [];
    if (!agentDef.toolNames?.length) {
      return tools;
    }

    for (const name of agentDef.toolNames) {
      if (!defaultToolRegistry.getToolDefinition(name)) {
        logger.warn(
          `Tool '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
        continue;
      }
      try {
        tools.push(defaultToolRegistry.createTool(name) as BaseTool);
      } catch (error) {
        logger.error(
          `Failed to create tool instance for '${name}' from agent definition '${agentDef.name}': ${String(error)}`,
        );
      }
    }
    return tools;
  }

  private collectProcessors<T>(
    configuredNames: string[] | undefined,
    resolveProcessor: (name: string) => T | undefined,
    registry: { getOrderedProcessorOptions: () => Array<{ name: string; isMandatory: boolean }> },
    label: string,
    agentName: string,
  ): T[] {
    const processors: T[] = [];
    for (const name of mergeMandatoryAndOptional(configuredNames, registry)) {
      const processor = resolveProcessor(name);
      if (processor) {
        processors.push(processor);
      } else {
        logger.warn(
          `${label} '${name}' defined in agent definition '${agentName}' not found in registry. Skipping.`,
        );
      }
    }
    return processors;
  }

  private async resolveWorkspace(memberConfig: TeamMemberRunConfig) {
    let workspaceInstance = memberConfig.workspaceId
      ? this.workspaceManager.getWorkspaceById(memberConfig.workspaceId)
      : undefined;
    if (!workspaceInstance && memberConfig.workspaceRootPath?.trim()) {
      workspaceInstance = await this.workspaceManager.ensureWorkspaceByRootPath(
        memberConfig.workspaceRootPath.trim(),
      );
    }
    return workspaceInstance;
  }

  private resolveSkillPaths(memberName: string, agentDef: AgentDefinition): string[] {
    const skillPaths: string[] = [];
    if (!agentDef.skillNames?.length) {
      return skillPaths;
    }

    for (const skillName of agentDef.skillNames) {
      const skill = this.skillService.getSkill(skillName);
      if (skill) {
        skillPaths.push(skill.rootPath);
        logger.info(
          `Resolved skill '${skillName}' to path: ${skill.rootPath} for team member '${memberName}'`,
        );
      } else {
        logger.warn(
          `Skill '${skillName}' defined in agent definition '${agentDef.name}' not found via SkillService. Skipping.`,
        );
      }
    }

    return skillPaths;
  }
}
