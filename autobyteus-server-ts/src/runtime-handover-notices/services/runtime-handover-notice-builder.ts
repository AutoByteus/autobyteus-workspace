import type { WorkJournalFileSummary } from "../../agent-work-journal/domain/work-journal-models.js";

/** The facts the notice is built from: where the journals are and what each file holds. */
export type RuntimeHandoverFacts = Readonly<{
  /** The run's `work_journal/` folder. */
  journalFolder: string;
  /** The journal files, oldest first; the last is the latest (the open one). */
  files: readonly WorkJournalFileSummary[];
}>;

const period = (file: WorkJournalFileSummary): string => {
  const first = file.days[0]?.day;
  const last = file.days[file.days.length - 1]?.day;
  if (!first || !last) return "no dated entries";
  return first === last ? first : `${first} to ${last}`;
};

const size = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const describe = (file: WorkJournalFileSummary): string =>
  `  ${file.journalFile} | ${period(file)} | ${size(file.sizeBytes)}, ${file.lineCount} lines`;

/**
 * The text the new agent receives with its first input (contract §3.6): one person handing over to another. Facts and pointers
 * only: that earlier work exists, where the journals are, where to start and what an entry looks like. It names no agent runtime
 * or model, does not repeat the user's request and does not say how to proceed. Pure.
 */
export const buildRuntimeHandoverNoticeText = (facts: RuntimeHandoverFacts): string => {
  const latest = facts.files[facts.files.length - 1];
  const earlier = facts.files.length > 1;
  const where = latest
    ? `The journals are in ${facts.journalFolder}/. The latest one, ${latest.journalFile}, shows what was done most recently, so it is a good place to start.`
    : `The journals are in ${facts.journalFolder}/.`;
  return [
    "[System: runtime hand-over]",
    "Another agent worked on this run before you and kept a work journal as it went. You are taking over.",
    "",
    earlier
      ? `${where} The earlier ones are there too, oldest first, if you want to look further back:`
      : `${where}`,
    ...facts.files.map(describe),
    "",
    "Each entry is one line, such as \"[HH:MM:SS] User: …\", \"Agent: …\" or \"Command: … → ok\", and ends with a",
    "link to the full record. Long output is shortened.",
  ].join("\n");
};
