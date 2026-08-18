import fs from "node:fs";
import path from "node:path";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";

export type AgentConversationActivity =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "present" }>
  | Readonly<{ kind: "indeterminate"; error: Error }>;

const readJsonlStrict = (filePath: string): Record<string, unknown>[] => {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parsed: unknown = JSON.parse(line);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Trace record in '${filePath}' must be an object.`);
      }
      return parsed as Record<string, unknown>;
    });
};

const hasConversationTrace = (records: readonly Record<string, unknown>[]): boolean =>
  records.some((record) => record.trace_type === "user" || record.trace_type === "assistant");

/** Strict, read-only classification across active and complete archived traces. */
export class AgentConversationActivityInspector {
  inspect(input: { agentRunId: string; memoryDir: string }): AgentConversationActivity {
    const agentRunId = input.agentRunId.trim();
    const memoryDir = input.memoryDir.trim();
    if (!agentRunId || !memoryDir) {
      return { kind: "indeterminate", error: new Error("AgentRun identity and memoryDir are required.") };
    }
    try {
      const store = new RunMemoryFileStore(memoryDir);
      if (hasConversationTrace(readJsonlStrict(store.getRawTracesPath()))) return { kind: "present" };

      const currentManifest = store.getRawTracesArchiveManifestPath();
      const legacyManifest = path.join(memoryDir, "raw_traces_archive_manifest.json");
      const manifestPath = fs.existsSync(currentManifest)
        ? currentManifest
        : fs.existsSync(legacyManifest) ? legacyManifest : null;
      if (!manifestPath) return { kind: "none" };

      const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
        throw new Error("Raw-trace archive manifest must be an object.");
      }
      const segments = (manifest as { segments?: unknown }).segments;
      if (!Array.isArray(segments)) throw new Error("Raw-trace archive manifest segments are invalid.");
      for (const segment of segments) {
        if (!segment || typeof segment !== "object" || Array.isArray(segment)) {
          throw new Error("Raw-trace archive segment metadata is invalid.");
        }
        const entry = segment as { status?: unknown; file_name?: unknown };
        if (entry.status !== "pending" && entry.status !== "complete") {
          throw new Error("Raw-trace archive segment status is invalid.");
        }
        if (entry.status !== "complete") continue;
        if (typeof entry.file_name !== "string" || !entry.file_name.trim()) {
          throw new Error("Complete raw-trace archive segment has no file name.");
        }
        const segmentPath = store.getCompleteRawTraceArchiveSegmentPathByFileName(entry.file_name);
        if (!segmentPath) throw new Error("Complete raw-trace archive segment could not be resolved safely.");
        if (hasConversationTrace(readJsonlStrict(segmentPath))) return { kind: "present" };
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
