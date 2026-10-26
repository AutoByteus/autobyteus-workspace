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
    } else if (!STOP_WORDS.has(word) && word.length > 1) {
      terms.push(word);
    }
  }
  return [...new Set(terms)];
};

/** The FTS5 query for the terms: any term (OR); a two-ideograph term is a phrase of its two tokens. */
export const toFtsQuery = (terms: readonly string[]): string =>
  terms.map((term) => `"${CJK_WORD.test(term) ? [...term].join(" ") : term.replace(/"/g, "\"\"")}"`).join(" OR ");

/**
 * A query term as the text index's tokenizer (`unicode61`) stores it: diacritics removed, lower case, split at
 * anything but letters and digits, each ideograph its own token. `home.example.org` → home, example, org.
 */
export const termTokens = (term: string): string[] =>
  toIndexText(term.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Whether a text contains a term (case-insensitive; ideograph phrases as written). */
export const containsTerm = (text: string, term: string): boolean => text.toLowerCase().includes(term);
