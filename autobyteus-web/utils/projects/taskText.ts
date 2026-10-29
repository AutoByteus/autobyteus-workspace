/**
 * Display text of a Task for cards and one-line labels. A Project Task's one-line name is its stored title; a Task
 * with no Project ("Temp task") has none, so its line is its description's first line. These only bound what a card
 * or a label shows (display only, never stored); the Task page shows the title and the full description.
 */
import type { TaskWorkerTask } from '~/types/project'

/** At most this many characters of a card's title or of its preview are rendered (CSS shows 2 lines of each). */
export const TASK_CARD_TEXT_MAX_CHARS = 300
/** At most this many characters in a one-line label (the card's accessible name, rows, pickers, the delete confirmation). */
export const TASK_LABEL_MAX_CHARS = 120

const nonEmptyLines = (description: string): string[] =>
  description.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)

/** A description's first non-empty line, trimmed: a Temp task's one-line text. */
export const descriptionFirstLine = (description: string): string => nonEmptyLines(description)[0] ?? ''

/**
 * `text` when it fits in `max` characters. Otherwise it is cut at the last word boundary (or at
 * `max` when a single word is longer) and ended with "…", the whole at most `max` characters.
 */
export const boundTaskText = (text: string, max: number): string => {
  if (text.length <= max) return text
  let cut = text.slice(0, max - 1)
  // Never end on half of a surrogate pair.
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1)
  const midWord = !/\s/.test(text.charAt(cut.length))
  const lastSpace = cut.search(/\s\S*$/)
  if (midWord && lastSpace > 0) cut = cut.slice(0, lastSpace)
  return `${cut.trimEnd()}…`
}

/**
 * Whether a description line repeats the title: the same text, or (for a title taken from a long first line and cut
 * with "…") the line starts with the title's text before its "…". Tasks saved before titles got theirs that way.
 */
const repeatsTitle = (line: string, title: string): boolean =>
  line === title || (title.endsWith('…') && title.length > 1 && line.startsWith(title.slice(0, -1)))

/** The card's main line: the title, bounded before rendering. */
export const taskCardTitle = (title: string): string => boundTaskText(title, TASK_CARD_TEXT_MAX_CHARS)

/**
 * The card's quieter preview: the description's start (its non-empty lines joined by spaces), bounded before rendering.
 * A first line that repeats the title is skipped, so the card does not show it twice.
 */
export const taskCardPreview = (task: { title: string; description: string }): string => {
  const lines = nonEmptyLines(task.description)
  const start = lines.length && repeatsTitle(lines[0]!, task.title.trim()) ? lines.slice(1) : lines
  return boundTaskText(start.join(' '), TASK_CARD_TEXT_MAX_CHARS)
}

/** A Project Task's title for one-line labels, shortened at a word boundary with "…" when long. */
export const taskTitleLabel = (title: string): string => boundTaskText(title, TASK_LABEL_MAX_CHARS)

/** A Temp task's one-line label: its description's first line, shortened like a title label. */
export const descriptionFirstLineLabel = (description: string): string => boundTaskText(descriptionFirstLine(description), TASK_LABEL_MAX_CHARS)

/** A Task worker's Task label, chosen by the Task's kind: a Project Task's title, or a Temp task's first line. */
export const taskWorkerTaskLabel = (task: TaskWorkerTask): string =>
  task.projectId === null ? descriptionFirstLineLabel(task.description) : taskTitleLabel(task.title)
