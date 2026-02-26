import fs from "node:fs/promises";
import path from "node:path";
import { RunManifest } from "../domain/models.js";
import {
  RuntimeManifestMigrationService,
  getRuntimeManifestMigrationService,
} from "../services/runtime-manifest-migration-service.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeManifest = (manifest: RunManifest): RunManifest => ({
  agentDefinitionId: manifest.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(manifest.workspaceRootPath),
  llmModelIdentifier: manifest.llmModelIdentifier.trim(),
  llmConfig: manifest.llmConfig ?? null,
  autoExecuteTools: Boolean(manifest.autoExecuteTools),
  skillAccessMode: manifest.skillAccessMode ?? null,
  runtimeKind: manifest.runtimeKind,
  runtimeReference: {
    runtimeKind: manifest.runtimeReference.runtimeKind,
    sessionId: manifest.runtimeReference.sessionId ?? null,
    threadId: manifest.runtimeReference.threadId ?? null,
    metadata: manifest.runtimeReference.metadata ?? null,
  },
});

export class RunManifestStore {
  private baseDir: string;
  private migrationService: RuntimeManifestMigrationService;

  constructor(
    memoryDir: string,
    migrationService: RuntimeManifestMigrationService = getRuntimeManifestMigrationService(),
  ) {
    this.baseDir = path.join(memoryDir, "agents");
    this.migrationService = migrationService;
  }

  getManifestPath(runId: string): string {
    return path.join(this.baseDir, runId, "run_manifest.json");
  }

  async readManifest(runId: string): Promise<RunManifest | null> {
    try {
      const manifestPath = this.getManifestPath(runId);
      const raw = await fs.readFile(manifestPath, "utf-8");
      const parsed = JSON.parse(raw);
      const manifest = this.migrationService.migrateAndValidate(runId, parsed);
      if (!manifest) {
        logger.warn(`Invalid run manifest format: ${manifestPath}`);
        return null;
      }
      return normalizeManifest(manifest);
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(`Failed reading run manifest for ${runId}: ${message}`);
      }
      return null;
    }
  }

  async writeManifest(runId: string, manifest: RunManifest): Promise<void> {
    const normalized = normalizeManifest(manifest);
    const manifestPath = this.getManifestPath(runId);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(normalized, null, 2), "utf-8");
  }
}
