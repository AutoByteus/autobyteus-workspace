import type { AgentRunContext } from "../../../domain/agent-run-context.js";
import type { ClaudeAgentRunContext } from "./claude-agent-run-context.js";
import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";

export type ClaudeSessionBootstrapPreparation = {
  memberTeamContext: MemberTeamContext | null;
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
      memberTeamContext: null,
    };
  }
}
