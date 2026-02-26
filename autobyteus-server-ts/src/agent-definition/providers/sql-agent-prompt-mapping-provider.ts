import { AgentPromptMapping } from "../domain/models.js";
import { PrismaAgentPromptMappingConverter } from "../converters/prisma-converter.js";
import { SqlAgentPromptMappingRepository } from "../repositories/sql/agent-prompt-mapping-repository.js";

export class SqlAgentPromptMappingProvider {
  private repository: SqlAgentPromptMappingRepository;

  constructor(repository: SqlAgentPromptMappingRepository = new SqlAgentPromptMappingRepository()) {
    this.repository = repository;
  }

  async getByAgentDefinitionId(agentDefinitionId: string): Promise<AgentPromptMapping | null> {
    const mapping = await this.repository.getByAgentDefinitionId(Number(agentDefinitionId));
    return mapping ? PrismaAgentPromptMappingConverter.toDomain(mapping) : null;
  }

  async getByAgentDefinitionIds(agentDefinitionIds: string[]): Promise<Map<string, AgentPromptMapping>> {
    const numericIds = agentDefinitionIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const mappings = await this.repository.getByAgentDefinitionIds(numericIds);
    const mappingByAgentDefinitionId = new Map<string, AgentPromptMapping>();
    for (const mapping of mappings) {
      const domain = PrismaAgentPromptMappingConverter.toDomain(mapping);
      mappingByAgentDefinitionId.set(domain.agentDefinitionId, domain);
    }
    return mappingByAgentDefinitionId;
  }

  async upsert(domainObj: AgentPromptMapping): Promise<AgentPromptMapping> {
    const agentDefinitionId = Number(domainObj.agentDefinitionId);
    const createInput = PrismaAgentPromptMappingConverter.toCreateInput(domainObj);
    const updateInput = PrismaAgentPromptMappingConverter.toUpdateInput(domainObj);
    const result = await this.repository.upsertMapping(agentDefinitionId, createInput, updateInput);
    return PrismaAgentPromptMappingConverter.toDomain(result);
  }

  async deleteByAgentDefinitionId(agentDefinitionId: string): Promise<boolean> {
    return this.repository.deleteByAgentDefinitionId(Number(agentDefinitionId));
  }
}
