import { AgentArtifact } from "../domain/models.js";
import {
  nextNumericStringId,
  normalizeNullableString,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";
import type { ArtifactPersistenceProvider, CreateArtifactInput } from "./persistence-provider.js";

type AgentArtifactRecord = {
  id: string;
  runId: string;
  path: string;
  type: string;
  workspaceRoot: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
};

const artifactsFilePath = resolvePersistencePath("agent-artifacts", "artifacts.json");

const toDomain = (record: AgentArtifactRecord): AgentArtifact =>
  new AgentArtifact({
    id: record.id,
    runId: record.runId,
    path: record.path,
    type: record.type,
    workspaceRoot: record.workspaceRoot,
    url: record.url,
    createdAt: parseDate(record.createdAt),
    updatedAt: parseDate(record.updatedAt),
  });

export class FileArtifactPersistenceProvider implements ArtifactPersistenceProvider {
  async createArtifact(input: CreateArtifactInput): Promise<AgentArtifact> {
    const now = new Date();
    let created: AgentArtifactRecord | null = null;

    await updateJsonArrayFile<AgentArtifactRecord>(artifactsFilePath, (rows) => {
      const id = nextNumericStringId(rows);
      const createdRecord: AgentArtifactRecord = {
        id,
        runId: input.runId,
        path: input.path,
        type: input.type,
        workspaceRoot: normalizeNullableString(input.workspaceRoot ?? null),
        url: normalizeNullableString(input.url ?? null),
        createdAt: (input.createdAt ?? now).toISOString(),
        updatedAt: (input.updatedAt ?? now).toISOString(),
      };
      created = createdRecord;
      return [...rows, createdRecord];
    });

    if (!created) {
      throw new Error("Failed to create artifact record.");
    }
    return toDomain(created);
  }

  async getByRunId(runId: string): Promise<AgentArtifact[]> {
    const rows = await readJsonArrayFile<AgentArtifactRecord>(artifactsFilePath);
    return rows
      .filter((row) => row.runId === runId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((row) => toDomain(row));
  }
}
