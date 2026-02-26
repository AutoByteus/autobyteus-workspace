import { AgentDefinition } from "../domain/models.js";
import { PrismaAgentDefinitionConverter } from "../converters/prisma-converter.js";
import { SqlAgentDefinitionRepository } from "../repositories/sql/agent-definition-repository.js";

export class SqlAgentDefinitionProvider {
  private repository: SqlAgentDefinitionRepository;

  constructor(repository: SqlAgentDefinitionRepository = new SqlAgentDefinitionRepository()) {
    this.repository = repository;
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    const data = PrismaAgentDefinitionConverter.toCreateInput(domainObj);
    const created = await this.repository.createDefinition(data);
    return PrismaAgentDefinitionConverter.toDomain(created);
  }

  async getById(id: string): Promise<AgentDefinition | null> {
    const sqlObj = await this.repository.findById(Number(id));
    return sqlObj ? PrismaAgentDefinitionConverter.toDomain(sqlObj) : null;
  }

  async getAll(): Promise<AgentDefinition[]> {
    const sqlObjs = await this.repository.findAll();
    return sqlObjs.map((obj) => PrismaAgentDefinitionConverter.toDomain(obj));
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    const update = PrismaAgentDefinitionConverter.toUpdateInput(domainObj);
    const updated = await this.repository.updateDefinition(update);
    return PrismaAgentDefinitionConverter.toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.deleteById(Number(id));
  }
}
