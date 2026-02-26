import { AgentTeamDefinition } from "../domain/models.js";
import { PrismaAgentTeamDefinitionConverter } from "../converters/prisma-converter.js";
import { SqlAgentTeamDefinitionRepository } from "../repositories/sql/agent-team-definition-repository.js";

export class SqlAgentTeamDefinitionProvider {
  private repository: SqlAgentTeamDefinitionRepository;

  constructor(repository: SqlAgentTeamDefinitionRepository = new SqlAgentTeamDefinitionRepository()) {
    this.repository = repository;
  }

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    const data = PrismaAgentTeamDefinitionConverter.toCreateInput(domainObj);
    const created = await this.repository.createDefinition(data);
    return PrismaAgentTeamDefinitionConverter.toDomain(created);
  }

  async getById(id: string): Promise<AgentTeamDefinition | null> {
    const sqlObj = await this.repository.findById(Number(id));
    return sqlObj ? PrismaAgentTeamDefinitionConverter.toDomain(sqlObj) : null;
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    const sqlObjs = await this.repository.findAll();
    return sqlObjs.map((obj) => PrismaAgentTeamDefinitionConverter.toDomain(obj));
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    const update = PrismaAgentTeamDefinitionConverter.toUpdateInput(domainObj);
    const updated = await this.repository.updateDefinition(update);
    return PrismaAgentTeamDefinitionConverter.toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.deleteById(Number(id));
  }
}
