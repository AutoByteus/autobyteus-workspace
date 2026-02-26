import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RunManifest } from "../domain/models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const isSkillAccessMode = (value: unknown): value is SkillAccessMode | null => {
  return (
    value === null ||
    value === SkillAccessMode.PRELOADED_ONLY ||
    value === SkillAccessMode.GLOBAL_DISCOVERY ||
    value === SkillAccessMode.NONE
  );
};

const normalizeManifest = (manifest: RunManifest): RunManifest => ({
  agentDefinitionId: manifest.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(manifest.workspaceRootPath),
  llmModelIdentifier: manifest.llmModelIdentifier.trim(),
  llmConfig: manifest.llmConfig ?? null,
  autoExecuteTools: Boolean(manifest.autoExecuteTools),
  skillAccessMode: manifest.skillAccessMode ?? null,
});

const validateManifest = (value: unknown): RunManifest | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.agentDefinitionId !== "string" ||
    typeof payload.workspaceRootPath !== "string" ||
    typeof payload.llmModelIdentifier !== "string" ||
    typeof payload.autoExecuteTools !== "boolean" ||
    !isSkillAccessMode(payload.skillAccessMode ?? null)
  ) {
    return null;
  }
  const llmConfig =
    payload.llmConfig && typeof payload.llmConfig === "object" && !Array.isArray(payload.llmConfig)
      ? (payload.llmConfig as Record<string, unknown>)
      : null;
  return {
    agentDefinitionId: payload.agentDefinitionId,
    workspaceRootPath: payload.workspaceRootPath,
    llmModelIdentifier: payload.llmModelIdentifier,
    llmConfig,
    autoExecuteTools: payload.autoExecuteTools,
    skillAccessMode: (payload.skillAccessMode as SkillAccessMode | null) ?? null,
  };
};

export class RunManifestStore {
  private baseDir: string;

  constructor(memoryDir: string) {
    this.baseDir = path.join(memoryDir, "agents");
  }

  getManifestPath(runId: string): string {
    return path.join(this.baseDir, runId, "run_manifest.json");
  }

  async readManifest(runId: string): Promise<RunManifest | null> {
    try {
      const manifestPath = this.getManifestPath(runId);
      const raw = await fs.readFile(manifestPath, "utf-8");
      const parsed = JSON.parse(raw);
      const manifest = validateManifest(parsed);
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
