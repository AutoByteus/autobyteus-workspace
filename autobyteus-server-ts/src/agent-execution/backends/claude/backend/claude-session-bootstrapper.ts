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
  resolveClaudePermissionMode,
} from "../session/claude-session-config.js";
import { ClaudeAgentRunContext, type ClaudeRunContext } from "./claude-agent-run-context.js";
import {
  DefaultClaudeSessionBootstrapStrategy,
  type ClaudeSessionBootstrapStrategy,
} from "./claude-session-bootstrap-strategy.js";
import {
  getTeamClaudeSessionBootstrapStrategy,
} from "../../../../agent-team-execution/backends/claude/claude-team-session-bootstrap-strategy.js";
import { resolveConfiguredAgentToolExposure } from "../../../shared/configured-agent-tool-exposure.js";

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class ClaudeSessionBootstrapper {
  private readonly workspaceResolver: ClaudeWorkspaceResolver;
  private readonly workspaceSkillMaterializer: ClaudeWorkspaceSkillMaterializer;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;
  private readonly defaultBootstrapStrategy: ClaudeSessionBootstrapStrategy;
  private readonly teamBootstrapStrategy: ClaudeSessionBootstrapStrategy;

  constructor(
    workspaceResolver: ClaudeWorkspaceResolver = getClaudeWorkspaceResolver(),
    workspaceSkillMaterializer: ClaudeWorkspaceSkillMaterializer = getClaudeWorkspaceSkillMaterializer(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
    defaultBootstrapStrategy: ClaudeSessionBootstrapStrategy = new DefaultClaudeSessionBootstrapStrategy(),
    teamBootstrapStrategy: ClaudeSessionBootstrapStrategy = getTeamClaudeSessionBootstrapStrategy(),
  ) {
    this.workspaceResolver = workspaceResolver;
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
    this.defaultBootstrapStrategy = defaultBootstrapStrategy;
    this.teamBootstrapStrategy = teamBootstrapStrategy;
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
    const configuredSkills = this.skillService.getSkills(agentDefinition?.skillNames ?? []);
    const configuredToolExposure = resolveConfiguredAgentToolExposure(agentDefinition);
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
    const agentInstruction =
      asTrimmedString(agentDefinition?.instructions) ??
      asTrimmedString(agentDefinition?.description);
    const sessionConfig = buildClaudeSessionConfig({
      model: runContext.config.llmModelIdentifier,
      workingDirectory,
      permissionMode: resolveClaudePermissionMode(runContext.config.autoExecuteTools),
    });
    const runtimeContextInput = await this.prepareRuntimeContextInput(runContext);

    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new ClaudeAgentRunContext({
        sessionConfig,
        agentInstruction,
        configuredToolExposure,
        configuredSkills: exposedConfiguredSkills,
        materializedConfiguredSkills,
        skillAccessMode,
        teamContext: runtimeContextInput.teamContext,
        sessionId: existingRuntimeContext?.sessionId ?? null,
        hasCompletedTurn: existingRuntimeContext?.hasCompletedTurn ?? false,
        activeTurnId: existingRuntimeContext?.activeTurnId ?? null,
      }),
    });
  }

  private async prepareRuntimeContextInput(
    runContext: AgentRunContext<ClaudeAgentRunContext | null>,
  ) {
    const strategy = this.teamBootstrapStrategy.appliesTo(runContext)
      ? this.teamBootstrapStrategy
      : this.defaultBootstrapStrategy;
    return strategy.prepare({ runContext });
  }
}

let cachedClaudeSessionBootstrapper: ClaudeSessionBootstrapper | null = null;

export const getClaudeSessionBootstrapper = (): ClaudeSessionBootstrapper => {
  if (!cachedClaudeSessionBootstrapper) {
    cachedClaudeSessionBootstrapper = new ClaudeSessionBootstrapper();
  }
  return cachedClaudeSessionBootstrapper;
};
