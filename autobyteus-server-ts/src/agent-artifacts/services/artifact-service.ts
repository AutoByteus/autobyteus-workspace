import type { AgentArtifact } from "../domain/models.js";
import { ArtifactPersistenceProxy } from "../providers/persistence-proxy.js";
import type { ArtifactPersistenceProvider } from "../providers/persistence-provider.js";

type ArtifactRepositoryAdapter = {
  createArtifact(input: {
    runId: string;
    path: string;
    type: string;
    workspaceRoot?: string | null;
    url?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Promise<{
    id: string | number;
    runId: string;
    path: string;
    type: string;
    workspaceRoot?: string | null;
    url?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  getByRunId(runId: string): Promise<Array<{
    id: string | number;
    runId: string;
    path: string;
    type: string;
    workspaceRoot?: string | null;
    url?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>>;
};

type ArtifactServiceOptions = {
  provider?: ArtifactPersistenceProvider;
  repository?: ArtifactRepositoryAdapter;
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

  private provider: ArtifactPersistenceProvider;

  constructor(options: ArtifactServiceOptions = {}) {
    if (options.provider) {
      this.provider = options.provider;
      return;
    }
    if (options.repository) {
      this.provider = {
        createArtifact: async (input) => {
          const created = await options.repository!.createArtifact(input);
          return {
            id: String(created.id),
            runId: created.runId,
            path: created.path,
            type: created.type,
            workspaceRoot: created.workspaceRoot ?? null,
            url: created.url ?? null,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          };
        },
        getByRunId: async (runId) => {
          const rows = await options.repository!.getByRunId(runId);
          return rows.map((row) => ({
            id: String(row.id),
            runId: row.runId,
            path: row.path,
            type: row.type,
            workspaceRoot: row.workspaceRoot ?? null,
            url: row.url ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }));
        },
      };
      return;
    }
    this.provider = new ArtifactPersistenceProxy();
  }

  async createArtifact(options: {
    runId: string;
    path: string;
    type: string;
    url?: string | null;
    workspaceRoot?: string | null;
  }): Promise<AgentArtifact> {
    const now = new Date();
    return this.provider.createArtifact({
      runId: options.runId,
      path: options.path,
      type: options.type,
      url: options.url ?? null,
      workspaceRoot: options.workspaceRoot ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getArtifactsByRunId(runId: string): Promise<AgentArtifact[]> {
    return this.provider.getByRunId(runId);
  }
}
