import type { JournalEntry } from "../../agent-work-journal/reading/journal-entry-reader.js";
import type { JournalCard, JournalCardPart } from "../domain/memory-search-models.js";

/** Card limits measured in the evaluation report (§ 6.1). */
const MAX_REQUESTS = 6;
const MAX_REPLIES = 8;
const MAX_ACTIONS = 25;
const REQUEST_CHARACTERS = 400;
const REPLY_CHARACTERS = 220;
const ACTION_CHARACTERS = 90;
export const JOURNAL_CARD_MAX_CHARACTERS = 2_400;

const TIME_PREFIX = /^\[(?:\d\d:\d\d:\d\d|--:--:--)\] /;
const RAW_LINK = / ?\[↗\]\([^)]*\)/g;
const squash = (text: string): string => text.replace(/\s+/g, " ").trim();

/** An entry's words: its head without the label and time, then its details. */
const entryWords = (entry: JournalEntry): string => squash(entry.text.replace(TIME_PREFIX, "").replace(RAW_LINK, ""));
const messageBody = (entry: JournalEntry): string => entryWords(entry).replace(/^(?:User|Agent|Message from [^:]*):\s*/, "");

type CardLine = { text: string; parts: Array<{ entry: JournalEntry; kind: JournalCardPart["kind"]; offset: number; length: number }> };

const messageLine = (prefix: string, entry: JournalEntry, kind: JournalCardPart["kind"], max: number): CardLine => {
  const body = messageBody(entry).slice(0, max);
  return { text: `${prefix}${body}`, parts: [{ entry, kind, offset: prefix.length, length: body.length }] };
};

/** `Did: a; b; c`: the file's distinct actions in order, each located in the line. */
const actionLine = (entries: readonly JournalEntry[]): CardLine | null => {
  const line: CardLine = { text: "Did: ", parts: [] };
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "action" || seen.size >= MAX_ACTIONS) continue;
    const action = squash(entry.head.replace(RAW_LINK, "")).slice(0, ACTION_CHARACTERS);
    if (!action || seen.has(action)) continue;
    if (seen.size) line.text += "; ";
    seen.add(action);
    line.parts.push({ entry, kind: "action", offset: line.text.length, length: action.length });
    line.text += action;
  }
  return line.parts.length ? line : null;
};

/**
 * The card for one journal file (report § 6.1): the agent as recorded, its first requests, its first reply
 * openings and its distinct actions, in that order so token truncation drops the least important tail. Each
 * part keeps where it is in the file and in the card text.
 */
export const buildJournalCard = (agentName: string, entries: readonly JournalEntry[]): JournalCard => {
  const actions = actionLine(entries);
  const lines: CardLine[] = [
    { text: `Agent: ${agentName}.`, parts: [] },
    ...entries.filter((entry) => entry.kind === "request").slice(0, MAX_REQUESTS).map((entry) => messageLine("Request: ", entry, "request", REQUEST_CHARACTERS)),
    ...entries.filter((entry) => entry.kind === "reply").slice(0, MAX_REPLIES).map((entry) => messageLine("Reply: ", entry, "reply", REPLY_CHARACTERS)),
    ...(actions ? [actions] : []),
  ];
  let text = "";
  const parts: JournalCardPart[] = [];
  for (const line of lines) {
    const start = text ? text.length + 1 : 0;
    if (start >= JOURNAL_CARD_MAX_CHARACTERS) break;
    text += (text ? "\n" : "") + line.text.slice(0, JOURNAL_CARD_MAX_CHARACTERS - start);
    for (const part of line.parts) {
      const offset = start + part.offset;
      const length = Math.min(part.length, JOURNAL_CARD_MAX_CHARACTERS - offset);
      if (length <= 0) continue;
      parts.push({ kind: part.kind, lineStart: part.entry.lineStart, lineEnd: part.entry.lineEnd, day: part.entry.day, offset, length });
    }
  }
  return { text, parts };
};
