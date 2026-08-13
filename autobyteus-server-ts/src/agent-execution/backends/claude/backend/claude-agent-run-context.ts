import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../../skills/domain/models.js";
import type { ClaudeSessionConfig } from "../session/claude-session-config.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { MaterializedClaudeWorkspaceSkill } from "../claude-workspace-skill-materializer.js";
import type { RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";

export class ClaudeAgentRunContext {
  readonly sessionConfig: ClaudeSessionConfig;
  readonly carpenterSystemPrompt: string;
  readonly runtimeToolExposure: RuntimeAgentToolExposure;
  readonly configuredSkills: Skill[];
  readonly materializedConfiguredSkills: MaterializedClaudeWorkspaceSkill[];
  readonly skillAccessMode: SkillAccessMode | null;
  sessionId: string | null;
  hasCompletedTurn: boolean;
  activeTurnId: string | null;

  constructor(input: {
    sessionConfig: ClaudeSessionConfig;
    carpenterSystemPrompt: string;
    runtimeToolExposure: RuntimeAgentToolExposure;
    configuredSkills?: Skill[] | null;
    materializedConfiguredSkills?: MaterializedClaudeWorkspaceSkill[] | null;
    skillAccessMode?: SkillAccessMode | null;
    sessionId?: string | null;
    hasCompletedTurn?: boolean;
    activeTurnId?: string | null;
  }) {
    this.sessionConfig = input.sessionConfig;
    this.carpenterSystemPrompt = input.carpenterSystemPrompt;
    this.runtimeToolExposure = input.runtimeToolExposure;
    this.configuredSkills = input.configuredSkills ?? [];
    this.materializedConfiguredSkills = input.materializedConfiguredSkills ?? [];
    this.skillAccessMode = input.skillAccessMode ?? null;
    this.sessionId = input.sessionId ?? null;
    this.hasCompletedTurn = input.hasCompletedTurn ?? false;
    this.activeTurnId = input.activeTurnId ?? null;
  }

  get autoExecuteTools(): boolean {
    return this.sessionConfig.autoExecuteTools;
  }
}

export type ClaudeRunContext = SharedAgentRunContext<ClaudeAgentRunContext>;
