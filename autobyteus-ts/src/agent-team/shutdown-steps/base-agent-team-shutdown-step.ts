import type { AgentTeamContext } from '../context/agent-team-context.js';

export abstract class BaseAgentTeamShutdownStep {
  abstract execute(context: AgentTeamContext): Promise<boolean>;
}
