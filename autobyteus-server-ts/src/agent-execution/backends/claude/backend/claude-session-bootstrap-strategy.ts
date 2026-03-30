import type { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { TeamRunContext } from "../../../../agent-team-execution/domain/team-run-context.js";
import type { ClaudeTeamRunContext } from "../../../../agent-team-execution/backends/claude/claude-team-run-context.js";
import type { ClaudeAgentRunContext } from "./claude-agent-run-context.js";

export type ClaudeSessionBootstrapPreparation = {
  teamContext: TeamRunContext<ClaudeTeamRunContext> | null;
};

export interface ClaudeSessionBootstrapStrategy {
  appliesTo(
    runContext: AgentRunContext<ClaudeAgentRunContext | null>,
  ): boolean;
  prepare(input: {
    runContext: AgentRunContext<ClaudeAgentRunContext | null>;
  }): Promise<ClaudeSessionBootstrapPreparation> | ClaudeSessionBootstrapPreparation;
}

export class DefaultClaudeSessionBootstrapStrategy implements ClaudeSessionBootstrapStrategy {
  appliesTo(): boolean {
    return true;
  }

  prepare(): ClaudeSessionBootstrapPreparation {
    return {
      teamContext: null,
    };
  }
}
