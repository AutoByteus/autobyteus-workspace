/**
 * Text derived from a Task's description for cards and one-line labels. Never stored. Search and
 * the Task page use the full description; these only bound what a card or a label shows.
 */

/** At most this many characters of a card's summary or of its preview are rendered (CSS shows 2 lines of each). */
export const TASK_CARD_TEXT_MAX_CHARS = 300
/** At most this many characters of the summary in a one-line label (the card's accessible name, the delete confirmation). */
export const TASK_SUMMARY_LABEL_MAX_CHARS = 120

const trimmedLines = (description: string): string[] => description.split(/\r?\n/).map((line) => line.trim())

/** A Task's summary: the first non-empty line of its description, trimmed. */
export const taskSummary = (description: string): string => trimmedLines(description).find((line) => line.length > 0) ?? ''

/** The quieter context under the summary: the remaining non-empty lines, joined by spaces. */
export const taskPreview = (description: string): string => {
  const lines = trimmedLines(description)
  const first = lines.findIndex((line) => line.length > 0)
  return first < 0 ? '' : lines.slice(first + 1).filter((line) => line.length > 0).join(' ')
}

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

/** The card's summary line, bounded before rendering. */
export const taskCardSummary = (description: string): string => boundTaskText(taskSummary(description), TASK_CARD_TEXT_MAX_CHARS)
/** The card's preview, bounded before rendering. */
export const taskCardPreview = (description: string): string => boundTaskText(taskPreview(description), TASK_CARD_TEXT_MAX_CHARS)
/** The summary for one-line labels, shortened at a word boundary with "…" when long. */
export const taskSummaryLabel = (description: string): string => boundTaskText(taskSummary(description), TASK_SUMMARY_LABEL_MAX_CHARS)
