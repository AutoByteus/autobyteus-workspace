import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import type { SelfEvolutionTargetRef } from "./models.js";

export type SelfEvolutionWorkTraceSourceKind = "archive_segment" | "active";

export type SelfEvolutionWorkTraceSource = {
  kind: SelfEvolutionWorkTraceSourceKind;
  sourceId: string;
  displayName: string;
  sourcePath: string;
  index: number | null;
  fingerprint: string;
  recordCount: number;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  records: MemoryTraceEvent[];
};

export type SelfEvolutionWorkTraceFile = {
  sourceId: string;
  sourceKind: SelfEvolutionWorkTraceSourceKind;
  sourceFingerprint: string;
  fileName: string;
  filePath: string;
  recordCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  generatedAt: string;
};

export type SelfEvolutionWorkTraceManifest = {
  schemaVersion: 1;
  target: SelfEvolutionTargetRef;
  generatedAt: string;
  workTraceRootPath: string;
  manifestPath: string;
  files: SelfEvolutionWorkTraceFile[];
};

export type SelfEvolutionWorkTracePackage = {
  target: SelfEvolutionTargetRef;
  workTraceRootPath: string;
  manifestPath: string;
  manifest: SelfEvolutionWorkTraceManifest;
  summaryHash: string;
};
