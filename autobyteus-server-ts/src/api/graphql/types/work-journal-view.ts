import { Field, InputType, Int, ObjectType } from "type-graphql";
import { getWorkJournalService } from "../../../agent-work-journal/services/work-journal-service.js";

/** Lines the page reads at a time (a window of the Work Journal view). */
export const WORK_JOURNAL_WINDOW_LINES = 300;

@ObjectType()
export class WorkJournalDay {
  @Field(() => String)
  day!: string;

  @Field(() => Int)
  line!: number;
}

@ObjectType()
export class WorkJournalFile {
  @Field(() => String)
  journalFile!: string;

  /** `OPEN` is the run's active file (it grows with the run); `CLOSED` files never change. */
  @Field(() => String)
  state!: "OPEN" | "CLOSED";

  @Field(() => Int)
  sizeBytes!: number;

  @Field(() => Int)
  lineCount!: number;

  @Field(() => [WorkJournalDay])
  days!: WorkJournalDay[];
}

/** A run's Work Journal: its files, and a window of lines of the selected file. */
@ObjectType()
export class WorkJournalView {
  @Field(() => [WorkJournalFile])
  files!: WorkJournalFile[];

  @Field(() => String, { nullable: true })
  selectedFile!: string | null;

  @Field(() => Int)
  start!: number;

  @Field(() => Int)
  end!: number;

  @Field(() => Int)
  lineCount!: number;

  @Field(() => [String])
  lines!: string[];
}

/** Which file and lines to read; without a file, the run's latest file; without lines, its first window. */
@InputType()
export class WorkJournalWindowInput {
  @Field(() => String, { nullable: true })
  journalFile?: string | null;

  @Field(() => Int, { nullable: true })
  start?: number | null;

  @Field(() => Int, { nullable: true })
  end?: number | null;
}

/**
 * Reads a run's Work Journal through the journal service (read-only: it never renders a journal). `null`
 * when the run has no journal yet, or its memory folder is not known.
 */
export const readWorkJournalView = async (memoryDir: string | null, window: WorkJournalWindowInput | null | undefined): Promise<WorkJournalView | null> => {
  if (!memoryDir) return null;
  const journals = getWorkJournalService();
  const files = await journals.listJournalFiles(memoryDir);
  if (!files) return null;
  const selected = window?.journalFile ?? files.at(-1)?.journalFile ?? null;
  const start = Math.max(1, window?.start ?? 1);
  const end = Math.max(start, window?.end ?? start + WORK_JOURNAL_WINDOW_LINES - 1);
  const read = selected ? await journals.readJournalLines(memoryDir, selected, { start, end }) : null;
  return {
    files: files.map((file) => ({
      journalFile: file.journalFile, state: file.state === "open" ? "OPEN" : "CLOSED", sizeBytes: file.sizeBytes,
      lineCount: file.lineCount, days: file.days.map((day) => ({ day: day.day, line: day.line })),
    })),
    selectedFile: read ? selected : null,
    start: read?.start ?? start,
    end: read?.end ?? start - 1,
    lineCount: read?.lineCount ?? 0,
    lines: read ? [...read.lines] : [],
  };
};
