import { AgentArtifact } from "../domain/models.js";
import {
  SqlAgentArtifactRepository,
  type SqlAgentArtifactRecord,
} from "../repositories/sql/agent-artifact-repository.js";
import type { ArtifactPersistenceProvider, CreateArtifactInput } from "./persistence-provider.js";

const toDomain = (record: SqlAgentArtifactRecord): AgentArtifact =>
  new AgentArtifact({
    id: String(record.id),
    runId: record.runId,
    path: record.path,
    type: record.type,
    workspaceRoot: record.workspaceRoot ?? null,
    url: record.url ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export class SqlArtifactPersistenceProvider implements ArtifactPersistenceProvider {
  constructor(private readonly repository: SqlAgentArtifactRepository = new SqlAgentArtifactRepository()) {}

  async createArtifact(input: CreateArtifactInput): Promise<AgentArtifact> {
    const created = await this.repository.createArtifact(input);
    return toDomain(created);
  }

  async getByRunId(runId: string): Promise<AgentArtifact[]> {
    const records = await this.repository.getByRunId(runId);
    return records.map((record) => toDomain(record));
  }
}
