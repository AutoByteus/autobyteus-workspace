import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";

export type AgentWorkTraceTargetRef =
  | { kind: "agent_run"; runId: string }
  | { kind: "team_member_run"; teamRunId: string; memberRunId: string };

export type AgentWorkTraceProjectionContext = {
  target: AgentWorkTraceTargetRef;
  memoryDir: string;
};

export type AgentWorkTraceSourceKind = "archive_segment" | "active";

export type AgentWorkTraceSource = {
  kind: AgentWorkTraceSourceKind;
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

export type AgentWorkTraceFile = {
  sourceId: string;
  sourceKind: AgentWorkTraceSourceKind;
  sourceFingerprint: string;
  fileName: string;
  filePath: string;
  recordCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  generatedAt: string;
};

export type AgentWorkTraceManifest = {
  schemaVersion: 1;
  target: AgentWorkTraceTargetRef;
  generatedAt: string;
  workTraceRootPath: string;
  manifestPath: string;
  files: AgentWorkTraceFile[];
};

export type AgentWorkTracePackage = {
  target: AgentWorkTraceTargetRef;
  workTraceRootPath: string;
  manifestPath: string;
  manifest: AgentWorkTraceManifest;
  summaryHash: string;
};
