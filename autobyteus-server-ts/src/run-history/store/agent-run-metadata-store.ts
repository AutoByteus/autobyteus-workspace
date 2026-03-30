import fs from "node:fs/promises";
import path from "node:path";
import type { AgentRunMetadata } from "./agent-run-metadata-types.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import type { AgentRunStatusRecord } from "./agent-run-history-index-record-types.js";

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

const normalizeMetadata = (
  metadata: AgentRunMetadata,
): AgentRunMetadata => ({
  runId: metadata.runId.trim(),
  agentDefinitionId: metadata.agentDefinitionId.trim(),
  workspaceRootPath: canonicalizeWorkspaceRootPath(metadata.workspaceRootPath),
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
});

export class AgentRunMetadataStore {
  private baseDir: string;

  constructor(memoryDir: string) {
    this.baseDir = path.join(memoryDir, "agents");
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
      return normalizeMetadata(parsed as AgentRunMetadata);
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
    });
    const metadataPath = this.getMetadataPath(runId);
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(normalized, null, 2), "utf-8");
  }
}
