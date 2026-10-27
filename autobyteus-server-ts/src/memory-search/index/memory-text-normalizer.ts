/**
 * One text rule for both sides of the text index (R-016): Chinese, Japanese and Korean ideographs become
 * single searchable units when indexed, and a query becomes its terms (lower case, stop words removed;
 * an ideograph run becomes its overlapping two-character phrases). Measured in the evaluation report.
 */
const CJK_CHAR = /([\u3400-\u9fff\uf900-\ufaff])/g;
const QUERY_WORD = /[\u3400-\u9fff\uf900-\ufaff]+|[a-z0-9_\-.]+/g;
const CJK_WORD = /^[\u3400-\u9fff\uf900-\ufaff]/;

const STOP_WORDS = new Set((
  "a an the and or of to in on for with we our my me you your i is are was were be been it its this that these those "
  + "do did does done have has had where what when who which how why remember earlier set up there here from at by as "
  + "into about can could would should will just make made please find out whether not no yes look looked"
).split(" "));

/** The text as the index sees it: every ideograph its own token. */
export const toIndexText = (text: string): string => text.replace(CJK_CHAR, " $1 ");

/** A query's search terms, in order and distinct: words, and two-character phrases for ideograph runs. */
export const queryTerms = (query: string): string[] => {
  const terms: string[] = [];
  for (const word of query.toLowerCase().match(QUERY_WORD) ?? []) {
    if (CJK_WORD.test(word)) {
      const chars = [...word];
      if (chars.length === 1) terms.push(word);
      for (let i = 0; i + 1 < chars.length; i++) terms.push(`${chars[i]}${chars[i + 1]}`);
    } else if (!STOP_WORDS.has(word) && word.length > 1 && /[a-z0-9]/.test(word)) {
      // A term needs a letter or digit: `...` or `--` is no word, and the index holds no token for it (CR-005).
      terms.push(word);
    }
  }
  return [...new Set(terms)];
};

/** One term as an FTS5 phrase: a two-ideograph term is a phrase of its two tokens; quotes doubled. */
export const toFtsPhrase = (term: string): string => `"${CJK_WORD.test(term) ? [...term].join(" ") : term.replace(/"/g, "\"\"")}"`;

/** The FTS5 query for the terms: any term (OR). */
export const toFtsQuery = (terms: readonly string[]): string => terms.map(toFtsPhrase).join(" OR ");

/**
 * The tokens the text index makes of a text (its `unicode61` tokenizer, which removes diacritics): each ideograph
 * its own token, case folded, split at anything but letters and digits.
 */
const textTokens = (text: string): string[] =>
  toIndexText(text).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Whether a text holds a term as the text index matches it: the term's tokens in a row, as its FTS phrase does
 * (`memory_search` is in "Memory search" and "memory-search"; `兔子` in "兔子"). The one rule for the words a text
 * match names (CR-004).
 */
export const containsTerm = (text: string, term: string): boolean => {
  const wanted = textTokens(term);
  if (!wanted.length) return false;
  const tokens = textTokens(text);
  for (let i = 0; i + wanted.length <= tokens.length; i++) {
    if (wanted.every((token, k) => tokens[i + k] === token)) return true;
  }
  return false;
};
