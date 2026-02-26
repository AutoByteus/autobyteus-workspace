export class AgentNotFoundException extends Error {
  agentId: string;

  constructor(agentId: string) {
    super(`Agent with id ${agentId} not found. This is an invalid state.`);
    this.agentId = agentId;
    this.name = 'AgentNotFoundException';
  }
}
