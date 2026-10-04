import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import {
  createUuidIdentityToken,
  generateAgentRunIdForDefinitionName,
  normalizeStoredAgentRunId,
} from "../identity/agent-run-id.js";

type AgentRunIdentityAllocatorOptions = {
  agentDefinitionService?: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  createToken?: () => string;
};

/** Fresh identities depend only on the current definition and a new UUID. */
export class AgentRunIdentityAllocator {
  private readonly agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  private readonly createToken: () => string;

  constructor(options: AgentRunIdentityAllocatorOptions = {}) {
    this.agentDefinitionService = options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.createToken = options.createToken ?? createUuidIdentityToken;
  }

  async allocateForAgentDefinition(agentDefinitionId: string): Promise<string> {
    const normalizedDefinitionId = agentDefinitionId.trim();
    if (!normalizedDefinitionId) throw new Error("agentDefinitionId is required.");
    const definition = await this.agentDefinitionService.getAgentDefinitionById(normalizedDefinitionId);
    if (!definition) {
      throw new Error(`AgentDefinition '${normalizedDefinitionId}' cannot be loaded for agent run identity allocation.`);
    }
    return normalizeStoredAgentRunId(
      generateAgentRunIdForDefinitionName(definition.name, this.createToken()),
    );
  }
}
