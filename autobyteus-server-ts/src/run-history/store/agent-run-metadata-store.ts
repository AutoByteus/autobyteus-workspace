import path from "node:path";
import fs from "node:fs/promises";
import type { AgentRunMetadata, TaskAgentRunMetadata } from "./agent-run-metadata-types.js";
import { hasTaskAgentSection, parseTaskAgentRunMetadata } from "./task-agent-own-file-schema.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { atomicWriteJsonFile } from "./atomic-json-file-writer.js";
import { ApplicationExecutionProducerProjector } from "../../application-orchestration/domain/application-execution-producer-projector.js";

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
  value: unknown,
): ApplicationExecutionContext | null => {
  if (value === null || value === undefined) return null;
  return ApplicationExecutionProducerProjector.projectContext(value);
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
  ...(metadata.launchPurpose === "server_helper" ? { launchPurpose: "server_helper" as const } : {}),
});

export type AgentRunMetadataReadState =
  | Readonly<{ kind: "present"; metadata: AgentRunMetadata }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unreadable"; error: Error }>;

export type TaskAgentRunMetadataReadState =
  | Readonly<{ kind: "present"; metadata: TaskAgentRunMetadata }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unreadable"; error: Error }>;

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));

/**
 * The one reader and writer of `run_metadata.json`. A standalone run is a file without a `taskAgent`
 * section (G1): every standalone read treats a task agent's own file as absent, so no listing, admission
 * or restore of standalone runs sees a task agent. Task agents' own files are read and written only through
 * the task-agent reader / writer (contract §3.1, §5.1).
 */
export class AgentRunMetadataStore {
  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryDir: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  getMetadataPath(runId: string): string {
    return path.join(this.layout.getStandaloneRunDirPath(runId), "run_metadata.json");
  }

  async readMetadata(runId: string): Promise<AgentRunMetadata | null> {
    const state = await this.readMetadataState(runId);
    if (state.kind === "present") return state.metadata;
    if (state.kind === "unreadable") {
      logger.warn(`Failed reading run metadata for ${runId}: ${state.error.message}`);
    }
    return null;
  }

  async readMetadataState(runId: string): Promise<AgentRunMetadataReadState> {
    const normalizedRunId = runId.trim();
    const metadataPath = this.getMetadataPath(normalizedRunId);
    try {
      const raw = await fs.readFile(metadataPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Run metadata must be a JSON object.");
      }
      // G1: a task agent's own file is not a standalone run.
      if (hasTaskAgentSection(parsed)) return { kind: "missing" };
      const metadata = normalizeMetadata(
        parsed as AgentRunMetadata,
        this.layout.getStandaloneRunDirPath(normalizedRunId),
      );
      if (
        metadata.runId !== normalizedRunId ||
        !metadata.agentDefinitionId ||
        !metadata.workspaceRootPath ||
        !metadata.memoryDir ||
        !metadata.llmModelIdentifier ||
        !Object.values(RuntimeKind).includes(metadata.runtimeKind)
      ) {
        throw new Error("Run metadata identity or required fields are invalid.");
      }
      return { kind: "present", metadata };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { kind: "missing" };
      return { kind: "unreadable", error: asError(error) };
    }
  }

  /** A task agent's own file; `missing` when there is no file or the file is a standalone run's. */
  async readTaskAgentMetadataState(runId: string): Promise<TaskAgentRunMetadataReadState> {
    const normalizedRunId = runId.trim();
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(this.getMetadataPath(normalizedRunId), "utf-8"));
      if (!hasTaskAgentSection(parsed)) return { kind: "missing" };
      return { kind: "present", metadata: parseTaskAgentRunMetadata(parsed, normalizedRunId) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { kind: "missing" };
      return { kind: "unreadable", error: asError(error) };
    }
  }

  async readTaskAgentMetadata(runId: string): Promise<TaskAgentRunMetadata | null> {
    const state = await this.readTaskAgentMetadataState(runId);
    if (state.kind === "present") return state.metadata;
    if (state.kind === "unreadable") logger.warn(`Failed reading task agent metadata for ${runId}: ${state.error.message}`);
    return null;
  }

  /** Writes a task agent's own file atomically at its own folder `agents/<runId>/` (contract L1). */
  writeTaskAgentMetadata(metadata: TaskAgentRunMetadata): Promise<RunPackageFileWriteResult<"task_agent_run_metadata">> {
    const normalized = parseTaskAgentRunMetadata(metadata, metadata.runId.trim());
    return this.writer.write({ file: "task_agent_run_metadata", filePath: this.getMetadataPath(normalized.runId), payload: normalized });
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
