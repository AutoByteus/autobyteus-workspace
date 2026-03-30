import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../../skills/domain/models.js";
import type { ClaudeSessionConfig } from "../session/claude-session-config.js";
import type { TeamRunContext } from "../../../../agent-team-execution/domain/team-run-context.js";
import type { ClaudeTeamRunContext } from "../../../../agent-team-execution/backends/claude/claude-team-run-context.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { MaterializedClaudeWorkspaceSkill } from "../claude-workspace-skill-materializer.js";

export class ClaudeAgentRunContext {
  readonly sessionConfig: ClaudeSessionConfig;
  readonly agentInstruction: string | null;
  readonly configuredSkills: Skill[];
  readonly materializedConfiguredSkills: MaterializedClaudeWorkspaceSkill[];
  readonly skillAccessMode: SkillAccessMode | null;
  readonly teamContext: TeamRunContext<ClaudeTeamRunContext> | null;
  sessionId: string | null;
  hasCompletedTurn: boolean;
  activeTurnId: string | null;

  constructor(input: {
    sessionConfig: ClaudeSessionConfig;
    agentInstruction?: string | null;
    configuredSkills?: Skill[] | null;
    materializedConfiguredSkills?: MaterializedClaudeWorkspaceSkill[] | null;
    skillAccessMode?: SkillAccessMode | null;
    teamContext?: TeamRunContext<ClaudeTeamRunContext> | null;
    sessionId?: string | null;
    hasCompletedTurn?: boolean;
    activeTurnId?: string | null;
  }) {
    this.sessionConfig = input.sessionConfig;
    this.agentInstruction = input.agentInstruction ?? null;
    this.configuredSkills = input.configuredSkills ?? [];
    this.materializedConfiguredSkills = input.materializedConfiguredSkills ?? [];
    this.skillAccessMode = input.skillAccessMode ?? null;
    this.teamContext = input.teamContext ?? null;
    this.sessionId = input.sessionId ?? null;
    this.hasCompletedTurn = input.hasCompletedTurn ?? false;
    this.activeTurnId = input.activeTurnId ?? null;
  }

  get autoExecuteTools(): boolean {
    return this.sessionConfig.permissionMode === "bypassPermissions";
  }
}

export type ClaudeRunContext = SharedAgentRunContext<ClaudeAgentRunContext>;
