import type {
  ClaudeSessionBootstrapPreparation,
  ClaudeSessionBootstrapStrategy,
} from "../backend/claude-session-bootstrap-strategy.js";
import type { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { ClaudeAgentRunContext } from "../backend/claude-agent-run-context.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";

export class TeamMemberClaudeSessionBootstrapStrategy implements ClaudeSessionBootstrapStrategy {
  appliesTo(
    runContext: AgentRunContext<ClaudeAgentRunContext | null>,
  ): boolean {
    return (
      runContext.config.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK &&
      Boolean(runContext.config.memberTeamContext)
    );
  }

  prepare(input: {
    runContext: AgentRunContext<ClaudeAgentRunContext | null>;
  }): ClaudeSessionBootstrapPreparation {
    return {
      memberTeamContext: input.runContext.config.memberTeamContext,
    };
  }
}

let cachedTeamMemberClaudeSessionBootstrapStrategy: TeamMemberClaudeSessionBootstrapStrategy | null = null;

export const getTeamMemberClaudeSessionBootstrapStrategy = (): TeamMemberClaudeSessionBootstrapStrategy => {
  if (!cachedTeamMemberClaudeSessionBootstrapStrategy) {
    cachedTeamMemberClaudeSessionBootstrapStrategy = new TeamMemberClaudeSessionBootstrapStrategy();
  }
  return cachedTeamMemberClaudeSessionBootstrapStrategy;
};
