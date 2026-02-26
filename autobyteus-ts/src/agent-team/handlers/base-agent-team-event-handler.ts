import type { BaseAgentTeamEvent } from '../events/agent-team-events.js';
import type { AgentTeamContext } from '../context/agent-team-context.js';

export abstract class BaseAgentTeamEventHandler {
  abstract handle(event: BaseAgentTeamEvent, context: AgentTeamContext): Promise<void>;
}
