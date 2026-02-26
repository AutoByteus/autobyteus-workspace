import type { AgentTeamContext } from '../context/agent-team-context.js';

export abstract class BaseAgentTeamBootstrapStep {
  abstract execute(context: AgentTeamContext): Promise<boolean>;
}
