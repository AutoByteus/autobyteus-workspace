import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/**
 * Identifies the rendering rules. A closed journal file is reused only when it was written by
 * this revision (a cache key for derived output, not a schema version of the manifest).
 */
export const WORK_JOURNAL_RENDERER_REVISION = 2;

/**
 * One run's journal: the run, its own memory folder, and its runtime as recorded. `null` means no
 * runtime is recorded (an old run without metadata): every tool then uses the generic rule.
 */
export type WorkJournalTarget = Readonly<{
  runId: string;
  memoryDir: string;
  runtimeKind: RuntimeKind | null;
}>;

export type WorkJournalFileState = "closed" | "open";

export type WorkJournalPackageFile = Readonly<{
  path: string;
  sourceFile: string;
  state: WorkJournalFileState;
}>;

/** What a consumer receives: the journal files in order and a hash over their contents. */
export type WorkJournalPackage = Readonly<{
  rootPath: string;
  manifestPath: string;
  files: readonly WorkJournalPackageFile[];
  evidenceHash: string;
}>;

/** Sent after `ensureCurrent` wrote or removed a journal file of a run. */
export type WorkJournalChange = Readonly<{
  runId: string;
  memoryDir: string;
  package: WorkJournalPackage;
}>;

export type WorkJournalChangeListener = (change: WorkJournalChange) => void;

/** A journal file as the manifest records it: what a consumer needs to tell whether it changed. */
export type WorkJournalFileVersion = Readonly<{
  journalFile: string;
  state: WorkJournalFileState;
  contentSha256: string;
}>;

/** A day a journal file covers, with the first line of that day. */
export type WorkJournalDay = Readonly<{ day: string; line: number }>;

/** A journal file for a reader: its size, lines and days. */
export type WorkJournalFileSummary = Readonly<{
  journalFile: string;
  state: WorkJournalFileState;
  sizeBytes: number;
  lineCount: number;
  days: readonly WorkJournalDay[];
}>;

/** Lines `start`…`end` (1-based, inclusive) of one journal file. */
export type WorkJournalLines = Readonly<{
  journalFile: string;
  start: number;
  end: number;
  lineCount: number;
  lines: readonly string[];
}>;

export type WorkJournalManifestFile = Readonly<{
  journal_file: string;
  source_file: string;
  /** For a closed file, the raw manifest's record count of its segment. */
  source_record_count: number;
  state: WorkJournalFileState;
  /** sha256 of the journal file's content, so the evidence hash never re-reads closed files. */
  content_sha256: string;
  /** The agent runtime whose rules rendered this file (a run can have files of several); `null`: rendered with the no-runtime rules. */
  runtime_kind: string | null;
}>;

export type WorkJournalManifest = Readonly<{
  run_id: string;
  renderer_revision: number;
  files: readonly WorkJournalManifestFile[];
}>;
