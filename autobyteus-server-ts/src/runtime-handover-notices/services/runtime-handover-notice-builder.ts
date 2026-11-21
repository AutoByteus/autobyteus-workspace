import type { WorkJournalFileSummary } from "../../agent-work-journal/domain/work-journal-models.js";

/** The facts the notice is built from: where the journals are and what each file holds. */
export type RuntimeHandoverFacts = Readonly<{
  /** The run's `work_journal/` folder. */
  journalFolder: string;
  /** The journal files, oldest first; the open one (if any) is last and starts with this hand-over. */
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
 * The text the new agent receives with its first input (contract §3.6): one person handing over to another. It says that earlier
 * work exists and where the journals are. The previous agent's most recent work is in the newest closed journal file with work
 * entries, never in the open file, which a switch starts with this hand-over: the notice names that file and asks the agent to
 * read it completely before replying or continuing (autobyteus-583, replacing §3.6's "facts and pointers only" on the founder's
 * direction). Every file stays listed, oldest first. Without such a file there is no read instruction. It names no agent runtime
 * or model and does not repeat the user's request. Pure.
 */
export const buildRuntimeHandoverNoticeText = (facts: RuntimeHandoverFacts): string => {
  const dir = facts.journalFolder;
  const previousWork = [...facts.files].reverse().find((file) => file.state === "closed" && file.workEntryCount > 0);
  const open = facts.files.find((file) => file.state === "open");
  const where = previousWork
    ? [
      `The journals are in ${dir}/. The previous agent's most recent work is in ${previousWork.journalFile}.`,
      `Before you reply or continue the work, read ${dir}/${previousWork.journalFile} completely, from its first line to its last.`,
      "If it is long, read it in parts until you reach the end.",
      ...(open ? [`${open.journalFile} starts with this hand-over; your own work is recorded there from now on.`] : []),
      "",
      "All journal files, oldest first (the earlier ones are there if you need to look further back):",
    ]
    : [`The journals are in ${dir}/:`];
  return [
    "[System: runtime hand-over]",
    "Another agent worked on this run before you and kept a work journal as it went. You are taking over.",
    "",
    ...where,
    ...facts.files.map(describe),
    "",
    "Each entry is one line, such as \"[HH:MM:SS] User: …\", \"Agent: …\" or \"Command: … → ok\", and ends with a",
    "link to the full record. Long output is shortened.",
  ].join("\n");
};
