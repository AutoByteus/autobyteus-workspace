import type { AgentArtifact } from "../domain/models.js";

export type CreateArtifactInput = {
  runId: string;
  path: string;
  type: string;
  workspaceRoot?: string | null;
  url?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface ArtifactPersistenceProvider {
  createArtifact(input: CreateArtifactInput): Promise<AgentArtifact>;
  getByRunId(runId: string): Promise<AgentArtifact[]>;
}
