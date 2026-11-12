/**
 * Heading anchors for rendered Markdown, following GitHub's rule so existing Contents lists
 * (`[Section](#section)`) resolve. A heading's rendered id is `HEADING_ANCHOR_ID_PREFIX + slug`:
 * the prefix keeps it clear of the app's own element ids and of DOM-property names.
 */
export const HEADING_ANCHOR_ID_PREFIX = 'user-content-';

const NOT_SLUG_CHARACTER = /[^\p{L}\p{M}\p{N}\p{Pc} -]/gu;

/** GitHub's slug of one heading's text: lowercased, other characters removed, each space a hyphen. */
export const githubHeadingSlug = (text: string): string => text
  .toLowerCase()
  .replace(NOT_SLUG_CHARACTER, '')
  .replace(/ /g, '-');

/** A slugger for one document: a repeated slug is numbered `-1`, `-2`, … in order, as GitHub does. */
export const createHeadingSlugger = (): ((text: string) => string) => {
  const occurrences = new Map<string, number>();
  return (text: string): string => {
    const base = githubHeadingSlug(text);
    let slug = base;
    while (occurrences.has(slug)) {
      const next = (occurrences.get(base) ?? 0) + 1;
      occurrences.set(base, next);
      slug = `${base}-${next}`;
    }
    occurrences.set(slug, 0);
    return slug;
  };
};
