import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import type {
  ChangedMemoryFile,
  MemoryFileEntry,
  MemoryFileOperation,
  MemorySyncBatch,
} from "../shared/memory-sync-types.js";
import { MemoryFileStager, type MemoryHubTarget } from "./memory-file-stager.js";
import { MemoryHubClient } from "./memory-hub-client.js";
import { MemoryHubRequestError } from "./memory-hub-response-parser.js";
import type { PlannedMemoryBatch, PlannedMemoryFile } from "./memory-sync-batch-planner.js";
import { MemoryFileReadError } from "./memory-sync-file-failure-policy.js";

export type MemorySyncBatchContext = MemoryHubTarget & {
  sourceDisplayName: string | null;
  sourceEndpoint: string | null;
};

/** What happened to one file of a batch. `deferred` files are left for a later run without a failure record. */
export type MemorySyncFileOutcome =
  | { status: "synced"; file: ChangedMemoryFile; batchId: string; committedAt: string }
  | { status: "deferred"; file: MemoryFileEntry; reason: string }
  | { status: "failed"; file: MemoryFileEntry; reason: string };

export type MemorySyncBatchSendResult = {
  outcomes: MemorySyncFileOutcome[];
  committedBatches: number;
  duplicateBatches: number;
};

type ReadyFile = { planned: PlannedMemoryFile; operation: MemoryFileOperation };

const createBatchId = (): string => `batch-${new Date().toISOString().replace(/[:.]/g, "")}-${randomBytes(6).toString("hex")}`;

/**
 * The hub refused this batch, piece or file's content (bad request, offset conflict that did not resolve, too large,
 * unprocessable): a problem of the file(s) sent. Any other answer (token, gate, hub disabled or held back, server
 * error) and any network error is a problem of the run and is thrown.
 */
const isFileLevelHubError = (error: unknown): error is MemoryHubRequestError =>
  error instanceof MemoryHubRequestError && [400, 409, 413, 422].includes(error.status);

/**
 * Sends one planned batch: uploads its large files to the hub's staging area, reads its small files just in time,
 * posts the batch, and when the hub refuses a batch of several files sends each file alone to find the one it
 * refuses. Returns an outcome per file; run-level errors are thrown.
 */
export class MemorySyncBatchTransfer {
  private readonly stager: MemoryFileStager;

  constructor(private readonly hubClient: MemoryHubClient = new MemoryHubClient(), stager?: MemoryFileStager) {
    this.stager = stager ?? new MemoryFileStager(hubClient);
  }

  async send(planned: PlannedMemoryBatch, context: MemorySyncBatchContext): Promise<MemorySyncBatchSendResult> {
    const result: MemorySyncBatchSendResult = { outcomes: [], committedBatches: 0, duplicateBatches: 0 };
    const ready: ReadyFile[] = [];
    for (const plannedFile of planned.files) {
      const prepared = await this.prepare(plannedFile, context);
      if ("status" in prepared) {
        result.outcomes.push(prepared);
      } else {
        ready.push(prepared);
      }
    }
    if (ready.length === 0) {
      return result;
    }
    try {
      await this.post(ready, context, result);
    } catch (error) {
      if (!isFileLevelHubError(error)) {
        throw error;
      }
      if (ready.length === 1) {
        result.outcomes.push({ status: "failed", file: (ready[0] as ReadyFile).planned.file, reason: error.message });
        return result;
      }
      for (const item of ready) {
        await this.sendAlone(item, context, result);
      }
    }
    return result;
  }

  private async sendAlone(item: ReadyFile, context: MemorySyncBatchContext, result: MemorySyncBatchSendResult): Promise<void> {
    // The hub may no longer hold a staged file (a content that failed verification is removed), so stage it again.
    const prepared = item.planned.lane === "staged" ? await this.prepare(item.planned, context) : item;
    if ("status" in prepared) {
      result.outcomes.push(prepared);
      return;
    }
    try {
      await this.post([prepared], context, result);
    } catch (error) {
      if (!isFileLevelHubError(error)) {
        throw error;
      }
      result.outcomes.push({ status: "failed", file: item.planned.file, reason: error.message });
    }
  }

  private async post(ready: ReadyFile[], context: MemorySyncBatchContext, result: MemorySyncBatchSendResult): Promise<void> {
    const batch: MemorySyncBatch = {
      protocolVersion: 1,
      batchId: createBatchId(),
      memorySyncSourceId: context.memorySyncSourceId,
      sourceDisplayName: context.sourceDisplayName,
      sourceEndpoint: context.sourceEndpoint,
      generatedAt: new Date().toISOString(),
      operations: ready.map((item) => item.operation),
    };
    const response = await this.hubClient.pushBatch({ hubBaseUrl: context.hubBaseUrl, token: context.token, batch });
    result.committedBatches += response.duplicate ? 0 : 1;
    result.duplicateBatches += response.duplicate ? 1 : 0;
    for (const item of ready) {
      result.outcomes.push({ status: "synced", file: item.planned.file, batchId: response.batchId, committedAt: response.committedAt });
    }
  }

  /** The file ready to send, or its outcome when it cannot be sent now. */
  private async prepare(planned: PlannedMemoryFile, context: MemorySyncBatchContext): Promise<ReadyFile | MemorySyncFileOutcome> {
    const { file, lane } = planned;
    const base = {
      opId: `${file.kind}:${file.relativePath}`,
      operation: "replace" as const,
      kind: file.kind,
      relativePath: file.relativePath,
      size: file.size,
      sha256: file.sha256,
      mtimeMs: file.mtimeMs,
    };
    try {
      if (lane === "staged") {
        const staged = await this.stager.stage(file, context);
        return staged.status === "staged"
          ? { planned, operation: { ...base, contentEncoding: "staged" } }
          : { status: "deferred", file, reason: staged.reason };
      }
      const content = await this.readStableContent(file);
      return content
        ? { planned, operation: { ...base, contentEncoding: "base64", contentBase64: content.toString("base64") } }
        : { status: "deferred", file, reason: "file changed while being read" };
    } catch (error) {
      if (error instanceof MemoryFileReadError) {
        return error.code === "ENOENT"
          ? { status: "deferred", file, reason: "file disappeared while being read" }
          : { status: "failed", file, reason: error.message };
      }
      if (isFileLevelHubError(error)) {
        return { status: "failed", file, reason: error.message };
      }
      throw error;
    }
  }

  /** The content of a file up to the inline threshold, or `null` when it is not the file that was hashed. */
  private async readStableContent(file: ChangedMemoryFile): Promise<Buffer | null> {
    try {
      const before = await fs.stat(file.absolutePath);
      const content = await fs.readFile(file.absolutePath);
      const after = await fs.stat(file.absolutePath);
      const stable = before.size === file.size && before.mtimeMs === file.mtimeMs
        && after.size === file.size && after.mtimeMs === file.mtimeMs
        && content.byteLength === file.size;
      return stable && createHash("sha256").update(content).digest("hex") === file.sha256 ? content : null;
    } catch (error) {
      throw new MemoryFileReadError(file.absolutePath, error);
    }
  }
}
