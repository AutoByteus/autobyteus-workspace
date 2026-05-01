import fs from "node:fs/promises";
import path from "node:path";
import type { AgentRunMetadata } from "./agent-run-metadata-types.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import type { AgentRunStatusRecord } from "./agent-run-history-index-record-types.js";
import { AgentRunMemoryLayout } from "../../agent-memory/store/agent-run-memory-layout.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeLastKnownStatus = (
  value: AgentRunStatusRecord | string | null | undefined,
): AgentRunStatusRecord => {
  if (
    value === "ACTIVE" ||
    value === "IDLE" ||
    value === "ERROR" ||
    value === "TERMINATED"
  ) {
    return value;
  }
  return "IDLE";
};

const normalizeMemoryDir = (
  memoryDir: string | null | undefined,
  fallbackMemoryDir: string,
): string =>
  typeof memoryDir === "string" && memoryDir.trim().length > 0
    ? path.resolve(memoryDir.trim())
    : path.resolve(fallbackMemoryDir);

const normalizeArchivedAt = (value: string | null | undefined): string | null =>
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
  lastKnownStatus: normalizeLastKnownStatus(metadata.lastKnownStatus),
  archivedAt: normalizeArchivedAt(metadata.archivedAt),
  applicationExecutionContext: normalizeApplicationExecutionContext(
    metadata.applicationExecutionContext,
  ),
});

export class AgentRunMetadataStore {
  private baseDir: string;
  private readonly layout: AgentRunMemoryLayout;

  constructor(memoryDir: string) {
    this.layout = new AgentRunMemoryLayout(memoryDir);
    this.baseDir = this.layout.getRunsRootDirPath();
  }

  getMetadataPath(runId: string): string {
    return path.join(this.baseDir, runId, "run_metadata.json");
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
      return normalizeMetadata(parsed as AgentRunMetadata, this.layout.getRunDirPath(runId));
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
    }, this.layout.getRunDirPath(runId));
    const metadataPath = this.getMetadataPath(runId);
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(normalized, null, 2), "utf-8");
  }
}
