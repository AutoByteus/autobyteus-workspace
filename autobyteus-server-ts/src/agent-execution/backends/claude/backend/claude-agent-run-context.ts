import type { ClaudeSessionConfig } from "../session/claude-session-config.js";
import type { AgentRunContext as SharedAgentRunContext } from "../../../domain/agent-run-context.js";
import type { RunWorkspaceSkills } from "../../shared/run-workspace-skills.js";
import type { RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";

export class ClaudeAgentRunContext {
  readonly sessionConfig: ClaudeSessionConfig;
  readonly carpenterSystemPrompt: string;
  /** Replaced when the run's definition changes its tools; later process generations read it. */
  runtimeToolExposure: RuntimeAgentToolExposure;
  /**
   * The run's workspace skill links, held from preparation to release (released only through it). Null only in a
   * restore binding that was not prepared yet: it holds no links.
   */
  readonly workspaceSkills: RunWorkspaceSkills | null;
  readonly sessionId: string | null;
  hasCompletedTurn: boolean;
  activeTurnId: string | null;

  constructor(input: {
    sessionConfig: ClaudeSessionConfig;
    carpenterSystemPrompt: string;
    runtimeToolExposure: RuntimeAgentToolExposure;
    workspaceSkills: RunWorkspaceSkills | null;
    sessionId?: string | null;
    hasCompletedTurn?: boolean;
    activeTurnId?: string | null;
  }) {
    this.sessionConfig = input.sessionConfig;
    this.carpenterSystemPrompt = input.carpenterSystemPrompt;
    this.runtimeToolExposure = input.runtimeToolExposure;
    this.workspaceSkills = input.workspaceSkills;
    this.sessionId = input.sessionId ?? null;
    this.hasCompletedTurn = input.hasCompletedTurn ?? false;
    this.activeTurnId = input.activeTurnId ?? null;
  }

  /** The holder of a prepared run's links; a restore binding that was not prepared has none. */
  requireWorkspaceSkills(): RunWorkspaceSkills {
    if (!this.workspaceSkills) throw new Error("Claude run context has no workspace skills: it was not prepared.");
    return this.workspaceSkills;
  }

  get autoExecuteTools(): boolean {
    return this.sessionConfig.autoExecuteTools;
  }
}

export type ClaudeRunContext = SharedAgentRunContext<ClaudeAgentRunContext>;
