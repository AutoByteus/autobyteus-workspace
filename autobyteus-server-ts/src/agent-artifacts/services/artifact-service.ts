import { PrismaAgentArtifactConverter } from "../converters/prisma-converter.js";
import type { AgentArtifact } from "../domain/models.js";
import { SqlAgentArtifactRepository } from "../repositories/sql/agent-artifact-repository.js";

type ArtifactServiceOptions = {
  repository?: SqlAgentArtifactRepository;
};

export class ArtifactService {
  private static instance: ArtifactService | null = null;

  static getInstance(options: ArtifactServiceOptions = {}): ArtifactService {
    if (!ArtifactService.instance) {
      ArtifactService.instance = new ArtifactService(options);
    }
    return ArtifactService.instance;
  }

  static resetInstance(): void {
    ArtifactService.instance = null;
  }

  private repository: SqlAgentArtifactRepository;

  constructor(options: ArtifactServiceOptions = {}) {
    this.repository = options.repository ?? new SqlAgentArtifactRepository();
  }

  async createArtifact(options: {
    runId: string;
    path: string;
    type: string;
    url?: string | null;
    workspaceRoot?: string | null;
  }): Promise<AgentArtifact> {
    const now = new Date();
    const created = await this.repository.createArtifact({
      runId: options.runId,
      path: options.path,
      type: options.type,
      url: options.url ?? null,
      workspaceRoot: options.workspaceRoot ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return PrismaAgentArtifactConverter.toDomain(created);
  }

  async getArtifactsByRunId(runId: string): Promise<AgentArtifact[]> {
    const records = await this.repository.getByRunId(runId);
    return records.map((record) => PrismaAgentArtifactConverter.toDomain(record));
  }
}
