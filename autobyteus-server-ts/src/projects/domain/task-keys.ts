/**
 * Readable Task keys: `<prefix>-<number>` (e.g. `autobyteus-42`). A Project's prefix is derived from its
 * name once, when the Project is first keyed, and never changes; numbers are assigned per Project in
 * creation order and never reused. The number never contains "-", so a key splits at its last "-".
 */

/** The fallback prefix when a name has no letters or digits. */
const FALLBACK_PREFIX = "project";

/**
 * The prefix a Project name derives: lower case (locale-independent), diacritics removed from Latin
 * letters only ("Café" → "cafe"; other scripts keep their marks), every run of characters that are not
 * letters, marks or digits becomes "-", trimmed; `project` when nothing remains.
 */
export const taskKeyPrefixOf = (name: string): string => {
  const folded = name.toLowerCase().normalize("NFD").replace(/(\p{Script=Latin})\p{M}+/gu, "$1").normalize("NFC");
  return folded.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || FALLBACK_PREFIX;
};

/** `base` when no current Project holds it; otherwise the smallest free `base-2`, `base-3`, … */
export const uniqueTaskKeyPrefix = (base: string, taken: Iterable<string>): string => {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

export const formatTaskKey = (prefix: string, taskNumber: number): string => `${prefix}-${taskNumber}`;

/** Key order within one Project: by the number after the key's last "-" (`autobyteus-25` before `autobyteus-172`). */
export const compareTaskKeys = (a: string, b: string): number =>
  (Number(a.slice(a.lastIndexOf("-") + 1)) || 0) - (Number(b.slice(b.lastIndexOf("-") + 1)) || 0);
