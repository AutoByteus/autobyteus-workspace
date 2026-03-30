import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { ClaudeTeamRunContext } from "./claude-team-run-context.js";
import type {
  ClaudeSessionBootstrapPreparation,
  ClaudeSessionBootstrapStrategy,
} from "../../../agent-execution/backends/claude/backend/claude-session-bootstrap-strategy.js";
import type {
  AgentRunContext,
} from "../../../agent-execution/domain/agent-run-context.js";
import type { ClaudeAgentRunContext } from "../../../agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

export class TeamClaudeSessionBootstrapStrategy implements ClaudeSessionBootstrapStrategy {
  appliesTo(
    runContext: AgentRunContext<ClaudeAgentRunContext | null>,
  ): boolean {
    return (
      runContext.config.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK &&
      runContext.config.teamContext?.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
    );
  }

  prepare(input: {
    runContext: AgentRunContext<ClaudeAgentRunContext | null>;
  }): ClaudeSessionBootstrapPreparation {
    return {
      teamContext: input.runContext.config.teamContext as TeamRunContext<ClaudeTeamRunContext>,
    };
  }
}

let cachedTeamClaudeSessionBootstrapStrategy: TeamClaudeSessionBootstrapStrategy | null = null;

export const getTeamClaudeSessionBootstrapStrategy = (): TeamClaudeSessionBootstrapStrategy => {
  if (!cachedTeamClaudeSessionBootstrapStrategy) {
    cachedTeamClaudeSessionBootstrapStrategy = new TeamClaudeSessionBootstrapStrategy();
  }
  return cachedTeamClaudeSessionBootstrapStrategy;
};
