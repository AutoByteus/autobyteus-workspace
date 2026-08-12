import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../../skills/services/skill-service.js";
import {
  getClaudeWorkspaceResolver,
  type ClaudeWorkspaceResolver,
} from "../claude-workspace-resolver.js";
import {
  getClaudeWorkspaceSkillMaterializer,
  type ClaudeWorkspaceSkillMaterializer,
} from "../claude-workspace-skill-materializer.js";
import {
  buildClaudeSessionConfig,
  DEFAULT_CLAUDE_PERMISSION_MODE,
} from "../session/claude-session-config.js";
import { ClaudeAgentRunContext, type ClaudeRunContext } from "./claude-agent-run-context.js";
import { resolveRuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { composeCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";

export class ClaudeSessionBootstrapper {
  private readonly workspaceResolver: ClaudeWorkspaceResolver;
  private readonly workspaceSkillMaterializer: ClaudeWorkspaceSkillMaterializer;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;

  constructor(
    workspaceResolver: ClaudeWorkspaceResolver = getClaudeWorkspaceResolver(),
    workspaceSkillMaterializer: ClaudeWorkspaceSkillMaterializer = getClaudeWorkspaceSkillMaterializer(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
  ) {
    this.workspaceResolver = workspaceResolver;
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
  }

  async bootstrapForCreate(
    runContext: AgentRunContext<null>,
  ): Promise<ClaudeRunContext> {
    return this.bootstrapInternal(runContext, null);
  }

  async bootstrapForRestore(
    runContext: AgentRunContext<ClaudeAgentRunContext>,
  ): Promise<ClaudeRunContext> {
    return this.bootstrapInternal(runContext, runContext.runtimeContext);
  }

  private async bootstrapInternal(
    runContext: AgentRunContext<ClaudeAgentRunContext | null>,
    existingRuntimeContext: ClaudeAgentRunContext | null,
  ): Promise<ClaudeRunContext> {
    const workingDirectory = await this.workspaceResolver.resolveWorkingDirectory(
      runContext.config.workspaceId,
    );
    const agentDefinition = await this.agentDefinitionService.getAgentDefinitionById(
      runContext.config.agentDefinitionId,
    );
    if (!agentDefinition) {
      throw new Error(`Agent definition '${runContext.config.agentDefinitionId}' was not found.`);
    }
    const configuredSkills = this.skillService.resolveConfiguredSkillsForAgent(agentDefinition);
    const runtimeToolExposure = resolveRuntimeAgentToolExposure(
      agentDefinition,
      runContext.config.memberTeamContext,
    );
    const skillAccessMode = resolveSkillAccessMode(
      runContext.config.skillAccessMode ?? null,
      configuredSkills.length,
    );
    const exposedConfiguredSkills =
      skillAccessMode === SkillAccessMode.NONE ? [] : configuredSkills;
    const materializedConfiguredSkills =
      await this.workspaceSkillMaterializer.materializeConfiguredClaudeWorkspaceSkills({
        workingDirectory,
        configuredSkills: exposedConfiguredSkills,
        skillAccessMode,
      });
    const carpenterSystemPrompt = composeCarpenterPrompt({
      agentDefinition,
      workspaceRootPath: workingDirectory,
      memberTeamContext: runContext.config.memberTeamContext,
    });
    const sessionConfig = buildClaudeSessionConfig({
      model: runContext.config.llmModelIdentifier,
      workingDirectory,
      permissionMode: DEFAULT_CLAUDE_PERMISSION_MODE,
      autoExecuteTools: runContext.config.autoExecuteTools,
    });
    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new ClaudeAgentRunContext({
        sessionConfig,
        carpenterSystemPrompt,
        runtimeToolExposure,
        configuredSkills: exposedConfiguredSkills,
        materializedConfiguredSkills,
        skillAccessMode,
        sessionId: existingRuntimeContext?.sessionId ?? null,
        hasCompletedTurn: existingRuntimeContext?.hasCompletedTurn ?? false,
        activeTurnId: existingRuntimeContext?.activeTurnId ?? null,
      }),
    });
  }

}

let cachedClaudeSessionBootstrapper: ClaudeSessionBootstrapper | null = null;

export const getClaudeSessionBootstrapper = (): ClaudeSessionBootstrapper => {
  if (!cachedClaudeSessionBootstrapper) {
    cachedClaudeSessionBootstrapper = new ClaudeSessionBootstrapper();
  }
  return cachedClaudeSessionBootstrapper;
};
