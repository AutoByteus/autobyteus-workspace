/** A run this long without whitespace makes the browser's text shaping cost seconds (autobyteus-358, M-163b). */
export const LONG_UNBROKEN_RUN_LENGTH = 1000;

const isWhitespace = (code: number): boolean =>
  code === 0x20 || (code >= 0x09 && code <= 0x0d) || code === 0x85 || code === 0xa0 || code === 0x1680
  || (code >= 0x2000 && code <= 0x200a) || code === 0x2028 || code === 0x2029 || code === 0x202f
  || code === 0x205f || code === 0x3000 || code === 0xfeff;

/**
 * Whether `text` has a run of at least `LONG_UNBROKEN_RUN_LENGTH` non-whitespace characters (one linear scan,
 * stopping at the first such run). Blocks with one are shaped cheaply (`long-unbroken-text`, DS-007).
 */
export const hasLongUnbrokenRun = (text: string | null | undefined): boolean => {
  if (!text || text.length < LONG_UNBROKEN_RUN_LENGTH) return false;
  let run = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (isWhitespace(text.charCodeAt(index))) run = 0;
    else if (++run >= LONG_UNBROKEN_RUN_LENGTH) return true;
  }
  return false;
};
