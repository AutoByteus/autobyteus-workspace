import { preparePrivateRuntimeSkills, privateSkillInstructions } from "../../shared/prepare-private-runtime-skills.js";
import type { ProviderPreparationGuard } from "../../provider-preparation-guard.js";
import { workspaceCollisionPolicyForScope } from "../../shared/workspace-skill-collision-policy.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../../skills/services/skill-service.js";
import {
  getClaudeWorkspaceResolver,
  type ClaudeWorkspaceResolver,
} from "../claude-workspace-resolver.js";
import {
  buildClaudeSessionConfig,
  DEFAULT_CLAUDE_PERMISSION_MODE,
} from "../session/claude-session-config.js";
import { ClaudeAgentRunContext, type ClaudeRunContext } from "./claude-agent-run-context.js";
import { resolveRuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";

export class ClaudeSessionBootstrapper {
  private readonly workspaceResolver: ClaudeWorkspaceResolver;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;

  constructor(
    workspaceResolver: ClaudeWorkspaceResolver = getClaudeWorkspaceResolver(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
  ) {
    this.workspaceResolver = workspaceResolver;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
  }

  async bootstrapForCreate(
    runContext: AgentRunContext<null>,
    guard: ProviderPreparationGuard,
  ): Promise<ClaudeRunContext> {
    return this.bootstrapInternal(runContext, null, guard);
  }

  async bootstrapForRestore(
    runContext: AgentRunContext<ClaudeAgentRunContext>,
    guard: ProviderPreparationGuard,
  ): Promise<ClaudeRunContext> {
    return this.bootstrapInternal(runContext, runContext.runtimeContext, guard);
  }

  private async bootstrapInternal(
    runContext: AgentRunContext<ClaudeAgentRunContext | null>,
    existingRuntimeContext: ClaudeAgentRunContext | null,
    guard: ProviderPreparationGuard,
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
    const configuredSkillBindings =
      this.skillService.resolveConfiguredSkillBindingsForAgent(agentDefinition);
    const runtimeToolExposure = resolveRuntimeAgentToolExposure(
      agentDefinition,
      runContext.config.memberExecutionContext,
    );
    const privateSkillProfile = await preparePrivateRuntimeSkills({
      runtime: "claude", workingDirectory, memoryDir: runContext.config.memoryDir,
      bindings: configuredSkillBindings, skills: this.skillService, guard,
      collisionPolicy: workspaceCollisionPolicyForScope(this.skillService.resolveSkillScope(agentDefinition)),
    });
    guard.assertAccepting();
    const configuredSkills = privateSkillProfile?.exposures.map(entry => entry.skill) ?? [];
    const carpenterSystemPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberExecutionContext: runContext.config.memberExecutionContext,
    }) + (privateSkillProfile ? privateSkillInstructions(privateSkillProfile) : "");
    const sessionConfig = buildClaudeSessionConfig({
      model: runContext.config.llmModelIdentifier,
      workingDirectory,
      permissionMode: DEFAULT_CLAUDE_PERMISSION_MODE,
      autoExecuteTools: runContext.config.autoExecuteTools,
      llmConfig: runContext.config.llmConfig,
    });
    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new ClaudeAgentRunContext({
        sessionConfig,
        privateSkillProfile,
        carpenterSystemPrompt,
        runtimeToolExposure,
        configuredSkills,
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
