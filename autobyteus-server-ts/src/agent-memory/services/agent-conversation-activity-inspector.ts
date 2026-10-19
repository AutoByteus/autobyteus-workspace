import fs from "node:fs";
import path from "node:path";
import { JsonlLogDamagedError, readJsonlRecords } from "autobyteus-ts/memory/store/jsonl-log-file.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";

/** For `indeterminate`, `error.message` is a plain-words reason the user can read (e.g. "line 120 of … is damaged"). */
export type AgentConversationActivity =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "present" }>
  | Readonly<{ kind: "indeterminate"; error: Error }>;

const MISSING_ARCHIVE_FILE_REASON = "its conversation index points to a missing or invalid archive file";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const couldNotRead = (filePath: string, error: unknown): Error => new Error(
  `${path.basename(filePath)} could not be read (${(error as NodeJS.ErrnoException).code ?? "unknown error"})`,
  { cause: error },
);

/** The shared line rule, read-only: a damaged end is ignored; other damage is reported with its line. */
const readConversationRecords = (filePath: string): Record<string, unknown>[] => {
  try {
    return readJsonlRecords(filePath).records;
  } catch (error) {
    if (error instanceof JsonlLogDamagedError) throw error;
    throw couldNotRead(filePath, error);
  }
};

const manifestDamaged = (manifestPath: string, cause?: unknown): Error =>
  new Error(`its conversation index ${path.basename(manifestPath)} is damaged`, { cause });

const readManifestSegments = (manifestPath: string): unknown[] => {
  let text: string;
  try {
    text = fs.readFileSync(manifestPath, "utf8");
  } catch (error) {
    throw couldNotRead(manifestPath, error);
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw manifestDamaged(manifestPath, error);
  }
  if (!isObject(manifest) || !Array.isArray(manifest.segments)) throw manifestDamaged(manifestPath);
  return manifest.segments;
};

const resolveSegmentPath = (store: RunMemoryFileStore, fileName: unknown): string => {
  if (typeof fileName !== "string" || !fileName.trim()) throw new Error(MISSING_ARCHIVE_FILE_REASON);
  let segmentPath: string | null;
  try {
    segmentPath = store.getCompleteRawTraceArchiveSegmentPathByFileName(fileName);
  } catch (error) {
    throw new Error(MISSING_ARCHIVE_FILE_REASON, { cause: error });
  }
  if (!segmentPath) throw new Error(MISSING_ARCHIVE_FILE_REASON);
  return segmentPath;
};

const hasConversationTrace = (records: readonly Record<string, unknown>[]): boolean =>
  records.some((record) => record.trace_type === "user" || record.trace_type === "assistant");

/** Read-only classification across active and complete archived traces; never changes a file. */
export class AgentConversationActivityInspector {
  inspect(input: { agentRunId: string; memoryDir: string }): AgentConversationActivity {
    const agentRunId = input.agentRunId.trim();
    const memoryDir = input.memoryDir.trim();
    if (!agentRunId || !memoryDir) {
      return { kind: "indeterminate", error: new Error("its memory folder is unknown") };
    }
    try {
      const store = new RunMemoryFileStore(memoryDir);
      if (hasConversationTrace(readConversationRecords(store.getRawTracesPath()))) return { kind: "present" };

      const currentManifest = store.getRawTracesArchiveManifestPath();
      const legacyManifest = path.join(memoryDir, "raw_traces_archive_manifest.json");
      const manifestPath = fs.existsSync(currentManifest)
        ? currentManifest
        : fs.existsSync(legacyManifest) ? legacyManifest : null;
      if (!manifestPath) return { kind: "none" };

      for (const segment of readManifestSegments(manifestPath)) {
        if (!isObject(segment) || (segment.status !== "pending" && segment.status !== "complete")) {
          throw manifestDamaged(manifestPath);
        }
        if (segment.status !== "complete") continue;
        const segmentPath = resolveSegmentPath(store, segment.file_name);
        if (hasConversationTrace(readConversationRecords(segmentPath))) return { kind: "present" };
      }
      return { kind: "none" };
    } catch (error) {
      return {
        kind: "indeterminate",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

let cached: AgentConversationActivityInspector | null = null;
export const getAgentConversationActivityInspector = (): AgentConversationActivityInspector =>
  cached ??= new AgentConversationActivityInspector();
