import fs from "node:fs/promises";
import path from "node:path";
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
  CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
  getClaudeWorkspaceSkillMaterializer,
} from "../claude-workspace-skill-materializer.js";
import type { WorkspaceSkillMaterializer } from "../../shared/workspace-skill-materializer.js";
import {
  exposedWorkspaceSkillRequests,
  planExposedWorkspaceSkillRequests,
  RunWorkspaceSkills,
} from "../../shared/run-workspace-skills.js";
import {
  buildClaudeSessionConfig,
  DEFAULT_CLAUDE_PERMISSION_MODE,
} from "../session/claude-session-config.js";
import { ClaudeAgentRunContext, type ClaudeRunContext } from "./claude-agent-run-context.js";
import { resolveRuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";
import { CLAUDE_LONG_RUNNING_COMMAND_SECTION } from "../../../prompt/long-running-command-sections.js";
import { getAgentSemanticMemory, preparedSemanticMemoryFolders, type AgentSemanticMemory } from "../../../../agent-memory/services/agent-semantic-memory.js";

export class ClaudeSessionBootstrapper {
  private readonly workspaceResolver: ClaudeWorkspaceResolver;
  private readonly workspaceSkillMaterializer: WorkspaceSkillMaterializer;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;

  constructor(
    workspaceResolver: ClaudeWorkspaceResolver = getClaudeWorkspaceResolver(),
    workspaceSkillMaterializer: WorkspaceSkillMaterializer = getClaudeWorkspaceSkillMaterializer(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
    private readonly semanticMemory: AgentSemanticMemory = getAgentSemanticMemory(),
  ) {
    this.workspaceResolver = workspaceResolver;
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
  }

  /** The run's workspace skill holder, created by the factory when its preparation starts (one per run). */
  createRunWorkspaceSkills(runId: string): RunWorkspaceSkills {
    return new RunWorkspaceSkills({
      runId,
      materializer: this.workspaceSkillMaterializer,
      skillService: this.skillService,
      planRequests: planExposedWorkspaceSkillRequests,
    });
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
    await ensureWorkspaceSkillsFolder(runContext.runId, workingDirectory);
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
    await guard.workspaceSkills.acquire({
      workingDirectory,
      requests: exposedWorkspaceSkillRequests(configuredSkillBindings),
      workspaceCollisionPolicy: workspaceCollisionPolicyForScope(this.skillService.resolveSkillScope(agentDefinition)),
      assertPreparing: guard.assertAccepting,
    });
    guard.assertAccepting();
    const semanticMemory = await this.semanticMemory.prepareForRun(runContext.config.agentDefinitionId);
    const carpenterSystemPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberExecutionContext: runContext.config.memberExecutionContext,
      project: runContext.config.project,
      semanticMemoryPath: semanticMemory.agentFolder,
      globalSemanticMemoryPath: semanticMemory.globalFolder,
      longRunningCommandSection: CLAUDE_LONG_RUNNING_COMMAND_SECTION,
    });
    const sessionConfig = buildClaudeSessionConfig({
      model: runContext.config.llmModelIdentifier,
      workingDirectory,
      permissionMode: DEFAULT_CLAUDE_PERMISSION_MODE,
      autoExecuteTools: runContext.config.autoExecuteTools,
      additionalDirectories: preparedSemanticMemoryFolders(semanticMemory),
      llmConfig: runContext.config.llmConfig,
    });
    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new ClaudeAgentRunContext({
        sessionConfig,
        carpenterSystemPrompt,
        runtimeToolExposure,
        workspaceSkills: guard.workspaceSkills,
        sessionId: existingRuntimeContext?.sessionId ?? null,
        hasCompletedTurn: existingRuntimeContext?.hasCompletedTurn ?? false,
        activeTurnId: existingRuntimeContext?.activeTurnId ?? null,
      }),
    });
  }

}

/**
 * The Claude CLI watches `<workspace>/.claude/skills` only when that folder exists as its process starts, so a skill
 * linked there while a run that started with no skills is going would never be listed (DI-001, SR-004). Every
 * preparation (new and restore) therefore makes sure the folder exists before the session starts; nothing removes
 * it (the materializer creates the same folder for any run with a skill and leaves it). A failure is logged and
 * never fails the run: the skill notice gives an added skill's path either way (REQ-008).
 */
const ensureWorkspaceSkillsFolder = async (runId: string, workingDirectory: string): Promise<void> => {
  const folder = path.join(workingDirectory, ...CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE.workspaceSkillsRootSegments);
  try {
    await fs.mkdir(folder, { recursive: true });
  } catch (error) {
    console.warn(`CLAUDE_WORKSPACE_SKILLS_FOLDER_FAILED: run=${runId}, folder=${folder}: ${String(error)}`);
  }
};

let cachedClaudeSessionBootstrapper: ClaudeSessionBootstrapper | null = null;

export const getClaudeSessionBootstrapper = (): ClaudeSessionBootstrapper => {
  if (!cachedClaudeSessionBootstrapper) {
    cachedClaudeSessionBootstrapper = new ClaudeSessionBootstrapper();
  }
  return cachedClaudeSessionBootstrapper;
};
