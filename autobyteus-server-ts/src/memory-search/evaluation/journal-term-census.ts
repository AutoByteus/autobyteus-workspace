import fs from "node:fs";
import path from "node:path";
import { readJournalEntries } from "../../agent-work-journal/reading/journal-entry-reader.js";
import { toIndexText } from "../index/memory-text-normalizer.js";

/** Folders the text index never covers: a run's raw files sit beside `work_journal/`; imports are other nodes'. */
const SKIPPED = new Set(["imports"]);

/**
 * Tokens as the text index's tokenizer (`unicode61`, diacritics removed) stores them: lower case, split at anything
 * but letters and digits, each ideograph its own token. Written independently of the FTS index (R-14).
 */
export const indexTokens = (text: string): string[] =>
  toIndexText(text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * The terms that occur nowhere in the journals of `memoryDir` (outside `imports/`), counted from the journal files
 * themselves: each entry's text, as the text index takes it, tokenized as above. A term of several tokens
 * (`home.example.org`, a two-ideograph phrase) occurs only as those tokens in a row, as an FTS phrase does.
 */
export const termsAbsentFromJournals = (memoryDir: string, terms: readonly string[]): Set<string> => {
  const pending = new Map<string, string[]>();
  for (const term of new Set(terms)) {
    const tokens = indexTokens(term);
    if (tokens.length) pending.set(term, tokens);
  }
  const byFirstToken = (): Map<string, Array<[string, string[]]>> => {
    const index = new Map<string, Array<[string, string[]]>>();
    for (const [term, tokens] of pending) index.set(tokens[0]!, [...(index.get(tokens[0]!) ?? []), [term, tokens]]);
    return index;
  };
  let first = byFirstToken();
  const scanFile = (file: string): void => {
    for (const entry of readJournalEntries(fs.readFileSync(file, "utf-8")).entries) {
      const tokens = indexTokens(entry.text);
      for (let i = 0; i < tokens.length && pending.size; i++) {
        for (const [term, wanted] of first.get(tokens[i]!) ?? []) {
          if (pending.has(term) && wanted.every((token, k) => tokens[i + k] === token)) {
            pending.delete(term);
            first = byFirstToken();
          }
        }
      }
      if (!pending.size) return;
    }
  };
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!pending.size) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "work_journal") {
          for (const name of fs.readdirSync(full).filter((file) => file.endsWith(".md")).sort()) scanFile(path.join(full, name));
        } else if (!SKIPPED.has(entry.name)) walk(full);
      }
    }
  };
  walk(memoryDir);
  return new Set(pending.keys());
};
