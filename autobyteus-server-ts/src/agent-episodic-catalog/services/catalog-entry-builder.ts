import path from "node:path";
import type { DiscoveredRun } from "../../agent-memory/domain/discovered-run.js";
import type { WorkJournalFileSpan } from "../../agent-work-journal/domain/work-journal-models.js";
import type { CatalogEntry } from "../domain/episodic-catalog-models.js";

/** An ISO time from a run's records as a catalog time: `YYYY-MM-DD HH:MM` (UTC); null when it is not a time. */
const catalogTime = (iso: string | null): string | null => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 16).replace("T", " ");
};

/** A Task title on one line: line breaks become one space, the ends trimmed; null when nothing is left. */
const oneLineTitle = (title: string | null): string | null => {
  const line = title?.replace(/\s*[\r\n]+\s*/g, " ").trim();
  return line ? line : null;
};

/**
 * Builds a catalog entry (contract §2.2) from exactly three sources: the run as discovery attributes it, its journal
 * files' spans (headers only) and the title of its current Project Task. That is the privacy rule (REQ-004): no message,
 * tool, journal line, Task description or run-history summary can reach an entry, because none is an input here.
 */
export const buildCatalogEntry = (input: Readonly<{
  run: DiscoveredRun;
  /** The run's journal files; null (or none) when the run has no journal yet. */
  spans: readonly WorkJournalFileSpan[] | null;
  taskTitle: string | null;
}>): CatalogEntry => {
  const { run, spans } = input;
  const files = spans ?? [];
  return {
    runId: run.runId,
    memoryDir: run.memoryDir,
    root: run.root,
    agentName: run.agentName,
    startedAt: files.find((span) => span.from)?.from ?? catalogTime(run.recordedStartAt),
    lastActivityAt: [...files].reverse().find((span) => span.to)?.to ?? null,
    taskTitle: oneLineTitle(input.taskTitle),
    workspace: run.workspace,
    journal: files.length
      ? { folder: path.dirname(files[0]!.path), files: files.map((span) => ({ name: span.journalFile, from: span.from, to: span.to, sizeBytes: span.sizeBytes })) }
      : null,
  };
};
