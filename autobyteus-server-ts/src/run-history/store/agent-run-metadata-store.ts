import path from "node:path";
import fs from "node:fs/promises";
import type { AgentRunMetadata } from "./agent-run-metadata-types.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeMemoryDir = (
  memoryDir: string | null | undefined,
  fallbackMemoryDir: string,
): string =>
  typeof memoryDir === "string" && memoryDir.trim().length > 0
    ? path.resolve(memoryDir.trim())
    : path.resolve(fallbackMemoryDir);

const normalizeTimestamp = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeApplicationExecutionContext = (
  value: ApplicationExecutionContext | null | undefined,
): ApplicationExecutionContext | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return { ...value };
};

const normalizeMetadata = (
  metadata: AgentRunMetadata,
  fallbackMemoryDir: string,
): AgentRunMetadata => ({
  runId: metadata.runId.trim(),
  agentDefinitionId: metadata.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(metadata.workspaceRootPath),
  memoryDir: normalizeMemoryDir(metadata.memoryDir, fallbackMemoryDir),
  llmModelIdentifier: metadata.llmModelIdentifier.trim(),
  llmConfig: metadata.llmConfig ?? null,
  autoExecuteTools: Boolean(metadata.autoExecuteTools),
  skillAccessMode: metadata.skillAccessMode ?? null,
  runtimeKind: metadata.runtimeKind,
  platformAgentRunId:
    typeof metadata.platformAgentRunId === "string" && metadata.platformAgentRunId.trim().length > 0
      ? metadata.platformAgentRunId.trim()
      : null,
  preparedAt: normalizeTimestamp(metadata.preparedAt),
  preparedExpiresAt: normalizeTimestamp(metadata.preparedExpiresAt),
  startedAt: normalizeTimestamp(metadata.startedAt),
  applicationExecutionContext: normalizeApplicationExecutionContext(
    metadata.applicationExecutionContext,
  ),
});

export class AgentRunMetadataStore {
  private readonly layout: AgentMemoryLayout;

  constructor(memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  getMetadataPath(runId: string): string {
    return path.join(this.layout.getStandaloneRunDirPath(runId), "run_metadata.json");
  }

  async readMetadata(runId: string): Promise<AgentRunMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(runId);
      const raw = await fs.readFile(metadataPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        logger.warn(`Invalid run metadata format: ${metadataPath}`);
        return null;
      }
      return normalizeMetadata(parsed as AgentRunMetadata, this.layout.getStandaloneRunDirPath(runId));
    } catch (error) {
      const message = String(error);
      if (!message.includes("ENOENT")) {
        logger.warn(`Failed reading run metadata for ${runId}: ${message}`);
      }
      return null;
    }
  }

  async writeMetadata(runId: string, metadata: AgentRunMetadata): Promise<void> {
    const normalized = normalizeMetadata({
      ...metadata,
      runId,
    }, this.layout.getStandaloneRunDirPath(runId));
    const metadataPath = this.getMetadataPath(runId);
    await atomicWriteJsonFile(metadataPath, normalized);
  }
}
